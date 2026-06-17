# 1. High-Level Architecture

## 1.1 System Context

Organizational Brain OS (OBOS) is a multi-tenant SaaS where each **organization** owns a Git-backed knowledge repository. Users collaborate through Markdown documents, propose changes via **pull requests**, and consume knowledge through **AI search**, **chat**, and **agents**. Vector embeddings live in **Qdrant**; operational metadata lives in **PostgreSQL**.

```mermaid
flowchart TB
    subgraph Clients
        WEB[Web App]
        API_CLIENT[API / Integrations]
    end

    subgraph OBOS Platform
        GW[API Gateway / BFF]
        AUTH[Auth Service]
        CORE[Core API]
        GIT_SVC[Git Service]
        INDEX[Indexing Worker]
        AI_SVC[AI Orchestrator]
        AGENT[Agent Runtime]
        HEALTH[Health & Gaps Engine]
    end

    subgraph Data
        PG[(PostgreSQL)]
        REDIS[(Redis)]
        QD[(Qdrant)]
        S3[(Object Storage)]
        GIT[(Bare Git Repos)]
    end

    subgraph External
        OIDC[Identity Provider]
        LLM[LLM Providers]
    end

    WEB --> GW
    API_CLIENT --> GW
    GW --> AUTH
    GW --> CORE
    CORE --> PG
    CORE --> REDIS
    CORE --> GIT_SVC
    CORE --> AI_SVC
    CORE --> AGENT
    CORE --> HEALTH
    GIT_SVC --> GIT
    GIT_SVC --> S3
    INDEX --> GIT
    INDEX --> QD
    INDEX --> PG
    AI_SVC --> LLM
    AI_SVC --> QD
    AGENT --> AI_SVC
    AUTH --> OIDC
    AUTH --> PG
```

## 1.2 Logical Layers

| Layer | Responsibility |
|-------|----------------|
| **Presentation** | Next.js UI: knowledge browser, PR review, chat, admin, health dashboards |
| **API / BFF** | REST + WebSocket; tenant context injection; rate limiting |
| **Domain services** | Orgs, users, departments, RBAC, documents, PRs, audit, gaps, agents |
| **Git subsystem** | Clone/fetch/commit/merge; branch protection; diff rendering |
| **AI subsystem** | Embeddings, RAG retrieval, chat completion, tool use for agents |
| **Indexing pipeline** | Event-driven re-embed on merge; chunking; Qdrant upsert/delete |
| **Infrastructure** | Postgres, Redis queues, Qdrant, S3, observability |

## 1.3 Core Data Flows

### Knowledge write (approval path)

```mermaid
sequenceDiagram
    participant U as Author
    participant API as Core API
    participant Git as Git Service
    participant DB as PostgreSQL
    participant Rev as Reviewer

    U->>API: Create/edit draft (branch)
    API->>Git: Commit on feature branch
    API->>DB: Create PR record (open)
    Rev->>API: Review / comment / approve
    API->>DB: Update PR approvals
    Rev->>API: Merge PR
    API->>Git: Merge to main
    API->>DB: Close PR, version snapshot
    API->>DB: Emit merge event
    Note over API,DB: Indexing worker picks up event
```

### Knowledge read (RAG path)

```mermaid
sequenceDiagram
    participant U as User
    participant API as Core API
    participant AI as AI Orchestrator
    participant QD as Qdrant
    participant DB as PostgreSQL

    U->>API: Chat / search query
    API->>API: Resolve tenant + RBAC filters
    API->>AI: Retrieve + generate
    AI->>QD: Hybrid vector search (filtered)
    QD-->>AI: Chunks + scores
    AI->>DB: Load doc metadata / citations
    AI-->>API: Answer + sources
    API-->>U: Streamed response
```

## 1.4 Multi-Tenancy Model

**Pool model with row-level security (RLS)** in PostgreSQL plus **hard namespace separation** in Git and Qdrant.

| Resource | Isolation strategy |
|----------|-------------------|
| PostgreSQL | `organization_id` on all tenant tables; RLS policies; connection `SET app.current_org` |
| Git | One bare repo per org: `git/orgs/{org_slug}.git` |
| Qdrant | Collection per org: `org_{org_id}_knowledge` |
| S3 | Prefix: `orgs/{org_id}/` |
| Redis keys | Prefix: `org:{org_id}:` |

**Super-admin** (platform) is separate from **org admin** (tenant).

## 1.5 Service Decomposition (Monorepo Packages)

```mermaid
flowchart LR
    subgraph apps
        A1[web]
        A2[api]
        A3[worker-indexer]
        A4[worker-health]
    end

    subgraph packages
        P1[database]
        P2[git-client]
        P3[ai-providers]
        P4[rag]
        P5[rbac]
        P6[shared]
    end

    A2 --> P1
    A2 --> P2
    A2 --> P3
    A2 --> P4
    A2 --> P5
    A3 --> P2
    A3 --> P4
    A4 --> P1
```

## 1.6 Deployment Topology (Production)

```mermaid
flowchart TB
    subgraph Edge
        CDN[CDN]
        LB[Load Balancer]
    end

    subgraph K8s Cluster
        WEB_POD[web replicas]
        API_POD[api replicas]
        IDX_POD[indexer workers]
        HLTH_POD[health workers]
    end

    subgraph Managed
        RDS[(RDS Postgres)]
        ELASTICACHE[(Redis)]
        QDRANT_CLOUD[(Qdrant Cloud)]
        S3_PROD[(S3)]
    end

  CDN --> WEB_POD
  LB --> API_POD
  API_POD --> RDS
  API_POD --> ELASTICACHE
  IDX_POD --> QDRANT_CLOUD
  IDX_POD --> S3_PROD
  GIT_VOL[Git PVC / EFS] --> API_POD
  GIT_VOL --> IDX_POD
```

- **Stateful Git**: persistent volume shared read-write-many (EFS) or Git remote (Gitea/Forgejo) for scale-out.
- **Workers** scale independently from API.
- **Secrets**: per-tenant LLM keys optional; platform default key with usage metering.

## 1.7 Event Bus (Internal)

Async domain events via Redis Streams or BullMQ:

| Event | Consumers |
|-------|-----------|
| `knowledge.merged` | Indexer, health scorer, webhook dispatcher |
| `knowledge.deleted` | Indexer (purge vectors) |
| `pr.opened` / `pr.merged` | Notifications, audit enricher |
| `gap.detected` | Notifications, dashboard cache |
| `agent.run.completed` | Audit, usage billing |

## 1.8 Non-Functional Requirements

| Concern | Target |
|---------|--------|
| Availability | 99.9% API; async indexing eventual (&lt; 2 min p95) |
| Latency | Search p95 &lt; 800ms; chat first token &lt; 2s |
| Security | SOC2-ready audit; encryption at rest + TLS |
| Compliance | Data residency per org (future: region-specific stacks) |
| Backup | Postgres PITR; Git bundle daily; Qdrant snapshots |

## 1.9 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Git for content | Version history, diffs, familiar PR workflow, export portability |
| Postgres for metadata | ACID workflow state, RBAC, audit, relational reporting |
| Qdrant per org collection | Simple tenant purge; filter payload for department/doc ACL |
| Monorepo | Shared types, single Prisma schema, coordinated releases |
| Separate indexer workers | Embedding is CPU/API-heavy; must not block API |
| BFF in API app initially | Reduce premature microservice split |
