# Organizational Brain OS — Architecture Documentation

Multi-tenant AI-native organizational memory platform built on **Git**, **Markdown**, **Qdrant**, **RAG**, and **approval workflows**.

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [High-Level Architecture](./01-high-level-architecture.md) | System context, components, deployment, diagrams |
| 2 | [Database Design](./02-database-design.md) | Entity model, tables, relationships, indexing |
| 3 | [Prisma Schema](../packages/database/prisma/schema.prisma) | Complete ORM schema |
| 4 | [Folder Structure](./04-folder-structure.md) | Monorepo layout and package boundaries |
| 5 | [API Design](./05-api-design.md) | REST endpoints, auth, versioning |
| 6 | [Git Workflow](./06-git-workflow.md) | Knowledge PRs, branches, merge policies |
| 7 | [Security Model](./07-security-model.md) | RBAC, tenancy isolation, audit |
| 8 | [AI Architecture](./08-ai-architecture.md) | Provider abstraction, RAG, agents |
| 9 | [Qdrant Architecture](./09-qdrant-architecture.md) | Collections, indexing, retrieval |
| 10 | [Development Roadmap](./10-development-roadmap.md) | Phased implementation plan |
| 11 | [Phase 5 — Knowledge Graph](./phase5/README.md) | Graph schema, RAG, UI, health, rollout |

## Design Principles

1. **Git is source of truth** for knowledge content; Postgres holds metadata, permissions, and workflow state.
2. **Tenant isolation** at every layer: DB row-level, Git namespace, Qdrant collection prefix, object storage prefix.
3. **Write path ≠ read path**: edits flow through Git PRs; reads use cached Markdown + vector search.
4. **Fail closed** on auth; all mutations audited; AI actions scoped by RBAC and retrieval filters.
5. **Provider-agnostic AI** behind a single abstraction with per-tenant configuration.

## Technology Stack (Target)

| Layer | Technology |
|-------|------------|
| API | Node.js (NestJS or Fastify) + TypeScript |
| Web | Next.js 15 (App Router) |
| DB | PostgreSQL 16 |
| ORM | Prisma |
| Cache / Queue | Redis + BullMQ |
| Git | libgit2 (nodegit) + bare repos per org |
| Vectors | Qdrant |
| Object storage | S3-compatible (MinIO dev) |
| Auth | OIDC + JWT (session optional) |
| Observability | OpenTelemetry, structured logs |
