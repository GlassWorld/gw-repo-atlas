<script setup lang="ts">
import type { AnalysisDetail, AnalysisItemType } from "../../../types/atlas";
import { buildAnalysisGroups, buildAnalysisItems } from "../../../utils/analysis-items";

const route = useRoute();
const analysisId = computed(() => route.params.id as string);
const isManualRefreshing = ref(false);
const isRerunningBaseAnalysis = ref(false);
const itemLoading = ref<AnalysisItemType | null>(null);
const itemError = ref("");

const { data, refresh, status } = await useFetch<{ analysis: AnalysisDetail }>(
  () => `/api/analysis/${analysisId.value}`,
  {
    key: () => `analysis-${analysisId.value}`
  }
);

const analysis = computed(() => data.value?.analysis);
const isBaseAnalyzing = computed(() =>
  analysis.value?.status === "PENDING" || analysis.value?.status === "RUNNING"
);

const metrics = computed(() => {
  const value = analysis.value;
  if (!value) {
    return [];
  }

  return [
    { label: "Files", value: value.files.length, note: "Indexed file paths" },
    { label: "Entry Points", value: value.entryPoints.length, note: "Detected bootstrap files" },
    { label: "Commits", value: value.commits.length, note: "Recent activity sample" }
  ];
});

const analysisItems = computed(() => {
  const value = analysis.value;
  if (!value) {
    return [];
  }

  return buildAnalysisItems(value);
});

const analysisGroups = computed(() => buildAnalysisGroups(analysisItems.value));
const hasRunningItem = computed(() => analysisItems.value.some((item) => item.running));
const shouldPollAnalysis = computed(() =>
  isBaseAnalyzing.value || hasRunningItem.value || itemLoading.value !== null || isRerunningBaseAnalysis.value
);
const isPollingRefresh = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function refreshAnalysis() {
  isManualRefreshing.value = true;

  try {
    await refresh();
  } finally {
    isManualRefreshing.value = false;
  }
}

async function runItem(type: AnalysisItemType) {
  itemLoading.value = type;
  itemError.value = "";

  try {
    await $fetch(`/api/analysis/${analysisId.value}/items`, {
      method: "POST",
      body: { type }
    });

    await refresh();
  } catch (error) {
    itemError.value = getRequestErrorMessage(error, "항목 분석 요청에 실패했습니다.");
  } finally {
    itemLoading.value = null;
  }
}

async function rerunBaseAnalysis() {
  const value = analysis.value;
  if (!value) {
    return;
  }

  isRerunningBaseAnalysis.value = true;
  itemError.value = "";

  try {
    await $fetch("/api/analyze", {
      method: "POST",
      body: {
        repositoryId: value.repository.id
      }
    });

    await refresh();
  } catch (error) {
    itemError.value = getRequestErrorMessage(error, "기본 분석 재실행 요청에 실패했습니다.");
  } finally {
    isRerunningBaseAnalysis.value = false;
  }
}

async function pollAnalysis() {
  if (isPollingRefresh.value) {
    return;
  }

  isPollingRefresh.value = true;

  try {
    await refresh();
  } finally {
    isPollingRefresh.value = false;
  }
}

function isItemActive(type: AnalysisItemType, completed: boolean) {
  return completed;
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string; statusMessage?: string } }).data;
    return data?.message || data?.statusMessage || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function getItemStatusLabel(item: { completed: boolean; running: boolean; artifact: { status: string; errorMessage: string | null } | null }) {
  if (item.running) {
    return "🔄 진행 중";
  }
  if (item.completed) {
    return "✅ 완료";
  }
  if (item.artifact?.status === "FAILED") {
    return "⚠️ 실패";
  }
  return "😐 대기";
}

function getItemStatusClass(item: { completed: boolean; running: boolean; artifact: { status: string; errorMessage: string | null } | null }) {
  if (item.running) {
    return "analysis-item-status-running";
  }
  if (item.completed) {
    return "analysis-item-status-success";
  }
  if (item.artifact?.status === "FAILED") {
    return "analysis-item-status-failed";
  }
  return "analysis-item-status-pending";
}

function getItemCardClass(item: { completed: boolean; running: boolean; artifact: { status: string; errorMessage: string | null } | null }) {
  if (item.running) {
    return "analysis-item-card-running";
  }
  if (item.completed) {
    return "analysis-item-card-success";
  }
  if (item.artifact?.status === "FAILED") {
    return "analysis-item-card-failed";
  }
  return "analysis-item-card-pending";
}

function startAnalysisPolling() {
  if (pollTimer || !import.meta.client) {
    return;
  }

  pollTimer = setInterval(() => {
    void pollAnalysis();
  }, 1800);
}

function stopAnalysisPolling() {
  if (!pollTimer) {
    return;
  }

  clearInterval(pollTimer);
  pollTimer = null;
}

watch(shouldPollAnalysis, (shouldPoll) => {
  if (!import.meta.client) {
    return;
  }

  if (shouldPoll) {
    startAnalysisPolling();
    void pollAnalysis();
  } else {
    stopAnalysisPolling();
  }
}, {
  immediate: true
});

onBeforeUnmount(() => {
  stopAnalysisPolling();
});
</script>

