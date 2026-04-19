# RepoAtlas Context

## Current State

- Nuxt 4 fullstack MVP is in place.
- Prisma and PostgreSQL are connected.
- Base tables were created in the `repo_atlas` schema.
- OpenAI Responses API integration for summary and Q&A is implemented.
- Repository analysis now uses slot-based snippet selection and stores an OpenAI-generated health score.
- Health scoring is stack-aware: project kind detection builds Nuxt/Node, Java, Python, Go, Rust, or generic scoring rules before the OpenAI request.
- Analysis detail UI is staged: base analysis creates the project overview, then grouped item cards run and activate detail pages for overview, health, structure, and commit activity.
- Per-item analysis state and generated OpenAI reports are stored in `analysis_artifact`.
- Production build verification passed.
- Authentication, saved Git connections, repository management, repository-scoped analysis, and Q&A history are implemented.
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

- Repository and item analysis requests are persisted to `analysis_job`; a Nitro server plugin worker claims and executes jobs.
- Starting analysis reuses the latest analysis row for the repository instead of creating an execution-history row each time.
- Analysis item metadata lives in `utils/analysis-items.ts`; list UI, item API validation, and item detail titles should use that catalog when new analysis types are added.
- Item analysis requests create or reset an `analysis_artifact` row, enqueue an item job, and store the item-specific OpenAI report in the artifact.
- The current queue is database-backed and in-process; a separate worker process is the next hardening step if load grows.
- File selection for Q&A is currently heuristic and rule-based.
- Analysis snippet selection is slot-based: required docs/manifests/entrypoints, environment/config files, then up to two code files.
- Health scoring rules are built in `server/utils/project-health.ts`; the health score JSON now includes `projectKind` and `appliedRules`.
- Git connection data stores repository URL and token together.
- Q&A targets are selected from completed analyses rather than typed by raw IDs.
- Production runtime requires `DATABASE_URL`, `OPENAI_API_KEY`, and `AUTH_JWT_SECRET` to be present on the deployment host.

## Likely Next Work

- End-to-end verification against a real GitHub repository
- Better Q&A relevance ranking
- Analysis caching and rerun policy
- Separate worker process or Redis-backed queue if concurrency needs grow
- Persistent collapsed-panel preferences
- Author and activity reporting refinement
- Safer private-repository metadata detection
- First-production deployment validation on the target host, including TLS certificate issuance
