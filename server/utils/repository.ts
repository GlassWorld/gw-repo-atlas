export interface ParsedRepositoryUrl {
  owner: string;
  name: string;
  domain: string;
  normalizedUrl: string;
}

export function parseRepositoryUrl(rawUrl: string): ParsedRepositoryUrl {
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw createError({
      statusCode: 400,
      statusMessage: "HTTP(S) Git 저장소 URL만 지원합니다."
    });
  }

  const url = new URL(trimmed);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "유효한 GitHub 저장소 URL이 아닙니다."
    });
  }

  const owner = segments[0];
  const repositoryName = segments[1];
  if (!owner || !repositoryName) {
    throw createError({
      statusCode: 400,
      statusMessage: "유효한 GitHub 저장소 URL이 아닙니다."
    });
  }

  const name = repositoryName.replace(/\.git$/, "");

  return {
    owner,
    name,
    domain: url.hostname.toLowerCase(),
    normalizedUrl: `${url.protocol}//${url.hostname}/${owner}/${name}`
  };
}

export function buildAuthenticatedGitUrl(input: {
  repositoryUrl: string;
  domain: string;
  accessToken?: string | null;
}): string {
  if (!input.accessToken) {
    return input.repositoryUrl;
  }

  const target = new URL(input.repositoryUrl);
  const username = input.domain === "github.com" ? "x-access-token" : "oauth2";
  target.username = username;
  target.password = input.accessToken;
  return target.toString();
}

export function inferLanguageFromPath(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "TypeScript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "JavaScript";
  if (lower.endsWith(".vue")) return "Vue";
  if (lower.endsWith(".md")) return "Markdown";
  if (lower.endsWith(".json")) return "JSON";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "YAML";
  if (lower.endsWith(".java")) return "Java";
  if (lower.endsWith(".go")) return "Go";
  if (lower.endsWith(".py")) return "Python";
  if (lower.endsWith(".rb")) return "Ruby";
  if (lower.endsWith(".rs")) return "Rust";
  if (lower.endsWith(".php")) return "PHP";
  if (lower.endsWith(".kt")) return "Kotlin";
  if (lower.endsWith(".swift")) return "Swift";
  if (lower.endsWith(".sql")) return "SQL";
  return null;
}

export function isLikelyEntryPoint(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return [
    "main.ts",
    "main.js",
    "index.ts",
    "index.js",
    "app.vue",
    "server.ts",
    "server.js",
    "src/main.ts",
    "src/index.ts",
    "pages/index.vue",
    "nuxt.config.ts"
  ].some((candidate) => normalized.endsWith(candidate));
}

export function isLikelyKeyFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return [
    "readme.md",
    "package.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "tsconfig.json",
    "nuxt.config.ts",
    "prisma/schema.prisma",
    "docker-compose.yml"
  ].some((candidate) => normalized.endsWith(candidate));
}
