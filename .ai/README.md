# .ai Workspace

The `.ai` directory contains AI-facing operating documents, handoff context, and lightweight skills.

## Language Rule

- `.ai` documents are for AI agents and must be written in English.
- Human-readable Korean documentation belongs in `docs/`.

## Structure

- [AGENTS.md](./AGENTS.md): AI working agreement
- [WORKFLOW.md](./WORKFLOW.md): execution and verification habits
- [CONTEXT.md](./CONTEXT.md): current repository context and handoff notes
- [DECISIONS.md](./DECISIONS.md): architecture and process decisions
- [PROJECT-HEALTH-SCORING.md](./PROJECT-HEALTH-SCORING.md): stack-aware health scoring design
- [skills/repo-atlas/SKILL.md](./skills/repo-atlas/SKILL.md): base repository skill

## Maintenance Rules

- Update `CONTEXT` when the current state changes.
- Update `DECISIONS` when a durable structural choice is made.
- Update `AGENTS` or `WORKFLOW` when the collaboration model changes.
- Add or refine a skill when a workflow becomes repetitive.
