# 5. API Design

## 5.1 Conventions

| Aspect | Standard |
|--------|----------|
| Base URL | `https://api.obos.app/v1` |
| Auth | `Authorization: Bearer <jwt>` or `X-API-Key` |
| Tenant | `X-Organization-Id` or org embedded in JWT (`org_id` claim) |
| Format | JSON; `application/json` |
| Pagination | `?page=1&limit=20`; cursor for audit/logs |
| Errors | RFC 7807 Problem Details |
| Idempotency | `Idempotency-Key` header on POST (merge, create PR) |
| Versioning | URL prefix `/v1` |

### Standard error shape

```json
{
  "type": "https://obos.app/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "Missing permission: knowledge:merge",
  "instance": "/v1/orgs/acme/pull-requests/42/merge"
}
```

---

## 5.2 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Local signup |
| POST | `/auth/login` | Email/password → JWT |
| POST | `/auth/refresh` | Refresh token rotation |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/oidc/{provider}/authorize` | OIDC redirect |
| GET | `/auth/oidc/{provider}/callback` | OIDC callback |
| GET | `/auth/me` | Current user + org memberships |

---

## 5.3 Organizations

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/organizations` | platform or self-serve signup |
| GET | `/organizations` | List user's orgs |
| GET | `/organizations/{orgId}` | `org:read` |
| PATCH | `/organizations/{orgId}` | `org:update` |
| DELETE | `/organizations/{orgId}` | `org:delete` (soft) |
| GET | `/organizations/{orgId}/settings` | `org:read` |
| PATCH | `/organizations/{orgId}/settings` | `org:update` |

---

## 5.4 Users & Membership

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/members` | `member:read` |
| POST | `/organizations/{orgId}/members/invite` | `member:invite` |
| PATCH | `/organizations/{orgId}/members/{userId}` | `member:update` |
| DELETE | `/organizations/{orgId}/members/{userId}` | `member:remove` |
| GET | `/organizations/{orgId}/members/{userId}` | `member:read` |

---

## 5.5 Departments

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/departments` | `department:read` |
| POST | `/organizations/{orgId}/departments` | `department:create` |
| GET | `/organizations/{orgId}/departments/{deptId}` | `department:read` |
| PATCH | `/organizations/{orgId}/departments/{deptId}` | `department:update` |
| DELETE | `/organizations/{orgId}/departments/{deptId}` | `department:delete` |
| GET | `/organizations/{orgId}/departments/{deptId}/members` | `department:read` |
| POST | `/organizations/{orgId}/departments/{deptId}/members` | `department:manage_members` |
| DELETE | `/organizations/{orgId}/departments/{deptId}/members/{userId}` | `department:manage_members` |

---

## 5.6 Roles & Permissions

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/permissions` | authenticated (global catalog) |
| GET | `/organizations/{orgId}/roles` | `role:read` |
| POST | `/organizations/{orgId}/roles` | `role:create` |
| GET | `/organizations/{orgId}/roles/{roleId}` | `role:read` |
| PATCH | `/organizations/{orgId}/roles/{roleId}` | `role:update` |
| DELETE | `/organizations/{orgId}/roles/{roleId}` | `role:delete` |
| PUT | `/organizations/{orgId}/roles/{roleId}/permissions` | `role:update` |
| GET | `/organizations/{orgId}/users/{userId}/roles` | `role:read` |
| POST | `/organizations/{orgId}/users/{userId}/roles` | `role:assign` |
| DELETE | `/organizations/{orgId}/users/{userId}/roles/{userRoleId}` | `role:assign` |

---

## 5.7 Knowledge Documents

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/knowledge` | `knowledge:read` |
| POST | `/organizations/{orgId}/knowledge` | `knowledge:create` |
| GET | `/organizations/{orgId}/knowledge/{docId}` | `knowledge:read` |
| PATCH | `/organizations/{orgId}/knowledge/{docId}` | `knowledge:update` |
| DELETE | `/organizations/{orgId}/knowledge/{docId}` | `knowledge:delete` |
| GET | `/organizations/{orgId}/knowledge/{docId}/content` | `knowledge:read` |
| PUT | `/organizations/{orgId}/knowledge/{docId}/content` | `knowledge:update` (draft branch) |
| GET | `/organizations/{orgId}/knowledge/{docId}/versions` | `knowledge:read` |
| GET | `/organizations/{orgId}/knowledge/{docId}/versions/{versionId}` | `knowledge:read` |
| GET | `/organizations/{orgId}/knowledge/{docId}/history` | `knowledge:read` (git log) |
| GET | `/organizations/{orgId}/knowledge/{docId}/health` | `knowledge:read` |

Query params: `departmentId`, `status`, `tag`, `q` (title search), `sort`, `healthBelow`.

---

