# Organizational Brain OS

AI-native organizational memory — **Git**, **Markdown**, **approval workflows**, and multi-tenant RBAC.

## Features

### Foundation (Phase 1)
- Google OAuth, organizations, RBAC, departments
- Git-backed knowledge with approval workflow (GitHub API)
- Knowledge repository with metadata search

### AI Layer (Organizational Brain)
- **Qdrant** embeddings pipeline — indexes approved knowledge on merge, re-index via worker
- **RAG** — semantic + hybrid search with department/tag filters
- **Brain Chat** — ChatGPT-like UI with citations, confidence scores, source documents
- **AI Knowledge Structuring** — auto department, category, tags, owner, target doc + PR
- **Knowledge Gaps** — low-confidence answers tracked with frequency
- **Health Scores** — freshness, coverage, gaps, contradictions
- **Contradiction Detection** — conflicting sources surfaced side-by-side
- **Audit Intelligence** — searches, questions, approvals, agent runs
- **Agents** — HR, Sales, Product, Onboarding, Knowledge Curator (+ plugin registry)
- **Onboarding** — learning paths with progress tracking
- **Expert Discovery** — ranked by contributions, ownership, approvals

## Quick start

```bash
cp .env.example .env
# Set: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, GITHUB_TOKEN

docker compose up -d

pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev

# Optional: background indexer for pending jobs
pnpm indexer:dev
```

### AI setup

Set `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` with `AI_PROVIDER`) and ensure Qdrant is running via Docker. After merging knowledge PRs, documents are embedded automatically.

Open [http://localhost:3000](http://localhost:3000).

### GitHub setup

1. Create a repository with a `main` branch (can be empty with a README).
2. Use a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope.
3. When creating an organization in OBOS, provide `owner` and `repo`.
4. All knowledge changes go through feature branches and GitHub pull requests — **no direct commits to `main`**.

## Documentation

See **[docs/README.md](./docs/README.md)** for full architecture.

## Monorepo

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js 15 UI + REST API (`/api/v1`) |
| `packages/database` | Prisma schema + client |
| `packages/shared` | Markdown helpers, errors, types |
| `packages/rbac` | Permissions + role seeding |
| `packages/github-git` | GitHub API client |
| `packages/ai-providers` | OpenAI, Anthropic, Gemini |
| `packages/qdrant` | Vector store client |
| `packages/rag` | Chunking, indexing, retrieval, chat |
| `packages/agents` | Agent plugins + runtime |
| `apps/worker-indexer` | Background indexing worker |
