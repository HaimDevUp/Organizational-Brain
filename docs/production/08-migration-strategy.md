# Database Migration Strategy

## Development

```bash
pnpm db:push    # rapid iteration
pnpm db:seed    # permissions, demo data
```

## Staging / Production

1. **Freeze** schema changes behind PR review.
2. Run `prisma migrate deploy` in CI before app deploy (backward-compatible migrations only).
3. Deploy app replicas (rolling).
4. Run indexer worker after deploy if schema affects indexing.

## Rules

- Add columns as nullable first; backfill; then enforce NOT NULL in a follow-up migration.
- Never drop columns in the same release that stops reading them.
- Large table changes: use `CONCURRENTLY` indexes in raw SQL migrations.

## Phase 4 additions

New tables: `ai_request_logs`, `usage_events`. Run:

```bash
pnpm db:push
# or
pnpm db:migrate
```
