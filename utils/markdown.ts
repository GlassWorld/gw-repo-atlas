import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

interface MarkdownHeading {
  level: number;
  title: string;
  id: string;
}

interface MarkdownRenderEnv {
  headings?: MarkdownHeading[];
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMarkdown(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
}

function slugifyHeading(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{}\\|;:'",.<>/?]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}

function createUniqueSlug(base: string, used: Map<string, number>) {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function renderTableOfContents(headings: MarkdownHeading[]) {
  const visibleHeadings = headings.filter((heading) => heading.level >= 1 && heading.level <= 4);

  if (!visibleHeadings.length) {
    return "";
  }

  return [
    '<nav class="markdown-toc" aria-label="문서 목차">',
    "<strong>목차</strong>",
    "<ol>",
    ...visibleHeadings.map((heading) =>
      `<li data-level="${heading.level}"><a href="#${heading.id}">${escapeHtml(heading.title)}</a></li>`
    ),
    "</ol>",
    "</nav>"
  ].join("");
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false
});

const defaultFenceRenderer = markdown.renderer.rules.fence;

markdown.core.ruler.push("repo_atlas_heading_anchors", (state) => {
  const env = state.env as MarkdownRenderEnv;
  const headings: MarkdownHeading[] = [];
  const usedSlugs = new Map<string, number>();

  for (let index = 0; index < state.tokens.length; index += 1) {
    const token = state.tokens[index];
    if (token.type !== "heading_open") {
      continue;
    }

    const titleToken = state.tokens[index + 1];
    if (!titleToken || titleToken.type !== "inline") {
      continue;
    }

    const level = Number(token.tag.replace("h", ""));
    const title = titleToken.content;
    const id = createUniqueSlug(slugifyHeading(title), usedSlugs);
    token.attrSet("id", id);
    headings.push({ level, title, id });
  }

  env.headings = headings;
});

markdown.renderer.rules.fence = (tokens: Token[], index, options, env, self) => {
  const token = tokens[index];
  const language = token.info.trim().split(/\s+/)[0]?.toLowerCase();

  if (language === "mermaid") {
    return `<pre class="mermaid" data-mermaid>${escapeHtml(token.content)}</pre>`;
  }

  return defaultFenceRenderer
    ? defaultFenceRenderer(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = tokens[index].attrGet("href") ?? "";

  if (/^https?:\/\//i.test(href)) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noreferrer");
  }

  return self.renderToken(tokens, index, options);
};

export function renderMarkdown(text: string) {
  const normalized = normalizeMarkdown(text);

  if (!normalized) {
    return "";
  }

  const env: MarkdownRenderEnv = {};
  const html = markdown.render(normalized, env);
  const toc = renderTableOfContents(env.headings ?? []);

  return html
    .replace(/<p>\s*\[\[toc]]\s*<\/p>/i, toc)
    .replace(/<p>\s*\[toc]\s*<\/p>/i, toc);
}
