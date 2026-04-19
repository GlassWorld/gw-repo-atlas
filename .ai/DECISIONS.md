# RepoAtlas Decisions

## When To Record

Record a note here when a change is:

- structural
- operationally meaningful
- hard to reverse later

Use the template below.

---

### 2026-04-12 - Dashboard-First Report UI

Context:

- The product is used as an analysis and reporting console rather than a content or blog experience.
- Broad spacing, decorative copy, and equal-height cards made the interface feel wasteful.

Decision:

- Shift the UI toward a dense dashboard/report layout.
- Prefer sharp-edged panels, tighter spacing, explicit metrics, and operational summaries.
- Avoid forced equal-height grid panels and make detail-heavy report blocks collapsible.

Impact:

- `assets/css/main.css`
- analysis report pages and chart components
- reusable panel behavior through `components/CollapsiblePanel.vue`

Follow-up:

- Persist collapsed state per user or browser session.
- Continue pruning low-value panels from the analysis report.

### 2026-04-12 - Selection-Based Q&A Flow

Context:

- Asking users to type `repositoryId` and `analysisId` directly was operationally correct but poor UX.
- Q&A answers and citations were already stored, but the product did not expose the saved history.

Decision:

- Select completed analyses from a list instead of accepting raw IDs.
- Surface recent Q&A history directly in the Q&A screen.
- Normalize multiline answer text before persistence and rendering.

Impact:

- `components/QaPanel.vue`
- `server/api/qa.get.ts`
- `server/services/qa.service.ts`

Follow-up:

- Add filters by repository and date.
- Consider delete, pin, or rerun actions for saved Q&A items.

### 2026-04-14 - GitHub Actions Front Deployment For Atlas

Context:

- RepoAtlas runs as a Nuxt fullstack application, so the production container needs runtime secrets for database access, OpenAI calls, and auth signing.
- The existing `gw-home` project already established a deployment pattern using GHCR, SSH, SCP, Docker Compose, and Nginx on the target server.

Decision:

- Add a GitHub Actions workflow that builds a container image, pushes it to GHCR, copies deployment manifests to the server, writes a runtime `.env`, and restarts the stack through Docker Compose.
- Reuse the shared host Nginx for TLS termination and domain routing, and bind the Atlas Nuxt container to an internal loopback port for proxying.

Impact:

- `.github/workflows/deploy-front.yml`
- `deploy/frontend/Dockerfile`
- `deploy/frontend/docker-compose.yml`
- `deploy/frontend/nginx.atlas.conf`
- `README.md`

Follow-up:

- Validate the workflow against the real server secrets and certificate state.
- Consider adding a separate build-only CI workflow for pull requests.

### 2026-04-19 - Slot-Based Analysis Snippet Selection

Context:

- The previous analysis flow selected key snippets from a small path heuristic and capped the result at ten files.
- Repository health checks need consistent evidence for documentation, test harnesses, CI/CD, AI coding setup, code quality tools, and environment examples.

Decision:

- Select snippets by fixed slots before calling OpenAI: required docs/manifests/entrypoints, environment/config signals, then up to two code files.
- Ask OpenAI to return a `healthScore` JSON block while preserving the existing summary fields.
- Store `healthScore` on `analysis` and render it in the analysis detail report.

Impact:

- `server/services/git.service.ts`
- `server/services/openai.service.ts`
- `server/services/analysis.service.ts`
- `prisma/schema.prisma`
- `pages/analysis/[id]/index.vue`

Follow-up:

- Consider moving slot definitions into a shared configuration module if more categories are added.
- Add deterministic precomputed signal metadata if health scoring needs to become less model-dependent.

### 2026-04-19 - Stack-Aware Health Scoring

Context:

- The first health scoring prompt used one generic set of target files.
- That was reasonable for Nuxt/Node repositories but too weak for Java and Python repositories, where test harnesses and quality tools live in different files.

Decision:

- Detect a repository project kind before health scoring.
- Build project-kind-specific `healthScoreRules` and send them to OpenAI with `detectedProject`.
- Keep the persisted score buckets stable while changing the target evidence inside each bucket by stack.
- Store `projectKind` and `appliedRules` inside the health score JSON.

Impact:

