# RepoAtlas Core Skill

This skill defines the default way to work on RepoAtlas repository-analysis features and supporting docs.

## Use It When

- modifying repository analysis behavior
- adjusting OpenAI response formats or prompts
- changing Git clone, file indexing, or commit summarization flows
- updating AI collaboration docs

## Procedure

1. Identify the layer first.
2. Read the relevant service files before editing.
3. Keep API handlers thin and push logic into services.
4. Update types and docs together.
5. Prefer `npm run build` as the finishing verification step.

## Layer Map

- Repository registration: `server/api/repository.post.ts`, `server/services/repository.service.ts`
- Analysis execution: `server/api/analyze.post.ts`, `server/services/analysis.service.ts`
- Git scanning: `server/services/git.service.ts`
- OpenAI integration: `server/services/openai.service.ts`
- Q&A: `server/api/qa.post.ts`, `server/services/qa.service.ts`
- UI: `pages/`, `components/`

## Documentation Rules

- If human usage changes, update `docs/`.
- If AI workflow changes, update `.ai/AGENTS.md`.
- If current state changes, update `.ai/CONTEXT.md`.
- If a durable architectural choice is made, update `.ai/DECISIONS.md`.
- If a database table is added or changed, add a Korean table comment in both schema docs and migration SQL.
- If a database column is added or changed, add a Korean column comment in both schema docs and migration SQL.

## Quality Bar

- Do not break strict mode.
- Preserve service-layer boundaries.
- Prefer reusable structure over one-off patches.
- Keep all database changes inside the `repo_atlas` schema only.
- Leave enough documentation for the next handoff.
