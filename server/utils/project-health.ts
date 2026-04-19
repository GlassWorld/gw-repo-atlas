export type ProjectKind =
  | "nuxt"
  | "vue-vite"
  | "next"
  | "node"
  | "java-spring-gradle"
  | "java-spring-maven"
  | "java-gradle"
  | "java-maven"
  | "python"
  | "go"
  | "rust"
  | "unknown";

export interface ProjectKindSummary {
  id: ProjectKind;
  label: string;
  confidence: number;
  reason: string;
  signals: string[];
}

export interface HealthScoreRules {
  source: string;
  projectKind: ProjectKindSummary;
  categories: {
    documentation: string;
    testHarness: string;
    cicd: string;
    vibeCoding: string;
    codeQuality: string;
  };
  scoring: {
    range: string;
    totalWeights: {
      documentation: number;
      testHarness: number;
      cicd: number;
      vibeCoding: number;
      codeQuality: number;
    };
    flags: string;
    suggestions: string;
  };
}

interface ProjectSignal {
  kind: ProjectKind;
  label: string;
  weight: number;
  reason: string;
}

const COMMON_SCORING = {
  range: "0~100",
  totalWeights: {
    documentation: 25,
    testHarness: 25,
    cicd: 20,
    vibeCoding: 15,
    codeQuality: 15
  },
  flags: "주의사항 배열. 예: .env가 fileTree에 있으면 민감정보 커밋 가능성을 경고",
  suggestions: "감지된 프로젝트 종류에 맞는 개선 제안 배열"
};

const COMMON_DOCUMENTATION =
  "README.md, CHANGELOG, docs/ 폴더 존재 여부와 감지된 프로젝트 종류를 이해하는 데 필요한 문서 스니펫";
const COMMON_CICD =
  ".github/workflows/*.yml, .github/workflows/*.yaml, .gitlab-ci.yml, Jenkinsfile 존재 여부와 감지된 빌드 도구를 실행하는지";
const COMMON_VIBE =
  ".cursorrules, copilot-instructions.md, .github/copilot-instructions.md, .aider, .continue 존재 여부";

function normalizeFileTreeLine(line: string): string {
  return line.replace(/^[-\s]+/, "").trim().toLowerCase();
}

function includesPath(paths: Set<string>, path: string): boolean {
  return paths.has(path.toLowerCase());
}

function matchesPath(paths: Set<string>, pattern: RegExp): boolean {
  return [...paths].some((path) => pattern.test(path));
}

