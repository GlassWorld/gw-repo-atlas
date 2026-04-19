<script setup lang="ts">
import type { AnalysisDetail } from "../../types/atlas";

const route = useRoute();
const analysisId = computed(() => route.params.id as string);
const isManualRefreshing = ref(false);

const { data, refresh, status } = await useFetch<{ analysis: AnalysisDetail }>(
  () => `/api/analysis/${analysisId.value}`,
  {
    key: () => `analysis-${analysisId.value}`
  }
);

const analysis = computed(() => data.value?.analysis);
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

async function refreshAnalysis() {
  isManualRefreshing.value = true;

  try {
    await refresh();
  } finally {
    isManualRefreshing.value = false;
  }
}

watchEffect(() => {
  if (analysis.value?.status === "PENDING" || analysis.value?.status === "RUNNING") {
    const timer = setTimeout(() => {
      void refresh();
    }, 2500);

    onWatcherCleanup(() => clearTimeout(timer));
  }
});
</script>

<template>
  <div v-if="analysis" class="analysis-detail-shell">
    <div v-if="isManualRefreshing" class="loading-mask">
      <div class="loading-mask-panel">
        <strong>분석 결과 새로고침 중</strong>
        <p class="muted">최신 상태를 다시 불러오고 있습니다.</p>
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
          <h1 class="report-title">{{ analysis.projectTagline ?? "저장소 분석 진행 중" }}</h1>
          <p>
            {{ analysis.projectSummary ?? "분석이 완료되면 프로젝트 목적, 기술 스택, 읽기 순서가 여기에 표시됩니다." }}
          </p>
        </div>

        <div class="chart-shell">
          <div class="chart-caption">
            <strong>Repository Snapshot</strong>
            <span class="mono">{{ analysis.repository.url }}</span>
          </div>
          <div class="grid grid-2">
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
        <button class="button" type="button" :disabled="isManualRefreshing" @click="refreshAnalysis">
          {{ isManualRefreshing ? "새로고침 중..." : "새로고침" }}
        </button>
      </div>

      <p v-if="analysis.errorMessage" style="margin: 0; color: var(--danger);">
        {{ analysis.errorMessage }}
      </p>
      </section>

      <section class="grid grid-4">
        <MetricCard
          v-for="metric in metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :note="metric.note"
        />
      </section>

      <section class="dashboard-grid">
        <aside class="sidebar-stack">
          <SummaryPanel title="추론된 기술 스택" :items="analysis.inferredStack" />
          <SummaryPanel title="엔트리 포인트" :items="analysis.entryPoints" />
        </aside>

        <section class="main-stack">
          <section class="grid grid-3">
            <LanguageDistributionChart :files="analysis.files" />
            <StructureRadarPanel :files="analysis.files" :commits="analysis.commits" />
            <CommitTimelineChart :commits="analysis.commits" />
          </section>

          <HealthScorePanel :score="analysis.healthScore" />

          <section class="grid grid-2">
            <CommitAuthorReportPanel :commits="analysis.commits" />
            <CommitHistoryPanel :commits="analysis.commits" />
          </section>
        </section>
      </section>
    </div>
  </div>

  <section v-else class="panel">
    <h2>분석 결과를 불러오는 중입니다.</h2>
    <p class="muted">현재 요청 상태: {{ status }}</p>
  </section>
</template>
