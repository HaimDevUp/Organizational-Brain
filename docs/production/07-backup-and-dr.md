# Backup & Disaster Recovery

## PostgreSQL

- **Frequency:** Continuous WAL archiving + daily full snapshot (RPO < 1h target).
- **Retention:** 30 days minimum; 90 days for enterprise.
- **Restore test:** Monthly restore to staging and run `pnpm db:push` smoke test.

```bash
pg_dump -Fc "$DATABASE_URL" -f obos-$(date +%Y%m%d).dump
```

## Qdrant

- Snapshot collections per org or full storage volume nightly.
- After Postgres restore, re-run indexer for documents missing vectors (`IndexingJob` status `failed`).

```bash
# Qdrant snapshot API (adjust host/auth)
curl -X POST "http://qdrant:6333/collections/org_{orgId}_knowledge/snapshots"
```

## Application

- Container images tagged by git SHA; rollback = redeploy previous image.
- `AUTH_SECRET` rotation: invalidate sessions (users re-login).

## RTO / RPO targets

| Tier | RPO | RTO |
|------|-----|-----|
| Team | 24h | 4h |
| Enterprise | 1h | 1h |

## Disaster scenarios

1. **Region loss:** Restore Postgres + Qdrant from cross-region replica; update DNS.
2. **Bad migration:** `prisma migrate resolve` + restore pre-migration dump.
3. **Data corruption in Git:** Source of truth is GitHub; re-clone and re-index.
