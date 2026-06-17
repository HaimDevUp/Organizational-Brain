# Database Schema — Knowledge Graph

## New enums

- `KnowledgeRelationType`: `related_to`, `depends_on`, `parent_of`, `child_of`, `references`, `contradicts`, `replaces`, `supersedes`, `owned_by`, `generated_by_ai`
- `RelationshipSuggestionStatus`: `pending`, `approved`, `rejected`, `dismissed`

## `knowledge_relations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| organization_id | UUID | Tenant FK, cascade delete |
| source_document_id | UUID | Edge source |
| target_document_id | UUID | Edge target |
| relation_type | enum | Default for wiki links: `related_to` |
| confidence_score | decimal(5,4) | Optional |
| metadata | JSON | e.g. `{ source: "markdown_wikilink" }` |
| created_by_id | UUID | Nullable (system/AI) |
| created_at / updated_at | timestamptz | |

**Indexes:** `(organization_id, source_document_id)`, `(organization_id, target_document_id)`, `(organization_id, relation_type)`

**Unique:** `(source_document_id, target_document_id, relation_type)`

## `relationship_suggestions`

AI/heuristic proposals requiring human approval.

| Column | Type |
|--------|------|
| source_document_id, target_document_id | UUID |
| relation_type | enum (default `related_to`) |
| confidence_score | decimal |
| reason | text |
| evidence | JSON |
| status | enum (default `pending`) |
| reviewed_by_id, reviewed_at | optional |

## Migration

```bash
pnpm db:push
pnpm db:seed   # new permissions
```

Prisma models: `packages/database/prisma/schema.prisma`
