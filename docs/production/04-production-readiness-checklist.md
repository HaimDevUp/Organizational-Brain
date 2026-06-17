# Production Readiness Checklist

## Security

- [x] Fix cross-tenant IDOR on knowledge delete
- [x] Validate role assignment belongs to org
- [x] Enforce department-scoped knowledge access in RAG
- [x] API authentication middleware for `/api/v1`
- [x] Rate limiting on AI endpoints
- [x] Prompt sanitization for LLM inputs
- [ ] SSO / domain allowlist (enterprise)
- [ ] Secrets in KMS (manual ops)

## Reliability

- [x] Async indexing on merge (job + worker)
- [x] Structured logging + request IDs
- [x] AI request logging
- [ ] Error tracking (Sentry DSN — configure in deploy)
- [ ] Health check endpoints (`/api/health`)

## Testing

- [x] Vitest workspace setup
- [x] RBAC unit tests
- [x] Tenant isolation tests
- [x] RAG scope tests
- [ ] 80% coverage on critical modules (run `pnpm test:coverage`)

## Operations

- [x] Production Docker Compose
- [x] Environment variables documentation
- [x] Backup & DR plan
- [x] Migration strategy doc
- [ ] On-call runbook (ops)

## UX

- [x] Loading states (brain, knowledge)
- [x] Error boundary component
- [x] Empty states component
- [x] Admin permission gating

## Compliance

- [ ] Data processing agreement template
- [ ] Retention policy for audit/AI logs
- [ ] GDPR export/delete user flow
