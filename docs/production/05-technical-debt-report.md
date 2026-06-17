# Technical Debt Report

## P0 — Address before GA

| Item | Effort | Notes |
|------|--------|-------|
| Member invite API route | S | UI exists; needs `POST .../members/invite` |
| Job locking for indexer workers | M | Prevent duplicate processing |
| Pagination on all list endpoints | M | PRs, knowledge, audit |
| Health check `/api/health` | S | K8s probes |

## P1 — Next quarter

| Item | Effort |
|------|--------|
| Per-org GitHub App vs shared PAT | L |
| Streaming chat responses (SSE) | M |
| `contentPreview` → S3 for large docs | M |
| Implement `scopeDepartmentId` in UI for role assign | S |
| Wire unused permissions to routes or remove from seed | M |
| Department-scoped ABAC on knowledge list API | M |

## P2 — Future

| Item | Notes |
|------|-------|
| Row-level security in Postgres | Defense in depth |
| Separate API service | When team > 5 engineers |
| WebSocket notifications | PR reviews |
| Full billing (Stripe) | Schema prep only in Phase 4 |
| White-label theming | `settings.branding` JSON ready |

## Code quality

| Area | Status |
|------|--------|
| Duplicate org resolution logic | Centralized in `requireOrgAccess` |
| Mixed error types (`Error` vs `AppError`) | RBAC throws `ForbiddenError` now |
| Test coverage on `apps/web` services | Partial — expand |

## Documentation debt

- OpenAPI spec generation from routes
- Runbook for Qdrant reindex
- Customer-facing security whitepaper