- `server/utils/project-health.ts`
- `server/services/openai.service.ts`
- `components/HealthScorePanel.vue`
- `types/atlas.ts`
- `.ai/PROJECT-HEALTH-SCORING.md`
- `docs/프로젝트-헬스-스코어링.md`

Follow-up:

- Add more detector signals for Kotlin, Spring multi-module builds, monorepos, and frontend/backend mixed repositories.
- Consider making score buckets configurable if product requirements need different category weights per stack.

### 2026-04-19 - Repository-Scoped Analysis Menu

Context:

- Creating a new `analysis` row on every analysis start made the product feel like an execution-history viewer.
- The next product direction is task-based analysis per repository, where users run or rerun specific checks from a stable repository workspace.

Decision:

- Reuse the latest analysis row for a repository when analysis is started again.
- Keep already running analysis jobs from being launched twice.
- Change the `/analyses` page from an analysis history list into a repository-scoped analysis menu.

Impact:

- `server/services/analysis.service.ts`
- `server/api/analyze.post.ts`
- `pages/analyses.vue`
- `components/RepositoryForm.vue`
- `layouts/default.vue`

Follow-up:

- Split scan, health, security, CI/CD, and quality checks into dedicated analysis artifacts.
- Decide whether old historical analysis rows should be migrated or pruned.

### 2026-04-19 - Catalog-Based Analysis Items

Context:

- The analysis detail page is moving from one large report into staged, per-item analysis.
- More analysis types will be added, so item grouping and validation should not be scattered across pages and API handlers.

Decision:

- Introduce `utils/analysis-items.ts` as the shared catalog for item type, group, title, description, readiness, completion, and summary state.
- Render analysis groups from the catalog and reuse the same catalog for item API type validation and detail-page headings.

Impact:

- `utils/analysis-items.ts`
- `pages/analysis/[id]/index.vue`
- `pages/analysis/[id]/items/[type].vue`
- `server/api/analysis/[id]/items.post.ts`

Follow-up:

- Persist item execution state and result payloads in an analysis artifact table when item-specific OpenAI calls are introduced.
- Add new item types by extending the catalog first, then adding a matching detail renderer.

### 2026-04-19 - Persistent Analysis Artifacts

Context:

- Staged analysis needs durable per-item state instead of only activating local UI links.
- Item-specific analysis calls should be rerunnable without creating new top-level analysis rows.

Decision:

- Add `analysis_artifact` with one row per `(analysisId, type)` to store status, summary, result JSON, error message, and timestamps.
- Keep base repository analysis on `analysis`, `file_index`, and `commit_summary`.
- Run item-specific OpenAI reports from `POST /api/analysis/:id/items` and poll the analysis detail response for artifact state.

Impact:

- `prisma/schema.prisma`
- `prisma/migrations/20260419112000_add_analysis_artifacts/migration.sql`
- `server/services/analysis.service.ts`
- `server/services/openai.service.ts`
- `server/api/analysis/[id]/items.post.ts`
- `types/atlas.ts`
- `pages/analysis/[id]/index.vue`
- `pages/analysis/[id]/items/[type].vue`

Follow-up:

- Move in-process artifact execution to a durable worker or queue before production load increases.
- Add artifact retention or version history if users need to compare reruns.

### 2026-04-19 - Database-Backed Analysis Job Queue

Context:

- Base analysis and item analysis were launched directly from API handlers.
- Direct background execution is fragile when requests overlap, process restarts happen, or retries are needed.

Decision:

- Add `analysis_job` as a database-backed queue for base analysis and item analysis jobs.
- API handlers now create or reset domain state, then enqueue jobs by idempotency key.
- A Nitro server plugin polls pending jobs, claims them with a worker id, executes the matching service function, and records success, retry, or failure.

Impact:

- `prisma/schema.prisma`
- `prisma/migrations/20260419114500_add_analysis_jobs/migration.sql`
- `server/services/analysis-job.service.ts`
- `server/plugins/analysis-worker.server.ts`
- `server/api/analyze.post.ts`
- `server/api/analysis/[id]/items.post.ts`

Follow-up:

- Move the worker into a separate process if analysis load should not share resources with HTTP serving.
- Add an operator-facing job monitor when support/debug workflows need it.

### YYYY-MM-DD - Title

Context:

- Why the decision was needed

Decision:

- What was chosen

Impact:

- Which files, layers, or operational paths are affected

Follow-up:

- What should be improved later