function collectSignals(fileTree: string[], snippets: Array<{ path: string; snippet: string }>): ProjectSignal[] {
  const paths = new Set(fileTree.map(normalizeFileTreeLine).filter(Boolean));
  for (const snippet of snippets) {
    paths.add(snippet.path.toLowerCase());
  }

  const snippetText = snippets.map((snippet) => `${snippet.path}\n${snippet.snippet}`).join("\n").toLowerCase();
  const signals: ProjectSignal[] = [];

  if (matchesPath(paths, /(^|\/)nuxt\.config\.(ts|js|mjs)$/)) {
    signals.push({ kind: "nuxt", label: "Nuxt", weight: 70, reason: "nuxt.config 파일이 있습니다." });
  }
  if (matchesPath(paths, /(^|\/)app\.vue$/) || matchesPath(paths, /(^|\/)pages\/.+\.vue$/)) {
    signals.push({ kind: "nuxt", label: "Nuxt", weight: 20, reason: "Nuxt/Vue 페이지 구조가 있습니다." });
  }
  if (matchesPath(paths, /(^|\/)vite\.config\.(ts|js|mjs)$/) && matchesPath(paths, /\.vue$/)) {
    signals.push({ kind: "vue-vite", label: "Vue Vite", weight: 65, reason: "Vite 설정과 Vue 파일이 있습니다." });
  }
  if (matchesPath(paths, /(^|\/)next\.config\.(ts|js|mjs)$/)) {
    signals.push({ kind: "next", label: "Next.js", weight: 75, reason: "Next.js 설정 파일이 있습니다." });
  }
  if (includesPath(paths, "package.json")) {
    signals.push({ kind: "node", label: "Node.js", weight: 35, reason: "package.json이 있습니다." });
  }

  const hasGradle = matchesPath(paths, /(^|\/)(build|settings)\.gradle(\.kts)?$/) || includesPath(paths, "gradlew");
  const hasMaven = includesPath(paths, "pom.xml");
  const hasSpringPath =
    matchesPath(paths, /(^|\/)src\/main\/resources\/application(-[^/]+)?\.(ya?ml|properties)$/) ||
    matchesPath(paths, /(^|\/)[^/]*application\.java$/);
  const hasSpringSnippet = snippetText.includes("springapplication") || snippetText.includes("spring-boot");

  if (hasGradle && (hasSpringPath || hasSpringSnippet)) {
    signals.push({ kind: "java-spring-gradle", label: "Java Spring Gradle", weight: 90, reason: "Gradle과 Spring Boot 신호가 함께 있습니다." });
  } else if (hasGradle) {
    signals.push({ kind: "java-gradle", label: "Java Gradle", weight: 65, reason: "Gradle 빌드 파일이 있습니다." });
  }

  if (hasMaven && (hasSpringPath || hasSpringSnippet)) {
    signals.push({ kind: "java-spring-maven", label: "Java Spring Maven", weight: 90, reason: "Maven과 Spring Boot 신호가 함께 있습니다." });
  } else if (hasMaven) {
    signals.push({ kind: "java-maven", label: "Java Maven", weight: 65, reason: "pom.xml이 있습니다." });
  }

  if (includesPath(paths, "pyproject.toml") || includesPath(paths, "requirements.txt") || includesPath(paths, "setup.py")) {
    signals.push({ kind: "python", label: "Python", weight: 65, reason: "Python 패키지/의존성 파일이 있습니다." });
  }
  if (includesPath(paths, "go.mod")) {
    signals.push({ kind: "go", label: "Go", weight: 75, reason: "go.mod 파일이 있습니다." });
  }
  if (includesPath(paths, "cargo.toml")) {
    signals.push({ kind: "rust", label: "Rust", weight: 75, reason: "Cargo.toml 파일이 있습니다." });
  }

  return signals;
}

function selectProjectKind(signals: ProjectSignal[]): ProjectKindSummary {
  if (!signals.length) {
    return {
      id: "unknown",
      label: "Unknown",
      confidence: 0,
      reason: "프로젝트 종류를 판단할 충분한 파일 신호가 없습니다.",
      signals: []
    };
  }

  const totals = new Map<ProjectKind, { label: string; score: number; reasons: string[] }>();
  for (const signal of signals) {
    const current = totals.get(signal.kind) ?? { label: signal.label, score: 0, reasons: [] };
    current.score += signal.weight;
    current.reasons.push(signal.reason);
    totals.set(signal.kind, current);
  }

  const [kind, result] = [...totals.entries()].sort((left, right) => right[1].score - left[1].score)[0];
  return {
    id: kind,
    label: result.label,
    confidence: Math.max(0, Math.min(100, result.score)),
    reason: result.reasons[0],
    signals: result.reasons
  };
}

