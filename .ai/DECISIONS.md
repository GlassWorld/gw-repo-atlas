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

### YYYY-MM-DD - Title

Context:

- Why the decision was needed

Decision:

- What was chosen

Impact:

- Which files, layers, or operational paths are affected

Follow-up:

- What should be improved later
