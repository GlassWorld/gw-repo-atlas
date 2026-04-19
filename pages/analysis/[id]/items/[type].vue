<script setup lang="ts">
import type { AnalysisDetail, AnalysisItemType } from "../../../../types/atlas";
import { getAnalysisItemDefinition, isAnalysisItemType } from "../../../../utils/analysis-items";

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
