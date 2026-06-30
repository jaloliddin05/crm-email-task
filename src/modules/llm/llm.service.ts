import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface LlmTaskResult {
  isActionable: boolean;
  title?: string;
  description?: string;
  dueDate?: string | null;   // ISO string or null
  assigneeEmail?: string | null;
  reasoning: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeEmail(
    subject: string,
    body: string,
    from: string,
    today: string = new Date().toISOString().split('T')[0],
  ): Promise<LlmTaskResult> {
    const systemPrompt = `You are a CRM assistant that analyzes inbound emails and decides whether they represent an actionable task.

Today's date: ${today}

Rules:
- An email IS actionable if it requires someone to DO something (schedule meeting, send document, fix issue, follow up, etc.)
- An email is NOT actionable if it is: spam, newsletter, automated notification, simple FYI, or already-completed action.
- Extract a clear, concise title (max 10 words)
- Extract a detailed description summarizing what needs to be done
- Extract dueDate ONLY if explicitly mentioned (e.g. "by Friday", "before March 15"). Convert to ISO date. Otherwise null.
- Extract assigneeEmail ONLY if the email clearly delegates to someone. Otherwise null.

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.

JSON format:
{
  "isActionable": true | false,
  "title": "string or null",
  "description": "string or null",
  "dueDate": "YYYY-MM-DD or null",
  "assigneeEmail": "email string or null",
  "reasoning": "one sentence why"
}`;

    const userMessage = `From: ${from}
Subject: ${subject}

Body:
${body}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,  // Low temp = more deterministic
        max_tokens: 400,
      });

      const raw = response.choices[0]?.message?.content ?? '';
      this.logger.debug(`LLM raw response: ${raw}`);

      const parsed: LlmTaskResult = JSON.parse(raw);
      return parsed;
    } catch (error) {
      this.logger.error(`LLM analysis failed: ${error.message}`);
      // Fail safe: treat as non-actionable, don't crash the webhook
      return {
        isActionable: false,
        reasoning: `LLM error: ${error.message}`,
      };
    }
  }
}
