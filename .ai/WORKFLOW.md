# RepoAtlas Workflow

## Default Flow

1. Classify the request.
2. Inspect the affected files and layers.
3. Keep the scope tight.
4. Implement the change.
5. Verify the result.
6. Refresh documentation.

## Layer Rules

### API

- Parse requests and return responses only.
- Delegate business logic to services.

### Services

- Own domain workflows and orchestration.
- Compose Git, OpenAI, and Prisma interactions here.

### Database

- Evaluate migration impact whenever `schema.prisma` changes.
- Check API and docs impact together with schema changes.
- Keep all schema changes strictly inside `repo_atlas`.
- Do not touch tables, views, functions, or sequences in any other schema.
- Add or update a Korean table comment for every table change.
- Add or update a Korean column comment for every business-column change.
- Keep the Prisma model description and SQL table comment aligned.
- Keep the Prisma field description and SQL column comment aligned.

### UI

- Keep pages focused on composition.
- Move reusable presentation into `components/`.
- Favor dashboard/report density over landing-page spacing.
- Use compact labels, metrics, and panels instead of narrative filler.
- Prefer modal-based create/edit flows when the user is managing registered records.
- Replace direct identifier input with selection controls when records can be listed safely.
- Add collapsible sections for detail-heavy report screens.
- Do not rely on unexplained charts; add captions, time ranges, or legends.
- Prevent long paths and code-like strings from stretching grids.

## Verification

- Run `npm run build` for structural or type-level changes.
- Run `npx prisma migrate dev` for schema changes.
- Update `.env.example` when environment variables change.
- If a Q&A or AI-generated text flow changes, verify multiline rendering in the UI.
- If a dashboard or report layout changes, verify that panels do not stretch into empty vertical space.

## Documentation Rules

- Human-facing explanations belong in `docs/` and must be Korean.
- AI-facing workflow docs belong in `.ai/` and must be English.
- Update both sides when a change affects both audiences.
