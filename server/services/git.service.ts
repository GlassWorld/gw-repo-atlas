import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildTreeLines, trimSnippet } from "../utils/file-tree";
import {
  buildAuthenticatedGitUrl,
  inferLanguageFromPath,
  isLikelyEntryPoint,
  isLikelyKeyFile
} from "../utils/repository";

const execFileAsync = promisify(execFile);

export interface ScannedFile {
  path: string;
  language: string | null;
  isEntryPoint: boolean;
  isKeyFile: boolean;
  summary: string | null;
  snippet: string | null;
}

export interface CommitInfo {
  commitHash: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  title: string;
  body: string | null;
}

export interface CloneResult {
  workspacePath: string;
  fileTree: string[];
  files: ScannedFile[];
  analysisSnippets: Array<{ path: string; snippet: string }>;
  commits: CommitInfo[];
  cleanup: () => Promise<void>;
}

interface FileCandidate {
  path: string;
  size: number;
}

const MANIFEST_PRIORITY = [
  "package.json",
  "build.gradle",
  "build.gradle.kts",
  "pom.xml",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "go.mod",
  "cargo.toml"
];

const ENTRYPOINT_PATTERNS = [
  /(^|\/)main\.[^/]+$/i,
  /(^|\/)app\.[^/]+$/i,
  /(^|\/)index\.[^/]+$/i,
  /(^|\/)server\.[^/]+$/i,
  /(^|\/)[^/]*application\.java$/i
];

const ENVIRONMENT_SLOT_PATTERNS = [
  {
    summary: "CI/CD 설정",
    patterns: [/^\.github\/workflows\/.+\.ya?ml$/i, /^\.gitlab-ci\.ya?ml$/i, /^jenkinsfile$/i]
  },
  {
    summary: "테스트 하네스 설정",
    patterns: [
      /(^|\/)jest\.config\.[^/]+$/i,
      /(^|\/)vitest\.config\.[^/]+$/i,
      /(^|\/)pytest\.ini$/i,
      /(^|\/)tox\.ini$/i,
      /(^|\/)noxfile\.py$/i,
      /(^|\/)playwright\.config\.[^/]+$/i,
      /(^|\/)cypress\.json$/i
    ]
  },
  {
    summary: "코드 품질 도구 설정",
    patterns: [
      /(^|\/)\.eslintrc(\.[^/]+)?$/i,
      /(^|\/)\.prettierrc(\.[^/]+)?$/i,
      /(^|\/)ruff\.toml$/i,
      /(^|\/)mypy\.ini$/i,
      /(^|\/)setup\.cfg$/i,
      /(^|\/)\.pre-commit-config\.ya?ml$/i,
      /(^|\/)sonar-project\.properties$/i,
      /(^|\/)checkstyle\.xml$/i,
      /(^|\/)pmd\.xml$/i,
      /(^|\/)spotbugs.*\.xml$/i
    ]
  },
  {
    summary: "AI 코딩 도구 설정",
    patterns: [
      /(^|\/)\.cursorrules$/i,
      /(^|\/)copilot-instructions\.md$/i,
      /^\.github\/copilot-instructions\.md$/i,
      /^\.aider(\/|$)/i,
      /^\.continue(\/|$)/i
    ]
  },
  {
    summary: "환경 변수 예시 파일",
    patterns: [/(^|\/)\.env\.example$/i]
  }
];

const CODE_SLOT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb",
  ".php",
  ".swift"
]);

async function runGit(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0"
    }
  });
  return stdout.trim();
}

export async function testGitRepositoryAccess(input: {
  repositoryUrl: string;
  domain: string;
  isPrivate: boolean;
  accessToken?: string | null;
}) {
  const remoteUrl = buildAuthenticatedGitUrl({
    repositoryUrl: input.repositoryUrl,
    domain: input.domain,
    accessToken: input.accessToken
  });

  if (input.isPrivate && !input.accessToken) {
    throw createError({
      statusCode: 400,
      message: "프라이빗 저장소 테스트에는 액세스 토큰이 필요합니다."
    });
  }

  try {
    const output = await runGit(["ls-remote", "--symref", remoteUrl, "HEAD"]);
    const lines = output.split("\n").filter(Boolean);
    const headLine = lines.find((line) => line.startsWith("ref:"));
    const headRef = headLine?.split("\t")[0]?.replace("ref:", "").trim() ?? null;

    return {
      ok: true,
      headRef
    };
  } catch {
    throw createError({
      statusCode: 400,
      message: input.isPrivate
        ? "토큰으로 저장소 접근 테스트에 실패했습니다. 저장소 URL과 토큰 권한을 확인해주세요."
        : "저장소 접근 테스트에 실패했습니다. 저장소 URL 또는 접근 권한을 확인해주세요."
    });
  }
}

function normalizePath(filePath: string): string {
  return filePath.toLowerCase();
}

