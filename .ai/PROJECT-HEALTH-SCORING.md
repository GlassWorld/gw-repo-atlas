# Project Health Scoring

RepoAtlas health scoring is stack-aware. The analysis flow first detects the project kind from repository file paths and selected snippets, then sends project-specific scoring rules to OpenAI.

## Flow

1. Clone the repository and collect tracked files with `git ls-files`.
2. Select analysis snippets through fixed slots: documentation, manifest, entrypoint, environment/config signals, then code files.
3. Detect the project kind from file paths and snippet content.
4. Build health scoring rules for that project kind.
5. Send `detectedProject` and `healthScoreRules` to OpenAI.
6. Store the returned `healthScore` JSON with score values, project kind metadata, and applied rules.

## Project Kinds

The current detector supports:

- `nuxt`
- `vue-vite`
- `next`
- `node`
- `java-spring-gradle`
- `java-spring-maven`
- `java-gradle`
- `java-maven`
- `python`
- `go`
- `rust`
- `unknown`

## Stable Score Buckets

The persisted score buckets remain stable so the UI and historical comparison stay simple:

- `documentation`: 25%
- `testHarness`: 25%
- `cicd`: 20%
- `vibeCoding`: 15%
- `codeQuality`: 15%

The target files and evidence inside each bucket are stack-specific.

## Examples

Nuxt:

- Test harness: `package.json` scripts, `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `cypress.json`, `tests/`.
- Code quality: ESLint, Prettier, TypeScript, `vue-tsc`, Nuxt type checking.

Java Gradle:

- Test harness: `build.gradle(.kts)`, JUnit, Testcontainers, `src/test`, Gradle `test`.
- Code quality: Checkstyle, PMD, SpotBugs, Jacoco, Sonar, Gradle quality plugins.

Python:

- Test harness: `pytest.ini`, `pyproject.toml` pytest config, `tox.ini`, `noxfile.py`, `tests/`.
- Code quality: Ruff, Black, isort, mypy, pre-commit.

## Implementation

- Detector and rule builder: `server/utils/project-health.ts`
- Summary prompt integration: `server/services/openai.service.ts`
- Stored JSON type: `types/atlas.ts`
- UI rendering: `components/HealthScorePanel.vue`

## Maintenance Notes

- Add new project kinds in `ProjectKind` first.
- Add detector signals before changing prompts.
- Keep common score buckets stable unless the UI and historical JSON handling are changed together.
- Keep human-facing descriptions in `docs/프로젝트-헬스-스코어링.md`.
