<script setup lang="ts">
const runningRepositoryId = ref<string | null>(null);
const errorMessage = ref("");
const successMessage = ref("");

const { data, refresh } = await useFetch<{
  repositories: Array<{
    id: string;
    url: string;
    owner: string;
    name: string;
    domain: string;
    isPrivate: boolean;
    lastAnalysisStatus: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | null;
    lastAnalysisId: string | null;
  }>;
}>("/api/repositories");

const repositories = computed(() => data.value?.repositories ?? []);
const analyzedCount = computed(() => repositories.value.filter((item) => item.lastAnalysisId).length);
const runningCount = computed(() =>
  repositories.value.filter((item) => item.lastAnalysisStatus === "PENDING" || item.lastAnalysisStatus === "RUNNING").length
);

async function runRepositoryAnalysis(repositoryId: string) {
  runningRepositoryId.value = repositoryId;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch("/api/analyze", {
      method: "POST",
      body: { repositoryId }
    });

    successMessage.value = "분석 작업이 시작되었습니다. 같은 저장소의 기존 분석 결과를 갱신합니다.";
    await refresh();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "분석 시작에 실패했습니다.";
  } finally {
    runningRepositoryId.value = null;
  }
}

function isAnalysisBusy(status: string | null) {
  return status === "PENDING" || status === "RUNNING";
}
</script>

<template>
  <div class="main-stack">
    <section class="hero">
      <div class="report-kicker">
        <div class="hero-copy">
          <span class="meta-pill">Analysis</span>
          <h1 class="report-title">저장소별 분석 메뉴</h1>
          <p>
            저장소마다 하나의 최신 분석 상태를 유지합니다. 필요한 저장소만 실행하거나 재실행해서 결과를 갱신하세요.
          </p>
        </div>
        <div class="grid grid-3">
          <MetricCard label="Repositories" :value="repositories.length" note="등록된 저장소" />
          <MetricCard label="Analyzed" :value="analyzedCount" note="분석 결과 보유" />
          <MetricCard label="Running" :value="runningCount" note="진행 중 작업" />
        </div>
      </div>

      <div class="toolbar">
        <button class="button" type="button" @click="refresh">새로고침</button>
        <NuxtLink class="button secondary" to="/repositories">저장소 관리</NuxtLink>
      </div>

      <p v-if="successMessage" style="color: var(--success); margin: 0;">
        {{ successMessage }}
      </p>
      <p v-if="errorMessage" style="color: var(--danger); margin: 0;">
        {{ errorMessage }}
      </p>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>분석 대상</h2>
          <p class="muted">저장소별 현재 분석 상태와 실행 메뉴</p>
        </div>
      </div>

      <div class="dense-list">
        <div v-if="!repositories.length" class="dense-list-item">
          <p class="muted" style="margin: 0;">등록된 저장소가 없습니다. 먼저 저장소를 등록해주세요.</p>
        </div>

        <div v-for="item in repositories" :key="item.id" class="dense-list-item">
          <div class="toolbar" style="justify-content: space-between; align-items: start;">
            <div style="display: grid; gap: 6px; min-width: 0;">
              <strong>{{ item.owner }}/{{ item.name }}</strong>
              <span class="mono muted" style="overflow-wrap: anywhere;">{{ item.url }}</span>
            </div>
            <StatusBadge v-if="item.lastAnalysisStatus" :status="item.lastAnalysisStatus" />
            <span v-else class="meta-pill">분석 전</span>
          </div>

          <p class="muted" style="margin: 8px 0 0;">
            {{ item.domain }} · {{ item.isPrivate ? "Private" : "Public" }}
          </p>

          <div class="toolbar" style="margin-top: 10px;">
            <button
              class="button"
              type="button"
              :disabled="runningRepositoryId === item.id || isAnalysisBusy(item.lastAnalysisStatus)"
              @click="runRepositoryAnalysis(item.id)"
            >
              {{
                runningRepositoryId === item.id || isAnalysisBusy(item.lastAnalysisStatus)
                  ? "분석 진행 중..."
                  : item.lastAnalysisId
                    ? "재분석"
                    : "분석 시작"
              }}
            </button>
            <NuxtLink
              v-if="item.lastAnalysisId"
              class="button secondary"
              :to="`/analysis/${item.lastAnalysisId}`"
            >
              결과 보기
            </NuxtLink>
            <NuxtLink class="button secondary" :to="item.url" target="_blank">원본 저장소</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