function matchesAny(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

function pickFirstByPriority(candidates: FileCandidate[], priorities: string[]): FileCandidate | null {
  for (const priority of priorities) {
    const found = candidates.find((candidate) => normalizePath(candidate.path).endsWith(priority));
    if (found) {
      return found;
    }
  }
  return null;
}

function getExtension(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function addSelected(
  selected: Map<string, string>,
  candidate: FileCandidate | null | undefined,
  summary: string
) {
  if (candidate && !selected.has(candidate.path)) {
    selected.set(candidate.path, summary);
  }
}

function selectSnippetFiles(candidates: FileCandidate[]) {
  const selected = new Map<string, string>();

  addSelected(selected, pickFirstByPriority(candidates, ["readme.md"]), "README 문서");
  addSelected(selected, pickFirstByPriority(candidates, MANIFEST_PRIORITY), "프로젝트 매니페스트");
  addSelected(
    selected,
    candidates.find((candidate) => matchesAny(candidate.path, ENTRYPOINT_PATTERNS)),
    "애플리케이션 엔트리포인트"
  );

  for (const slot of ENVIRONMENT_SLOT_PATTERNS) {
    if (selected.size >= 8) {
      break;
    }
    addSelected(
      selected,
      candidates.find((candidate) => matchesAny(candidate.path, slot.patterns)),
      slot.summary
    );
  }

  const remainingCodeFiles = candidates
    .filter((candidate) => !selected.has(candidate.path))
    .filter((candidate) => getExtension(candidate.path) && CODE_SLOT_EXTENSIONS.has(getExtension(candidate.path)))
    .filter((candidate) => candidate.size <= 64 * 1024)
    .sort((left, right) => {
      const leftPath = normalizePath(left.path);
      const rightPath = normalizePath(right.path);
      const leftScore = (leftPath.startsWith("src/") ? 0 : 2) + (matchesAny(leftPath, ENTRYPOINT_PATTERNS) ? 0 : 1);
      const rightScore = (rightPath.startsWith("src/") ? 0 : 2) + (matchesAny(rightPath, ENTRYPOINT_PATTERNS) ? 0 : 1);
      return leftScore - rightScore || left.size - right.size || left.path.localeCompare(right.path);
    })
    .slice(0, Math.max(0, 10 - selected.size));

  for (const candidate of remainingCodeFiles.slice(0, 2)) {
    addSelected(selected, candidate, "코드 구조 확인용 파일");
  }

  return selected;
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const output = await runGit(["ls-files"], rootDir);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function readFileSnippet(rootDir: string, relativePath: string): Promise<string | null> {
  try {
    const absolutePath = join(rootDir, relativePath);
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile() || stat.size > 64 * 1024) {
      return null;
    }

    const raw = await fs.readFile(absolutePath, "utf8");
    return trimSnippet(raw);
  } catch {
    return null;
  }
}

async function collectCommits(rootDir: string, limit: number): Promise<CommitInfo[]> {
  const format = ["%H", "%an", "%ae", "%aI", "%s", "%b"].join("%x1f");
  const raw = await runGit(["log", `--max-count=${limit}`, `--pretty=format:${format}%x1e`], rootDir);
  if (!raw) {
    return [];
  }

  return raw
    .split("\u001e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [commitHash, authorName, authorEmail, committedAt, title, body] = entry.split("\u001f");
      if (!commitHash || !authorName || !authorEmail || !committedAt || !title) {
        return [];
      }

      return {
        commitHash,
        authorName,
        authorEmail,
        committedAt: new Date(committedAt),
        title,
        body: body || null
      };
    });
}

export async function cloneAndScanRepository(input: {
  repositoryUrl: string;
  domain: string;
  isPrivate: boolean;
  accessToken?: string | null;
  commitLimit?: number;
}): Promise<CloneResult> {
  const cloneUrl = buildAuthenticatedGitUrl({
    repositoryUrl: input.repositoryUrl,
    domain: input.domain,
    accessToken: input.accessToken
  });

  if (input.isPrivate && !input.accessToken) {
    throw createError({
      statusCode: 400,
      message: `${input.domain} 도메인에 대한 액세스 토큰이 없어 프라이빗 저장소를 분석할 수 없습니다.`
    });
  }

  const cloneRoot = join(tmpdir(), "repo-atlas", randomUUID(), basename(input.repositoryUrl));
  await fs.mkdir(cloneRoot, { recursive: true });

  try {
    await runGit(["clone", "--depth", "50", cloneUrl, cloneRoot]);
  } catch (error) {
    throw createError({
      statusCode: 400,
      message:
        input.isPrivate
          ? "프라이빗 저장소 clone에 실패했습니다. 등록한 도메인 토큰을 확인해주세요."
          : "저장소 clone에 실패했습니다. 저장소 URL 또는 접근 권한을 확인해주세요."
    });
  }

  const paths = await collectFiles(cloneRoot);
  const candidates = await Promise.all(
    paths.map(async (path) => {
      try {
        const stat = await fs.stat(join(cloneRoot, path));
        return stat.isFile() ? { path, size: stat.size } : null;
      } catch {
        return null;
      }
    })
  );
  const snippetSelections = selectSnippetFiles(
    candidates.filter((candidate): candidate is FileCandidate => Boolean(candidate))
  );

  const files = await Promise.all(
    paths.map(async (path) => {
      const snippet = snippetSelections.has(path)
        ? await readFileSnippet(cloneRoot, path)
        : null;

      return {
        path,
        language: inferLanguageFromPath(path),
        isEntryPoint: isLikelyEntryPoint(path),
        isKeyFile: snippetSelections.has(path) || isLikelyKeyFile(path),
        summary: snippetSelections.get(path) ?? (isLikelyKeyFile(path) ? "분석용 메타 파일" : null),
        snippet
      };
    })
  );

  const analysisSnippets = files
    .filter((file) => snippetSelections.has(file.path) && file.snippet)
    .map((file) => ({
      path: file.path,
      snippet: file.snippet ?? ""
    }));

  const commits = await collectCommits(cloneRoot, input.commitLimit ?? 12);

  return {
    workspacePath: cloneRoot,
    fileTree: buildTreeLines(paths),
    files,
    analysisSnippets,
    commits,
    cleanup: async () => {
      await fs.rm(cloneRoot, {
        recursive: true,
        force: true
      });
    }
  };
}
