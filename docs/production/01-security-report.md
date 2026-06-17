# Security Report — Organizational Brain OS

**Audit date:** Production readiness Phase 4  
**Scope:** Full codebase (`apps/web`, `packages/*`)

## Executive summary

The platform has a solid baseline (session auth, `requireOrgAccess`, RBAC seed, org-scoped Qdrant collections). **Critical IDOR and RBAC gaps** were identified and are addressed in this phase. Production deployment should not proceed until fixes in `packages/rbac`, API routes, middleware, and RAG retrieval are verified by the new test suite.

---

## Critical findings (fixed in Phase 4)

| ID | Issue | Risk | Remediation |
|----|-------|------|-------------|
| C1 | Knowledge `DELETE` by `docId` only — cross-org archive | Tenant data destruction | Tenant-scoped `update` + `getKnowledgeDocument` |
| C2 | Role assign without validating `role.organizationId` | Privilege escalation | `validateRoleAssignment` in RBAC |
| C3 | `scopeDepartmentId` never enforced | Confidentiality breach | `getKnowledgeAccessScope` + RAG/API filters |
| C4 | API routes not protected by middleware | Defense-in-depth gap | Auth middleware for `/api/v1/*` |
| C5 | RAG/chat accepts arbitrary `departmentId` | Data exfiltration | Server-side department allowlist |

---

## High findings

| ID | Issue | Remediation |
|----|-------|-------------|
| H1 | Admin UI pages lack permission checks | Server-side `requirePagePermission` in layouts |
| H2 | Onboarding `pathId` without org check | Org filter on `OnboardingPath` |
| H3 | Raw URL `orgId` passed to services (slug vs UUID) | Standardize on `org.id` after `requireOrgAccess` |
| H4 | No rate limiting on AI endpoints | Redis/memory rate limiter per user/org |
| H5 | No prompt injection hardening | `sanitizeUserPrompt` + system prompt rules |
| H6 | Global `GITHUB_TOKEN` for all tenants | Documented; per-org token via org settings (future) |
| H7 | Seeded permissions without routes (`member:invite`, `audit:read`) | Documented in technical debt; invite exists via admin UI only |

---

## API endpoint coverage

All `/api/v1/organizations/[orgId]/*` routes use:

- Session via `getSessionUser` + `requireUser`
- `requireOrgAccess` (membership + optional permission)
- Resolved organization UUID (`org.id`)

Exceptions (by design):

- `/api/auth/*` — public OAuth
- `/api/v1/auth/me` — authenticated user profile
- `/api/v1/permissions` — global permission catalog (read-only)
- `POST /api/v1/organizations` — creates org for authenticated user

---

## RBAC matrix gaps

| Permission | Enforced |
|------------|----------|
| `knowledge:*`, `pr:*`, `chat:*`, `search:read` | Yes (API) |
| `admin:stats` | Yes (API + admin page) |
| `role:read`, `role:assign` | Yes (API + admin page) |
| `member:read` | Yes (API + admin page) |
| `member:invite` | Partial (UI form; API route recommended) |
| `audit:read` | Monitoring dashboard (Phase 4) |
| `org:update`, `org:delete` | Not implemented (debt) |

---

## AI security controls (Phase 4)

| Control | Status |
|---------|--------|
| Org-isolated Qdrant collections | Implemented |
| Published-only vectors | Implemented |
| Department filter from server-side scope | **Implemented** |
| Prompt sanitization (delimiter injection) | **Implemented** |
| Rate limits (chat, search, agents, structure) | **Implemented** |
| AI request audit logs | **Implemented** (`AiRequestLog`) |
| Per-tenant LLM keys | Schema ready (`OrganizationLlmConfig`) |

---

## Audit logging

| Event | Logged |
|-------|--------|
| PR merge, role assign | `audit_logs` (existing) |
| Chat, search, agent runs | `brain_analytics_events` + `ai_request_logs` |
| API errors | Structured logs + `request_id` |

---

## Recommendations (post Phase 4)

1. Enable SSO domain allowlist for enterprise tenants.
2. Encrypt `OrganizationLlmConfig.apiKeyEncrypted` with KMS.
3. Per-organization GitHub App installations.
4. WAF + CSP headers at edge.
5. Periodic penetration test before SOC2.
