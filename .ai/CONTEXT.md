# RepoAtlas Context

## Current State

- Nuxt 4 fullstack MVP is in place.
- Prisma and PostgreSQL are connected.
- Base tables were created in the `repo_atlas` schema.
- OpenAI Responses API integration for summary and Q&A is implemented.
- Production build verification passed.
- Authentication, saved Git connections, repository management, async analysis history, and Q&A history are implemented.
- The current UI direction is a dense dashboard/report console with collapsible panels.

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
- Git connection data stores repository URL and token together.
- Q&A targets are selected from completed analyses rather than typed by raw IDs.

## Likely Next Work

- End-to-end verification against a real GitHub repository
- Better Q&A relevance ranking
- Analysis caching and rerun policy
- Persistent collapsed-panel preferences
- Author and activity reporting refinement
- Safer private-repository metadata detection