<template>
  <div v-if="analysis" class="analysis-detail-shell">
    <div v-if="isManualRefreshing || isBaseAnalyzing || isRerunningBaseAnalysis" class="loading-mask">
      <div class="loading-mask-panel">
        <div class="loading-visual" aria-hidden="true">
          <span class="loading-ring"></span>
          <span class="loading-scan"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </div>
        <strong>{{ isBaseAnalyzing || isRerunningBaseAnalysis ? "기본 분석 진행 중" : "분석 결과 새로고침 중" }}</strong>
        <p class="muted">
          {{
            isBaseAnalyzing || isRerunningBaseAnalysis
              ? "저장소를 스캔하고 프로젝트 개요를 생성하고 있습니다."
              : "최신 상태를 다시 불러오고 있습니다."
          }}
        </p>
      </div>
    </div>

    <div class="main-stack">
      <section class="hero">
        <div class="report-kicker">
          <div class="hero-copy">
            <div class="toolbar">
              <span class="meta-pill">{{ analysis.repository.owner }}/{{ analysis.repository.name }}</span>
              <StatusBadge :status="analysis.status" />
            </div>
            <h1 class="report-title">{{ analysis.repository.owner }}/{{ analysis.repository.name }}</h1>
            <p>
              {{ analysis.projectSummary ?? "기본 분석이 완료되면 프로젝트 개요가 여기에 표시됩니다." }}
            </p>
          </div>

          <div class="chart-shell">
            <div class="chart-caption">
              <strong>Repository Snapshot</strong>
              <span class="mono">{{ analysis.repository.url }}</span>
            </div>
            <div class="grid grid-3">
              <MetricCard
                v-for="metric in metrics"
                :key="metric.label"
                :label="metric.label"
                :value="metric.value"
                :note="metric.note"
              />
            </div>
          </div>
        </div>

        <div class="toolbar">
          <NuxtLink class="button secondary" :to="analysis.repository.url" target="_blank">원본 저장소 열기</NuxtLink>
          <button
            class="button secondary"
            type="button"
            :disabled="isBaseAnalyzing || isRerunningBaseAnalysis"
            @click="rerunBaseAnalysis"
          >
            {{ isBaseAnalyzing || isRerunningBaseAnalysis ? "기본 분석 요청 중..." : "기본 분석 재실행" }}
          </button>
          <button class="button" type="button" :disabled="isManualRefreshing" @click="refreshAnalysis">
            {{ isManualRefreshing ? "새로고침 중..." : "새로고침" }}
          </button>
        </div>

        <p v-if="analysis.errorMessage" style="margin: 0; color: var(--danger);">
          {{ analysis.errorMessage }}
        </p>
        <p v-if="itemError" style="margin: 0; color: var(--danger);">
          {{ itemError }}
        </p>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>분석 요약</h2>
            <p class="muted">현재 완료되어 상세 확인이 가능한 항목</p>
          </div>
        </div>
        <div class="dense-list">
          <div
            v-for="item in analysisItems.filter((entry) => isItemActive(entry.type, entry.completed))"
            :key="item.type"
            class="dense-list-item"
          >
            <strong>{{ item.title }}</strong>
            <p class="muted" style="margin: 6px 0 0;">{{ item.summary }}</p>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>분석 항목</h2>
            <p class="muted">필요한 항목을 실행하면 상세 페이지가 활성화됩니다.</p>
          </div>
        </div>

        <div class="analysis-group-stack">
          <section v-for="group in analysisGroups" :key="group.id" class="analysis-group">
            <div class="chart-caption">
              <strong>{{ group.title }}</strong>
              <span>{{ group.description }}</span>
            </div>

            <div class="analysis-item-grid">
              <article
                v-for="item in group.items"
                :key="item.type"
                class="analysis-item-card"
                :class="getItemCardClass(item)"
              >
                <div v-if="itemLoading === item.type || item.running" class="analysis-item-mask">
                  <div class="loading-compact" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <strong>분석 중</strong>
                </div>

                <div class="toolbar" style="justify-content: space-between;">
                  <strong class="analysis-item-title">
                    <span v-if="item.completed" aria-hidden="true">✅</span>
                    <span v-else-if="item.running" aria-hidden="true">🔄</span>
                    <span v-else-if="item.artifact?.status === 'FAILED'" aria-hidden="true">⚠️</span>
                    <span v-else aria-hidden="true">😐</span>
                    {{ item.title }}
                  </strong>
                  <span class="analysis-item-status" :class="getItemStatusClass(item)">
                    {{ getItemStatusLabel(item) }}
                  </span>
                </div>
                <p class="muted" style="margin: 8px 0 0;">{{ item.description }}</p>
                <p style="margin: 10px 0 0;">{{ item.summary }}</p>
                <p v-if="item.artifact?.errorMessage" style="margin: 10px 0 0; color: var(--danger);">
                  {{ item.artifact.errorMessage }}
                </p>

                <div class="toolbar" style="margin-top: 12px;">
                  <button
                    class="button"
                    type="button"
                    :disabled="!item.ready || itemLoading === item.type || item.running"
                    @click="runItem(item.type)"
                  >
                    {{ itemLoading === item.type || item.running ? "분석 중..." : item.completed ? "다시 분석" : "분석 실행" }}
                  </button>
                  <NuxtLink
                    v-if="isItemActive(item.type, item.completed)"
                    class="button secondary"
                    :to="`/analysis/${analysis.id}/items/${item.type}`"
                  >
                    상세 보기
                  </NuxtLink>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>

  <section v-else class="panel">
    <h2>분석 결과를 불러오는 중입니다.</h2>
    <p class="muted">현재 요청 상태: {{ status }}</p>
  </section>
</template>
