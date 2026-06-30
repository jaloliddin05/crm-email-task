# CRM Email-to-Tasks

Inbound email → LLM → Task pipeline. NestJS + MongoDB + OpenAI.

## Quick Start

```bash
# 1. Install
npm install

# 2. Config
cp .env.example .env
# Fill in OPENAI_API_KEY and MONGODB_URI

# 3. Seed test data
npx ts-node src/seed.ts

# 4. Run
npm run start:dev
# Swagger: http://localhost:3000/api/docs
```

## Endpoints

### Webhook (called by email provider)
```
POST /webhook/email
Header: X-Webhook-Secret: <your secret>
Body: { "from", "to", "subject", "body" }
```

### List Tasks (tenant-scoped)
```
GET /tasks?status=pending&page=1&limit=20
Header: X-User-Id: <mongo user id>
```

### Review a Task
```
POST /tasks/:id/review
Header: X-User-Id: <mongo user id>
Body: { "action": "accept" | "reject" }
```

## Test Webhook

```bash
curl -X POST http://localhost:4000/webhook/email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: change-me-in-production" \
  -d '{
    "from": "client@external.com",
    "to": "alice@acme.com",
    "subject": "Need the contract signed by Monday",
    "body": "Hi Alice, please sign and return the contract before Monday morning."
  }'
```