## 5.8 Pull Requests (Git Workflow)

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/pull-requests` | `pr:read` |
| POST | `/organizations/{orgId}/pull-requests` | `pr:create` |
| GET | `/organizations/{orgId}/pull-requests/{prId}` | `pr:read` |
| PATCH | `/organizations/{orgId}/pull-requests/{prId}` | `pr:update` (author) |
| POST | `/organizations/{orgId}/pull-requests/{prId}/open` | `pr:create` |
| POST | `/organizations/{orgId}/pull-requests/{prId}/close` | `pr:close` |
| GET | `/organizations/{orgId}/pull-requests/{prId}/files` | `pr:read` |
| GET | `/organizations/{orgId}/pull-requests/{prId}/diff` | `pr:read` |
| GET | `/organizations/{orgId}/pull-requests/{prId}/reviews` | `pr:read` |
| POST | `/organizations/{orgId}/pull-requests/{prId}/reviews` | `pr:review` |
| PATCH | `/organizations/{orgId}/pull-requests/{prId}/reviews/{reviewId}` | `pr:review` |
| POST | `/organizations/{orgId}/pull-requests/{prId}/merge` | `pr:merge` |
| GET | `/organizations/{orgId}/pull-requests/{prId}/commits` | `pr:read` |

---

## 5.9 Search & RAG

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/organizations/{orgId}/search` | `knowledge:read` |
| POST | `/organizations/{orgId}/search/semantic` | `knowledge:read` |
| POST | `/organizations/{orgId}/search/hybrid` | `knowledge:read` |

Request body example:

```json
{
  "query": "onboarding checklist for engineers",
  "filters": { "departmentIds": ["..."], "tags": ["hr"] },
  "limit": 10
}
```

---

## 5.10 Chat & Conversations

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/conversations` | `chat:read` |
| POST | `/organizations/{orgId}/conversations` | `chat:create` |
| GET | `/organizations/{orgId}/conversations/{convId}` | `chat:read` |
| DELETE | `/organizations/{orgId}/conversations/{convId}` | `chat:delete` |
| GET | `/organizations/{orgId}/conversations/{convId}/messages` | `chat:read` |
| POST | `/organizations/{orgId}/conversations/{convId}/messages` | `chat:create` |
| POST | `/organizations/{orgId}/chat` | `chat:create` (shortcut: create conv + message) |

### WebSocket

`WSS /v1/organizations/{orgId}/conversations/{convId}/stream`

Events: `message.delta`, `message.completed`, `citation`, `error`.

---

## 5.11 Agents

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/agents` | `agent:read` |
| POST | `/organizations/{orgId}/agents` | `agent:create` |
| GET | `/organizations/{orgId}/agents/{agentId}` | `agent:read` |
| PATCH | `/organizations/{orgId}/agents/{agentId}` | `agent:update` |
| DELETE | `/organizations/{orgId}/agents/{agentId}` | `agent:delete` |
| POST | `/organizations/{orgId}/agents/{agentId}/run` | `agent:execute` |
| GET | `/organizations/{orgId}/agents/{agentId}/runs` | `agent:read` |

---

## 5.12 Knowledge Health & Gaps

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/health` | `health:read` |
| GET | `/organizations/{orgId}/health/summary` | `health:read` |
| POST | `/organizations/{orgId}/health/recompute` | `health:manage` |
| GET | `/organizations/{orgId}/gaps` | `gap:read` |
| GET | `/organizations/{orgId}/gaps/{gapId}` | `gap:read` |
| PATCH | `/organizations/{orgId}/gaps/{gapId}` | `gap:update` |
| POST | `/organizations/{orgId}/gaps/{gapId}/resolve` | `gap:resolve` |
| POST | `/organizations/{orgId}/gaps/{gapId}/dismiss` | `gap:update` |

---

## 5.13 Audit Logs

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/audit-logs` | `audit:read` |
| GET | `/organizations/{orgId}/audit-logs/{logId}` | `audit:read` |
| GET | `/organizations/{orgId}/audit-logs/export` | `audit:export` |

Filters: `actorUserId`, `action`, `resourceType`, `from`, `to`.

---

## 5.14 Integrations

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/organizations/{orgId}/api-keys` | `api_key:read` |
| POST | `/organizations/{orgId}/api-keys` | `api_key:create` |
| DELETE | `/organizations/{orgId}/api-keys/{keyId}` | `api_key:delete` |
| GET | `/organizations/{orgId}/webhooks` | `webhook:read` |
| POST | `/organizations/{orgId}/webhooks` | `webhook:create` |
| PATCH | `/organizations/{orgId}/webhooks/{hookId}` | `webhook:update` |
| DELETE | `/organizations/{orgId}/webhooks/{hookId}` | `webhook:delete` |
| GET | `/organizations/{orgId}/llm-config` | `org:update` |
| PUT | `/organizations/{orgId}/llm-config` | `org:update` |

---

## 5.15 Platform Admin (internal)

| Method | Endpoint |
|--------|----------|
| GET | `/admin/organizations` |
| PATCH | `/admin/organizations/{orgId}/status` |
| GET | `/admin/metrics` |

---

## 5.16 Rate Limits

| Tier | API | Chat | Search |
|------|-----|------|--------|
| free | 100/min | 20/min | 30/min |
| team | 1000/min | 200/min | 300/min |
| enterprise | custom | custom | custom |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.
