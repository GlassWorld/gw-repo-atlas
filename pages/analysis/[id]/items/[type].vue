<script setup lang="ts">
import type { AnalysisDetail, AnalysisItemType, DocsWikiDocument } from "../../../../types/atlas";
import { getAnalysisItemDefinition, isAnalysisItemType } from "../../../../utils/analysis-items";

type DocsTreeRow = {
  id: string;
  kind: "directory" | "document";
  label: string;
  path: string;
  depth: number;
  documentPath: string | null;
  open: boolean;
};

const route = useRoute();
const analysisId = computed(() => route.params.id as string);
const itemType = computed<AnalysisItemType | null>(() => {
  const value = route.params.type;
  return isAnalysisItemType(value) ? value : null;
});

const { data, status } = await useFetch<{ analysis: AnalysisDetail }>(
  () => `/api/analysis/${analysisId.value}`,
  {
    key: () => `analysis-item-${analysisId.value}-${itemType.value}`
  }
);

const analysis = computed(() => data.value?.analysis);
const snippetFiles = computed(() => analysis.value?.files.filter((file) => file.snippet) ?? []);
const artifact = computed(() =>
  itemType.value ? analysis.value?.artifacts.find((item) => item.type === itemType.value) ?? null : null
);
const itemResult = computed(() => artifact.value?.result ?? null);
const itemDefinition = computed(() =>
  itemType.value ? getAnalysisItemDefinition(itemType.value) : null
);
const itemTitle = computed(() => itemDefinition.value?.title ?? "분석 항목");
const itemDescription = computed(() => itemDefinition.value?.description ?? "지원하지 않는 분석 항목입니다.");
const docsSearchQuery = ref("");
const selectedDocsPath = ref<string | null>(null);
const docsReaderRef = ref<HTMLElement | null>(null);
const openDocsDirectories = ref<Set<string>>(new Set());
const docsWiki = computed(() => itemResult.value?.docsWiki ?? null);
const isDocsSearching = computed(() => Boolean(docsSearchQuery.value.trim()));
const filteredDocs = computed(() => {
  const documents = docsWiki.value?.documents ?? [];
  const query = docsSearchQuery.value.trim().toLowerCase();

  if (!query) {
    return documents;
  }

  return documents.filter((document) =>
    [document.path, document.title, document.text]
      .join(" ")
      .toLowerCase()
    .includes(query)
  );
});
const docsTreeRows = computed(() =>
  buildDocsTreeRows(filteredDocs.value, {
    openPaths: openDocsDirectories.value,
    forceOpen: isDocsSearching.value
  })
);
const selectedDocsDocument = computed(() =>
  filteredDocs.value.find((document) => document.path === selectedDocsPath.value)
    ?? filteredDocs.value[0]
    ?? null
);

watch(docsWiki, (value) => {
  selectedDocsPath.value = value?.documents[0]?.path ?? null;
  openDocsDirectories.value = new Set(value?.documents[0] ? getParentDirectoryPaths(value.documents[0].path) : []);
}, { immediate: true });

watch(filteredDocs, (documents) => {
  if (!documents.length) {
    selectedDocsPath.value = null;
    return;
  }

  if (!documents.some((document) => document.path === selectedDocsPath.value)) {
    selectedDocsPath.value = documents[0].path;
  }
});

function selectDocsDocument(path: string) {
  selectedDocsPath.value = path;
  openDocsDirectories.value = new Set([
    ...openDocsDirectories.value,
    ...getParentDirectoryPaths(path)
  ]);
}

function getParentDirectoryPaths(path: string) {
  const parts = path.split("/").filter(Boolean);
  const paths: string[] = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    paths.push(parts.slice(0, index + 1).join("/"));
  }

  return paths;
}

function toggleDocsDirectory(path: string) {
  const next = new Set(openDocsDirectories.value);

  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }

  openDocsDirectories.value = next;
}

function buildDocsTreeRows(
  documents: DocsWikiDocument[],
  options: {
    openPaths: Set<string>;
    forceOpen: boolean;
  }
): DocsTreeRow[] {
  const rows = new Map<string, DocsTreeRow>();
  const children = new Map<string, string[]>();

  function addChild(parentPath: string, childPath: string) {
    const current = children.get(parentPath) ?? [];
    if (!current.includes(childPath)) {
      current.push(childPath);
    }
    children.set(parentPath, current);
  }

  for (const document of documents) {
    const parts = document.path.split("/").filter(Boolean);

    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      const parentPath = parts.slice(0, index).join("/");
      const isDocument = index === parts.length - 1;

      if (!rows.has(path)) {
        rows.set(path, {
          id: `${isDocument ? "document" : "directory"}:${path}`,
          kind: isDocument ? "document" : "directory",
          label: isDocument ? document.title : part,
          path,
          depth: index,
          documentPath: isDocument ? document.path : null,
          open: isDocument || options.forceOpen || options.openPaths.has(path)
        });
      }

      addChild(parentPath, path);
    });
  }

  const output: DocsTreeRow[] = [];

  function visit(parentPath: string) {
    const childRows = (children.get(parentPath) ?? [])
      .map((path) => rows.get(path))
      .filter((row): row is DocsTreeRow => Boolean(row))
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "directory" ? -1 : 1;
        }

        return left.label.localeCompare(right.label, "ko-KR") || left.path.localeCompare(right.path);
      });

    for (const row of childRows) {
      output.push(row);
      if (row.kind === "directory" && row.open) {
        visit(row.path);
      }
    }
  }

  visit("");
  return output;
}

