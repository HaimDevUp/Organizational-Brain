# Graph Integrations

## Chat & Agents

- `generateBrainAnswer({ useGraph: true })` — default
- `@obos/agents` RAG runner passes graph context through

## Contradictions

Open contradictions → `contradicts` edges in graph (red styling in UI)

## Onboarding

`ensureDefaultOnboardingPath` uses `expandNeighborhood` from onboarding doc → graph-ordered learning path

## Expert discovery

`computeExpertProfiles` adds `graphCentrality * 8` to expertise score

## Knowledge path queries

API: `GET .../graph?view=path&sourceId=&targetId=`

Impact analysis: `GET .../graph?view=impact&documentId=`

## Suggestions workflow

1. Index creates `relationship_suggestions` (pending)
2. Admin approves → `POST { action: "approve_suggestion", suggestionId }`
3. Creates `knowledge_relations` edge
