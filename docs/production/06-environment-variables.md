# Environment Variables (Production)

See `.env.example` for local development. Production requires:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes | Public app URL (e.g. `https://app.example.com`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as AUTH_URL for client |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Yes* | Google OAuth (*or other IdP) |
| `GITHUB_TOKEN` | Yes** | GitHub PAT for knowledge repos |
| `GITHUB_OWNER` / `GITHUB_REPO` | Yes** | Default repo (per-org override in settings) |
| `QDRANT_URL` | Yes | Qdrant HTTP endpoint |
| `QDRANT_API_KEY` | Prod | Qdrant Cloud API key |
| `OPENAI_API_KEY` | Yes*** | Default LLM/embeddings |
| `AI_PROVIDER` | No | `openai` (default), `anthropic`, `gemini` |
| `REDIS_URL` | Recommended | Rate limiting across replicas |
| `SENTRY_DSN` | Recommended | Error tracking |

Optional tuning: `QDRANT_VECTOR_SIZE`, `QDRANT_SCORE_THRESHOLD`, `INDEXER_POLL_MS`.

Never commit `.env` files. Use secrets manager in CI/CD.