function normalizeDocsPath(path: string) {
  const parts: string[] = [];

  for (const part of path.split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      parts.pop();
      continue;
    }

    parts.push(part);
  }

  return parts.join("/");
}

function resolveDocsLinkPath(href: string) {
  const current = selectedDocsDocument.value;
  if (!current || !href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return null;
  }

  const withoutHash = href.split("#")[0] ?? "";
  if (!withoutHash) {
    return null;
  }

  const baseDirectory = current.directory === "." ? "" : current.directory;
  const candidate = withoutHash.startsWith("/")
    ? withoutHash.replace(/^\/+/, "")
    : normalizeDocsPath(`${baseDirectory}/${withoutHash}`);

  if (docsWiki.value?.documents.some((document) => document.path === candidate)) {
    return candidate;
  }

  const markdownCandidate = candidate.endsWith(".md") ? candidate : `${candidate}.md`;
  return docsWiki.value?.documents.some((document) => document.path === markdownCandidate)
    ? markdownCandidate
    : null;
}

function handleDocsMarkdownClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target.closest("a") : null;
  if (!target) {
    return;
  }

  const href = target.getAttribute("href") ?? "";
  const resolvedPath = resolveDocsLinkPath(href);
  if (!resolvedPath) {
    return;
  }

  event.preventDefault();
  selectDocsDocument(resolvedPath);
}

async function renderMermaidBlocks() {
  if (import.meta.server) {
    return;
  }

  await nextTick();
  const nodes = Array.from(docsReaderRef.value?.querySelectorAll<HTMLElement>(".mermaid[data-mermaid]") ?? []);
  if (!nodes.length) {
    return;
  }

  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict"
    });
    await mermaid.run({ nodes });
  } catch (error) {
    console.warn("[RepoAtlas] Mermaid render failed", error);
  }
}

watch(selectedDocsDocument, () => {
  void renderMermaidBlocks();
}, { immediate: true });
</script>

