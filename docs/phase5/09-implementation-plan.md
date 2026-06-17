# Implementation Plan

## Phase 5A — Core (shipped)

- [x] Prisma schema + permissions
- [x] `@obos/graph` package
- [x] Wiki-link indexing in RAG pipeline
- [x] Graph-aware retrieval + chat
- [x] Graph API + Cytoscape UI
- [x] Health, contradictions, onboarding, experts hooks
- [x] `pnpm db:reindex:graph`

## Phase 5B — Enrichment

- [ ] LLM relation-type upgrade (beyond `related_to`)
- [ ] Suggestions UI in graph page
- [ ] Manual link editor (relation type picker)
- [ ] Chat UI: show `connectedDocuments` + `knowledgePaths`
- [ ] Seed Upnext docs with `[[wiki links]]` between Hebrew runbooks

## Phase 5C — Scale

- [ ] Subgraph lazy-load API
- [ ] Precomputed node importance table
- [ ] Graph snapshot cache

## Verification checklist

1. `pnpm db:push && pnpm db:seed`
2. Add `[[צ'קליסט העלאה ל-Production]]` in a doc body
3. `pnpm indexer:dev` or `pnpm db:reindex:graph`
4. Open `/up/graph` — nodes and edges visible
5. Ask Brain a cross-doc question — check `connectedDocuments` in API response
6. `GET .../graph?view=health` — metrics populated
