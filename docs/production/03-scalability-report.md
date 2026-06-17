# Scalability Report — Organizational Brain OS

## Current architecture

- **Monolith:** Next.js app (UI + API)
- **Worker:** `apps/worker-indexer` (polling)
- **Postgres:** Single tenant pool + RLS-ready schema
- **Qdrant:** One collection per organization
- **Git:** GitHub API per org repo

## Horizontal scaling

| Component | Scale strategy |
|-----------|----------------|
| `apps/web` | Stateless replicas behind load balancer |
| `worker-indexer` | Multiple workers with `FOR UPDATE SKIP LOCKED` on jobs (recommended) |
| Postgres | Read replicas for reporting; PgBouncer |
| Qdrant | Qdrant Cloud cluster; shard by org at 10M+ points |
| Redis (future) | Rate limits + session cache |

## Tenancy limits (estimated)

| Scale | Orgs | Docs/org | Vectors | Notes |
|-------|------|----------|---------|-------|
| Small | 100 | 500 | 500k | Single Qdrant node |
| Medium | 1,000 | 2,000 | 10M | Dedicated Qdrant; indexer fleet |
| Large | 10,000+ | — | — | Org sharding; external Git (Gitea cluster) |

## Bottlenecks at scale

1. **GitHub API rate limits** — cache default branch SHA; batch operations.
2. **Synchronous merge indexing** — must stay async (IndexingJob queue).
3. **Global worker poll** — partition jobs by `organizationId` hash.
4. **Expert profile recompute** — O(users × org); schedule off-peak.

## Multi-region (future)

- Postgres read replica per region
- Qdrant replication per region with org `data_region` field (schema prep in SaaS)
- Edge CDN for static assets only; API stays regional

## SaaS readiness (schema prep, no billing)

- `Organization.plan` — tier limits
- `UsageEvent` — metering for future billing
- `Organization.settings` — `features`, `limits`, `branding` JSON
