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
- `pages/analysis/[id].vue`

Follow-up:

- Consider moving slot definitions into a shared configuration module if more categories are added.
- Add deterministic precomputed signal metadata if health scoring needs to become less model-dependent.

### YYYY-MM-DD - Title

Context:

- Why the decision was needed

Decision:

- What was chosen

Impact:

- Which files, layers, or operational paths are affected

Follow-up:

- What should be improved later
