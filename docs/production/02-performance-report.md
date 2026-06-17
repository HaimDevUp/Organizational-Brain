# Performance Report — Organizational Brain OS

## Hot paths analyzed

| Path | Bottleneck | Impact | Mitigation (Phase 4) |
|------|------------|--------|----------------------|
| PR merge → index | Sync embedding + Qdrant upsert | API latency 2–10s | Async via `IndexingJob`; merge returns fast |
| Brain chat | LLM + hybrid search + embed query | p95 3–8s | Rate limits; caching org metadata |
| Hybrid search | Embed query + Qdrant search | 200–800ms | Connection pooling; `score_threshold` tuning |
| Admin dashboard | Multiple Prisma counts | 100–300ms | Parallel `Promise.all` (existing) |
| List knowledge | Unbounded `findMany` | Memory on large orgs | Pagination enforced on API |

## Database (Prisma)

| Issue | Recommendation |
|-------|----------------|
| N+1 on member list with roles | Batch role query or include |
| Missing pagination on `listPullRequests` | Add `take`/`skip` default cap 50 |
| Full document content in `contentPreview` | Move to object storage for docs >512KB (debt) |

**Indexes:** Existing indexes on `(organizationId, status)`, `(conversationId, createdAt)` are adequate for v1 scale.

## Qdrant

| Issue | Recommendation |
|-------|----------------|
| Collection per org | Good isolation; monitor collection count |
| Re-index deletes all doc vectors then upserts | Acceptable; consider versioned points only |
| No HNSW `ef` tuning per tier | Set `QDRANT_HNSW_EF` env for production |

## React / Next.js

| Issue | Recommendation |
|-------|----------------|
| Client-side org fetch waterfall on agents/onboarding | Pass `orgId` from server layout |
| No `loading.tsx` on brain routes | **Added** skeleton loading states |
| Large markdown in propose page | Stream preview |

## Caching opportunities (implemented where low-risk)

- Permission set per user/org: 60s in-memory cache (server)
- Organization slug → id resolution: request-scoped

## Targets (production SLO)

| Metric | Target |
|--------|--------|
| API read p95 | < 300ms (excl. AI) |
| Search p95 | < 1s |
| Chat first byte | < 2s (streaming future) |
| Indexing lag after merge | < 2 min p95 |
