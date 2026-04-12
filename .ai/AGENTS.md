# RepoAtlas AI Working Agreement

This document defines the default operating rules for AI agents working in this repository.

## Language Policy

- Everything under `.ai/` must be written in English.
- Everything under `docs/` must be written in Korean.
- If a document mixes audiences, split it instead of mixing languages.

## Purpose

- Understand the repository quickly.
- Keep changes scoped and reviewable.
- Preserve clear boundaries between API, services, UI, and database layers.
- Leave reproducible code and durable documentation behind.

## Priorities

1. Working behavior
2. Type safety
3. Structural consistency
4. Documentation freshness
5. UI polish

## Core Rules

- Read the relevant files before editing.
- Keep `server/api` thin and move business logic into `server/services`.
- Access the database through Prisma only.
- Never create, alter, drop, or write database objects outside the `repo_atlas` schema.
- Treat any non-`repo_atlas` schema as out of scope unless the user explicitly redefines the project boundary.
- Every database table must have a Korean table comment in the actual database schema.
- Every business column must have a Korean column comment in the actual database schema.
- When adding or changing tables, update both `prisma/schema.prisma` model descriptions and SQL `COMMENT ON TABLE` statements in migrations.
- When adding or changing columns, update both `prisma/schema.prisma` field descriptions and SQL `COMMENT ON COLUMN` statements in migrations.
- Promote reusable rules into `server/utils` or `types` when appropriate.
- Avoid hardcoding and prefer configuration or explicit constants.
- Do not leave build-breaking type errors behind.
- Update docs when behavior, setup, or structure changes.
- Prefer selection-based UX over raw ID entry when a stable list of saved records already exists.
- Treat saved repository connections and saved analyses as primary UX anchors for follow-up actions.
- Preserve Q&A history and expose it in the product when questions and answers are stored.

## UI Rules

- This product is a dashboard/report application, not a blog or marketing page.
- Use the full page width and keep padding tight unless readability clearly suffers.
- Prefer sharp-edged panels and controls over rounded cards.
- Avoid decorative sections that do not improve operational understanding.
- Prefer dense, scan-friendly panels with explicit labels, timestamps, and metrics.
- Use charts only when their meaning is explicit in the UI.
- Add captions, labels, or date ranges when a chart could be ambiguous.
- Long paths or technical strings must wrap inside their own panels and never expand the grid.
- Avoid forced equal-height cards when it creates empty space.
- Large report sections should be collapsible; default low-priority detail panels to collapsed.
- Collapse toggles should be icon-first and visually compact.

## Coding Style Rules

- Normalize multiline AI text before saving or rendering when escaped newlines may appear.
- Prefer small, focused computed values and helper functions over large template expressions.
- Keep reusable panel behavior in shared components instead of duplicating toggle logic.
- When adding a visualization, define what the axes, units, and grouping mean in code and UI copy.

## Commit Message Rule

- Keep the commit type prefix in English.
- Write the subject after the prefix in Korean.
- Preferred examples: `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `chore: ...`

## Important Locations

- [README.md](../README.md): top-level product and setup overview
- [docs/README.md](../docs/README.md): Korean documentation index for humans
- [nuxt.config.ts](../nuxt.config.ts): runtime and Nuxt configuration
- [prisma/schema.prisma](../prisma/schema.prisma): database schema
- [server/services](../server/services): core business logic
- [server/api](../server/api): HTTP entrypoints
- [pages](../pages): UI entrypoints
- [.ai/CONTEXT.md](./CONTEXT.md): current AI handoff context

## Before Starting

- Classify the request as feature work, bug fix, refactor, or docs work.
- Narrow the affected files and layers first.
- Decide whether database schema changes are involved.
- If Git analysis or OpenAI flows are touched, inspect both API and service layers.

## After Finishing

- Run `npm run build` or another meaningful verification command.
- If environment variables changed, update `.env.example` and human docs.
- If database work was involved, verify the active schema is still `repo_atlas`.
- If a database table was added or changed, verify that its Korean table comment exists.
- If a database column was added or changed, verify that its Korean column comment exists.
- Record architectural choices in `.ai/DECISIONS.md`.
- Refresh `.ai/CONTEXT.md` so the next agent can continue smoothly.

## Documentation Order

1. `.ai/AGENTS.md`
2. `.ai/WORKFLOW.md`
3. `.ai/CONTEXT.md`
4. `.ai/DECISIONS.md`
5. `docs/`
6. `README.md`

## Skill Usage

The base repository skill lives in [.ai/skills/repo-atlas/SKILL.md](./skills/repo-atlas/SKILL.md).

- Use it for recurring repository-analysis work.
- Keep skills lightweight and procedural.
- Extract new skills only when a workflow repeats often enough to deserve one.
