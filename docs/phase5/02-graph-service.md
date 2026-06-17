# Graph Service — `@obos/graph`

Package: `packages/graph/`

## Modules

| Module | Responsibility |
|--------|----------------|
| `parse-links.ts` | `[[Wiki Link]]` extraction |
| `resolve.ts` | Title/slug → document ID |
| `store.ts` | CRUD relations |
| `traverse.ts` | BFS expansion, shortest path, dependents |
| `indexer.ts` | Sync edges on document index |
| `suggestions.ts` | Heuristic link proposals (tags, dept, title) |
| `health.ts` | Orphans, broken refs, silos |
| `reindex.ts` | Full org graph rebuild |

## Key APIs

```ts
indexDocumentGraph({ organizationId, documentId, content })
expandNeighborhood(orgId, seedIds, { depth, maxNodes })
findShortestPath(orgId, sourceId, targetId)
createRelation({ ... })
approveRelationshipSuggestion(suggestionId, reviewerId)
computeGraphHealth(organizationId)
buildGraphSnapshot(organizationId, filters?)
reindexOrganizationGraph(organizationId)
```

## Web service layer

`apps/web/src/services/brain/graph.ts` — org-scoped orchestration for API routes.

## API

`GET/POST /api/v1/organizations/{orgId}/graph`

Query params: `view=health|suggestions|search|detail|path|impact`, `documentId`, `departmentId`, `q`
