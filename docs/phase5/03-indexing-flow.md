# Graph Indexing Flow

## Trigger points

1. **Vector indexing** — `packages/rag/src/indexer.ts` calls `indexDocumentGraph()` after Qdrant upsert
2. **PR merge** — same path via `enqueueAndIndexDocument`
3. **Worker** — `processIndexingJob` → `indexDocumentContent` → graph sync
4. **Manual** — `pnpm db:reindex:graph`

## Steps per document

1. Parse markdown for `[[Document Name]]`
2. Resolve targets by title/slug within org
3. Upsert `knowledge_relations` (`related_to`, confidence 1.0, metadata `markdown_wikilink`)
4. Remove stale wiki-link edges no longer in content
5. Run `discoverRelationshipSuggestions()` (heuristic, max 5, score ≥ 0.55)

## Broken links

Unresolved `[[targets]]` increment `brokenReferences` in graph health (not auto-created as edges).

## Contradictions

`detectContradictionsForDocument` creates `contradicts` graph edges when LLM confirms conflict.