<template>
  <div v-if="analysis" class="main-stack">
    <section class="hero">
      <div class="toolbar">
        <NuxtLink class="button secondary" :to="`/analysis/${analysis.id}`">분석으로 돌아가기</NuxtLink>
        <span class="meta-pill">{{ analysis.repository.owner }}/{{ analysis.repository.name }}</span>
      </div>
      <h1 class="report-title">{{ itemTitle }}</h1>
      <p class="muted">{{ itemDescription }}</p>
      <p class="muted">{{ analysis.repository.url }}</p>
    </section>

    <section v-if="!itemType" class="panel">
      <h2>지원하지 않는 분석 항목입니다.</h2>
      <p class="muted">분석 화면에서 제공되는 항목을 다시 선택해주세요.</p>
    </section>

    <section v-else-if="artifact?.status !== 'SUCCESS'" class="panel">
      <div class="panel-header">
        <div>
          <h2>항목 분석 대기 중</h2>
          <p class="muted">상세 결과는 항목 분석이 완료된 뒤 표시됩니다.</p>
        </div>
        <StatusBadge :status="artifact?.status ?? 'PENDING'" />
      </div>
      <p v-if="artifact?.errorMessage" style="margin: 0; color: var(--danger);">
        {{ artifact.errorMessage }}
      </p>
      <NuxtLink class="button" :to="`/analysis/${analysis.id}`">분석 항목으로 돌아가기</NuxtLink>
    </section>

    <section v-else-if="itemResult" class="panel">
      <div class="panel-header">
        <div>
          <h2>항목 분석 결과</h2>
          <p class="muted">{{ artifact?.completedAt ? new Date(artifact.completedAt).toLocaleString("ko-KR") : "" }}</p>
        </div>
        <StatusBadge :status="artifact.status" />
      </div>
      <p>{{ itemResult.summary }}</p>

      <div v-if="itemResult.sections.length" class="dense-list" style="margin-top: 12px;">
        <div v-for="section in itemResult.sections" :key="section.title" class="dense-list-item">
          <strong>{{ section.title }}</strong>
          <p style="margin: 6px 0 0;">{{ section.body }}</p>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top: 12px;">
        <SummaryPanel title="발견 사항" :items="itemResult.findings" />
        <SummaryPanel title="개선 제안" :items="itemResult.suggestions" />
        <SummaryPanel
          title="근거"
          :items="itemResult.evidence.map((entry) => `${entry.label}: ${entry.value}`)"
        />
      </div>
    </section>

    <HealthScorePanel v-if="artifact?.status === 'SUCCESS' && itemType === 'health'" :score="analysis.healthScore" />

    <section v-else-if="artifact?.status === 'SUCCESS' && itemType === 'docs'" class="docs-wiki-shell">
      <section class="panel docs-wiki-sidebar">
        <div class="panel-header">
          <div>
            <h2>Docs Wiki</h2>
            <p class="muted">
              {{ docsWiki?.documents.length ?? 0 }}개 문서 · {{ docsWiki?.rootPath ?? "docs" }}
            </p>
          </div>
        </div>
        <input
          v-model="docsSearchQuery"
          class="input"
          type="search"
          placeholder="문서 검색"
        >
        <div v-if="docsTreeRows.length" class="docs-tree" role="tree">
          <div
            v-for="row in docsTreeRows"
            :key="row.id"
            class="docs-tree-row"
            :class="`docs-tree-${row.kind}`"
            :data-active="selectedDocsDocument?.path === row.documentPath"
            :style="{ paddingLeft: `${10 + row.depth * 16}px` }"
            role="treeitem"
          >
            <button
              v-if="row.kind === 'directory'"
              class="docs-tree-label"
              type="button"
              :aria-expanded="row.open"
              @click="toggleDocsDirectory(row.path)"
            >
              <span class="docs-tree-caret" :data-open="row.open" aria-hidden="true">▸</span>
              <span>{{ row.label }}</span>
            </button>
            <button
              v-else
              class="docs-tree-document-button"
              type="button"
              @click="selectDocsDocument(row.documentPath ?? row.path)"
            >
              <span aria-hidden="true">◇</span>
              <span>{{ row.label }}</span>
            </button>
          </div>
        </div>
        <p v-else class="muted">검색 결과가 없습니다.</p>
      </section>

      <section class="panel docs-wiki-reader">
        <div v-if="selectedDocsDocument" class="main-stack">
          <div class="panel-header">
            <div>
              <h2>{{ selectedDocsDocument.title }}</h2>
              <p class="muted mono">{{ selectedDocsDocument.path }}</p>
            </div>
            <span class="meta-pill">{{ selectedDocsDocument.directory }}</span>
          </div>
          <div
            ref="docsReaderRef"
            class="markdown-body"
            @click="handleDocsMarkdownClick"
            v-html="selectedDocsDocument.html"
          />
        </div>
        <div v-else>
          <h2>표시할 문서가 없습니다.</h2>
          <p class="muted">docs 하위에 Markdown 문서를 추가한 뒤 다시 분석해주세요.</p>
        </div>
      </section>

      <section v-if="docsWiki?.tree.length || docsWiki?.skipped.length" class="panel docs-wiki-meta">
        <div v-if="docsWiki?.tree.length">
          <h2>디렉토리 구조</h2>
          <pre class="file-tree">{{ docsWiki.tree.join("\n") }}</pre>
        </div>
        <div v-if="docsWiki?.skipped.length">
          <h2>변환 제외</h2>
          <div class="dense-list">
            <div v-for="entry in docsWiki.skipped" :key="entry.path" class="dense-list-item">
              <strong class="mono">{{ entry.path }}</strong>
              <p class="muted" style="margin: 6px 0 0;">{{ entry.reason }}</p>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section v-else-if="artifact?.status === 'SUCCESS' && itemType === 'structure'" class="main-stack">
      <section class="grid grid-2">
        <LanguageDistributionChart :files="analysis.files" />
        <StructureRadarPanel :files="analysis.files" :commits="analysis.commits" />
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>분석용 스니펫</h2>
            <p class="muted">프로젝트 판단에 사용된 주요 파일 일부</p>
          </div>
        </div>
        <div class="dense-list">
          <div v-for="file in snippetFiles" :key="file.id" class="dense-list-item">
            <strong class="mono">{{ file.path }}</strong>
            <p class="muted" style="margin: 6px 0 0;">{{ file.summary ?? "분석용 스니펫" }}</p>
            <pre class="file-tree" style="margin: 10px 0 0;">{{ file.snippet }}</pre>
          </div>
        </div>
      </section>
    </section>

    <section v-else-if="artifact?.status === 'SUCCESS' && itemType === 'commits'" class="main-stack">
      <section class="grid grid-2">
        <CommitTimelineChart :commits="analysis.commits" />
        <CommitAuthorReportPanel :commits="analysis.commits" />
      </section>
      <CommitHistoryPanel :commits="analysis.commits" />
    </section>

    <section v-else-if="artifact?.status === 'SUCCESS'" class="panel">
      <h2>지원하지 않는 분석 항목입니다.</h2>
    </section>
  </div>

  <section v-else class="panel">
    <h2>분석 항목을 불러오는 중입니다.</h2>
    <p class="muted">현재 요청 상태: {{ status }}</p>
  </section>
</template>