function categoriesFor(kind: ProjectKind): HealthScoreRules["categories"] {
  switch (kind) {
    case "nuxt":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "package.json scripts, vitest.config.*, jest.config.*, playwright.config.*, cypress.json, tests/ 또는 __tests__/ 존재 여부",
        cicd: `${COMMON_CICD}. npm/pnpm/yarn install, lint, test, build 또는 nuxi build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: ".eslintrc.*, eslint.config.*, .prettierrc, prettier.config.*, tsconfig.json, vue-tsc, Nuxt 타입체크 설정 존재 여부"
      };
    case "vue-vite":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "package.json scripts, vitest.config.*, jest.config.*, playwright.config.*, cypress.json, tests/ 또는 __tests__/ 존재 여부",
        cicd: `${COMMON_CICD}. npm/pnpm/yarn lint, test, build 또는 vite build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: ".eslintrc.*, eslint.config.*, .prettierrc, prettier.config.*, tsconfig.json, vue-tsc 설정 존재 여부"
      };
    case "next":
    case "node":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "package.json scripts, jest.config.*, vitest.config.*, playwright.config.*, cypress.json, tests/ 또는 __tests__/ 존재 여부",
        cicd: `${COMMON_CICD}. npm/pnpm/yarn lint, test, build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: ".eslintrc.*, eslint.config.*, .prettierrc, prettier.config.*, tsconfig.json, biome.json, oxlint 설정 존재 여부"
      };
    case "java-spring-gradle":
    case "java-gradle":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "build.gradle(.kts)의 testImplementation/JUnit/Testcontainers 설정, src/test, Gradle test 태스크 존재 여부",
        cicd: `${COMMON_CICD}. ./gradlew test, ./gradlew build, Docker 이미지 빌드 또는 배포 단계 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: "Checkstyle, PMD, SpotBugs, Jacoco, Sonar, Gradle quality plugin, editorconfig 존재 여부"
      };
    case "java-spring-maven":
    case "java-maven":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "pom.xml의 JUnit, surefire, failsafe, testcontainers 설정, src/test 존재 여부",
        cicd: `${COMMON_CICD}. mvn test, mvn verify, mvn package, Docker 이미지 빌드 또는 배포 단계 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: "maven-checkstyle-plugin, pmd, spotbugs, jacoco, sonar-project.properties, editorconfig 존재 여부"
      };
    case "python":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "pytest.ini, pyproject.toml의 pytest 설정, tox.ini, noxfile.py, tests/ 존재 여부",
        cicd: `${COMMON_CICD}. pytest, ruff, mypy, build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: "ruff.toml, pyproject.toml의 ruff/black/isort/mypy 설정, pre-commit 설정 존재 여부"
      };
    case "go":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "*_test.go 파일, go test 실행 스크립트 또는 CI 단계 존재 여부",
        cicd: `${COMMON_CICD}. go test, go vet, go build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: "gofmt/go vet/golangci-lint 설정, .golangci.yml 존재 여부"
      };
    case "rust":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "Cargo.toml, tests/ 또는 #[test] 테스트, cargo test 실행 단계 존재 여부",
        cicd: `${COMMON_CICD}. cargo test, cargo clippy, cargo fmt, cargo build 실행 여부`,
        vibeCoding: COMMON_VIBE,
        codeQuality: "rustfmt.toml, clippy 설정, cargo fmt/clippy 실행 단계 존재 여부"
      };
    case "unknown":
      return {
        documentation: COMMON_DOCUMENTATION,
        testHarness: "감지 가능한 테스트 설정 파일, tests/ 디렉터리, CI의 테스트 실행 단계 존재 여부",
        cicd: COMMON_CICD,
        vibeCoding: COMMON_VIBE,
        codeQuality: "감지 가능한 린터, 포매터, 정적 분석, 타입체크 설정 존재 여부"
      };
  }
}

export function buildProjectHealthProfile(input: {
  fileTree: string[];
  analysisSnippets: Array<{ path: string; snippet: string }>;
}): HealthScoreRules {
  const projectKind = selectProjectKind(collectSignals(input.fileTree, input.analysisSnippets));

  return {
    source: "fileTree와 analysisSnippets만 근거로 판단하세요. 먼저 projectKind를 반영하고, 해당 종류에 맞는 대상 파일과 설정만 점수 근거로 사용하세요.",
    projectKind,
    categories: categoriesFor(projectKind.id),
    scoring: COMMON_SCORING
  };
}
