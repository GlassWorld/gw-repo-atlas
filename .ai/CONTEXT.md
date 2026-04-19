# RepoAtlas Context

## Current State

- Nuxt 4 fullstack MVP is in place.
- Prisma and PostgreSQL are connected.
- Base tables were created in the `repo_atlas` schema.
- OpenAI Responses API integration for summary and Q&A is implemented.
- Repository analysis now uses slot-based snippet selection and stores an OpenAI-generated health score.
- Production build verification passed.
- Authentication, saved Git connections, repository management, async analysis history, and Q&A history are implemented.
- The current UI direction is a dense dashboard/report console with collapsible panels.
- GitHub Actions based production deployment for `atlas.glassworld.co.kr` is now scaffolded under `.github/workflows` and `deploy/frontend`.
- The current deployment shape assumes a shared reverse proxy on the same server as `home.glassworld.co.kr`, with Atlas bound to an internal loopback port.

## Current Core Modules

- `server/services/analysis.service.ts`
- `server/services/git.service.ts`
- `server/services/openai.service.ts`
- `server/services/qa.service.ts`
- `server/services/git-credential.service.ts`
- `components/CollapsiblePanel.vue`

## Current Runtime Assumptions

- Repository analysis runs as in-process async work inside Nitro.
- A queue worker is the likely next step for production hardening.
- File selection for Q&A is currently heuristic and rule-based.
- Analysis snippet selection is slot-based: required docs/manifests/entrypoints, environment/config files, then up to two code files.
- Git connection data stores repository URL and token together.
- Q&A targets are selected from completed analyses rather than typed by raw IDs.
- Production runtime requires `DATABASE_URL`, `OPENAI_API_KEY`, and `AUTH_JWT_SECRET` to be present on the deployment host.

## Likely Next Work

- End-to-end verification against a real GitHub repository
- Better Q&A relevance ranking
- Analysis caching and rerun policy
- Persistent collapsed-panel preferences
- Author and activity reporting refinement
- Safer private-repository metadata detection
- First-production deployment validation on the target host, including TLS certificate issuance
