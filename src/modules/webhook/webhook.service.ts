import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { User, UserDocument } from '../users/user.schema';
import { Task, TaskDocument, TaskStatus } from '../tasks/task.schema';
import { LlmService } from '../llm/llm.service';
import { InboundEmailDto } from './dto/inbound-email.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private llmService: LlmService,
  ) {}

  async handleInboundEmail(dto: InboundEmailDto): Promise<{ processed: boolean; taskId?: string; reason: string }> {
    // Step 1: Find which user this email belongs to (by "to" address)
    const recipient = await this.userModel.findOne({
      emails: dto.to.toLowerCase(),
      isActive: true,
    });

    if (!recipient) {
      this.logger.warn(`No user found for email: ${dto.to}`);
      return { processed: false, reason: 'recipient_not_found' };
    }

    // Step 2: Verify company is active
    const company = await this.companyModel.findOne({
      _id: recipient.companyId,
      isActive: true,
    });

    if (!company) {
      this.logger.warn(`Company not active for user: ${recipient._id}`);
      return { processed: false, reason: 'company_not_active' };
    }

    // Step 3: Ask LLM if this is an actionable task
    const llmResult = await this.llmService.analyzeEmail(
      dto.subject,
      dto.body,
      dto.from,
    );

    this.logger.log(
      `Email from ${dto.from} → company ${company.slug} | actionable=${llmResult.isActionable} | reason: ${llmResult.reasoning}`,
    );

    if (!llmResult.isActionable) {
      return { processed: false, reason: `not_actionable: ${llmResult.reasoning}` };
    }

    // Step 4: Resolve assignee if LLM found an email
    let assigneeId: Types.ObjectId | null = null;
    if (llmResult.assigneeEmail) {
      const assignee = await this.userModel.findOne({
        companyId: recipient.companyId,
        emails: llmResult.assigneeEmail.toLowerCase(),
        isActive: true,
      });
      if (assignee) {
        assigneeId = assignee._id as Types.ObjectId;
      } else {
        this.logger.warn(`Assignee email ${llmResult.assigneeEmail} not found in company ${company.slug}`);
      }
    }

    // Step 5: Create Task scoped to the company
    const task = await this.taskModel.create({
      companyId: recipient.companyId,
      assigneeId,
      title: llmResult.title,
      description: llmResult.description,
      dueDate: llmResult.dueDate ? new Date(llmResult.dueDate) : null,
      status: TaskStatus.PENDING,
      sourceEmailFrom: dto.from.toLowerCase(),
      sourceEmailSubject: dto.subject,
      sourceEmailBody: dto.body,
      llmRaw: llmResult,
    });

    this.logger.log(`Task created: ${task._id} for company ${company.slug}`);

    return {
      processed: true,
      taskId: (task._id as Types.ObjectId).toString(),
      reason: 'task_created',
    };
  }
}
