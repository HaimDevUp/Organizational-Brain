# Production Readiness — Phase 4

## Reports

| Document | Description |
|----------|-------------|
| [01-security-report.md](./01-security-report.md) | IDOR fixes, RBAC, AI security |
| [02-performance-report.md](./02-performance-report.md) | Hot paths and optimizations |
| [03-scalability-report.md](./03-scalability-report.md) | Horizontal scaling guidance |
| [04-production-readiness-checklist.md](./04-production-readiness-checklist.md) | Go-live checklist |
| [05-technical-debt-report.md](./05-technical-debt-report.md) | Post-GA backlog |
| [06-environment-variables.md](./06-environment-variables.md) | Env reference |
| [07-backup-and-dr.md](./07-backup-and-dr.md) | Backup & disaster recovery |
| [08-migration-strategy.md](./08-migration-strategy.md) | Prisma migrations |

## Deploy

```bash
# Apply schema (new: ai_request_logs, usage_events)
pnpm db:push

# Production stack
docker compose -f docker-compose.prod.yml up -d
```

## Verify

```bash
pnpm test
pnpm --filter @obos/web build
curl http://localhost:3000/api/health
```

## Key code changes

- `packages/rbac/src/access-scope.ts` — department-scoped knowledge access
- `apps/web/src/lib/knowledge-access.ts` — RAG filter builder for APIs
- `apps/web/src/middleware.ts` — `/api/v1` auth + request IDs
- `apps/web/src/app/[orgSlug]/admin/monitoring` — ops dashboard
