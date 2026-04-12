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
  keyFiles: Array<{ path: string; snippet: string }>;
  commits: CommitInfo[];
  cleanup: () => Promise<void>;
}

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
  const files = await Promise.all(
    paths.map(async (path) => {
      const snippet = isLikelyKeyFile(path) || isLikelyEntryPoint(path)
        ? await readFileSnippet(cloneRoot, path)
        : null;

      return {
        path,
        language: inferLanguageFromPath(path),
        isEntryPoint: isLikelyEntryPoint(path),
        isKeyFile: isLikelyKeyFile(path),
        snippet
      };
    })
  );

  const keyFiles = files
    .filter((file) => file.isKeyFile && file.snippet)
    .slice(0, 10)
    .map((file) => ({
      path: file.path,
      snippet: file.snippet ?? ""
    }));

  const commits = await collectCommits(cloneRoot, input.commitLimit ?? 12);

  return {
    workspacePath: cloneRoot,
    fileTree: buildTreeLines(paths),
    files,
    keyFiles,
    commits,
    cleanup: async () => {
      await fs.rm(cloneRoot, {
        recursive: true,
        force: true
      });
    }
  };
}
