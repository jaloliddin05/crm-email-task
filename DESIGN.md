# DESIGN.md

## What I Built

An inbound-email → LLM → Task pipeline inside a multi-tenant NestJS + MongoDB CRM.

### Components

| Layer | What it does |
|-------|-------------|
| `POST /webhook/email` | Receives JSON from the email provider, verifies a shared secret, kicks off processing |
| `WebhookService` | Resolves recipient → company, calls LLM, persists Task |
| `LlmService` | Sends email to `gpt-4o-mini` with a strict JSON-only prompt; extracts `isActionable`, `title`, `description`, `dueDate`, `assigneeEmail` |
| `Task` schema | Scoped to `companyId`; status lifecycle: `pending → accepted/rejected` |
| `GET /tasks` | Tenant-scoped, filtered by status, paginated (page + limit) |
| `POST /tasks/:id/review` | Accept or reject a pending task; records reviewer + timestamp |
| `TenantGuard` | Reads `X-User-Id` header, resolves user → company, attaches both to `req` |

### Data Flow

```
Email Provider
  → POST /webhook/email  (X-Webhook-Secret)
    → find User by "to" email
    → find Company from User
    → OpenAI gpt-4o-mini: is this a task?
      → YES → create Task { status: pending }
      → NO  → return { processed: false }
```

---

## What I Cut (and Why)

**Bull queue / async processing** — The webhook currently processes synchronously. For production, email processing should be offloaded to a Bull queue so the webhook returns 200 in < 200ms regardless of OpenAI latency. Cut because it adds infra complexity without changing correctness for the exercise.

**JWT auth** — Replaced with a simple `X-User-Id` header. In production this would be a signed JWT; the tenant isolation logic in `TenantGuard` is identical either way — just swap the header extraction.

**Idempotency / dedup** — Two identical emails from the same sender will create two tasks. A production system would hash `(from + subject + body)` and reject duplicates within a time window.

**Email body sanitisation** — The body is passed to OpenAI as-is. A real system would strip HTML, inline images, and signatures before calling the LLM to reduce token cost and prompt-injection surface.

**Notifications** — No email/Slack notification is sent when a task is created. Would be a natural next step.

---

## Tradeoffs

| Decision | Alternative | Reason chosen |
|----------|-------------|---------------|
| `gpt-4o-mini` | `gpt-4o` | 10× cheaper; quality sufficient for actionability classification |
| Sync webhook | Bull queue | Simpler; latency acceptable for exercise |
| `X-User-Id` header | JWT | Removes auth machinery, keeps focus on the task pipeline |
| Store raw LLM output | Discard it | Enables debugging and future reprocessing without re-calling the API |

---

## With Another Week

1. **Bull queue** — decouple webhook response from LLM call; add retry logic for OpenAI failures.
2. **JWT + RBAC** — proper auth; restrict review endpoint to managers only.
3. **Idempotency key** — prevent duplicate tasks from retried webhooks.
4. **HTML email parsing** — strip tags/signatures before sending to LLM.
5. **Unit + e2e tests** — mock LLM, test tenant isolation boundary conditions.
6. **Metrics** — track LLM latency, actionability rate, token cost per company.
