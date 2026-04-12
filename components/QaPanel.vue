<script setup lang="ts">
const selectedAnalysisId = ref("");
const question = ref("");
const answer = ref("");
const citations = ref<Array<{ id: string; path: string; reason: string | null }>>([]);
const loading = ref(false);
const errorMessage = ref("");

const { data, pending } = await useFetch<{
  analyses: Array<{
    id: string;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
    projectTagline: string | null;
    projectSummary: string | null;
    createdAt: string;
    repository: {
      id: string;
      name: string;
      owner: string;
      url: string;
      domain: string;
      isPrivate: boolean;
    };
  }>;
}>("/api/analyses");

const { data: historyData, refresh: refreshHistory } = await useFetch<{
  qas: Array<{
    id: string;
    question: string;
    answer: string;
    createdAt: string;
    repository: {
      id: string;
      owner: string;
      name: string;
    };
    analysis: {
      id: string;
      status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
    };
    citations: Array<{
      id: string;
      path: string;
      reason: string | null;
    }>;
  }>;
}>("/api/qa");

const selectableAnalyses = computed(() =>
  (data.value?.analyses ?? []).filter((item) => item.status === "SUCCESS")
);

const selectedAnalysis = computed(() =>
  selectableAnalyses.value.find((item) => item.id === selectedAnalysisId.value) ?? null
);

watchEffect(() => {
  if (!selectedAnalysisId.value && selectableAnalyses.value.length > 0) {
    selectedAnalysisId.value = selectableAnalyses.value[0]?.id ?? "";
  }
});

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeData = "data" in error ? error.data : null;
    if (maybeData && typeof maybeData === "object" && "message" in maybeData && typeof maybeData.message === "string") {
      return maybeData.message;
    }

    if ("statusMessage" in error && typeof error.statusMessage === "string" && error.statusMessage) {
      return error.statusMessage;
    }

    if ("message" in error && typeof error.message === "string" && error.message) {
      return error.message;
    }
  }

  return fallback;
}

function normalizeMultilineText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
}

async function ask() {
  if (!selectedAnalysis.value) {
    errorMessage.value = "질문할 분석 결과를 먼저 선택해주세요.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch<{
      qa: {
        id: string;
        answer: string;
        citations: Array<{ id: string; path: string; reason: string | null }>;
      };
    }>("/api/qa", {
      method: "POST",
      body: {
        repositoryId: selectedAnalysis.value.repository.id,
        analysisId: selectedAnalysis.value.id,
        question: question.value
      }
    });

    answer.value = normalizeMultilineText(response.qa.answer);
    citations.value = response.qa.citations;
    await refreshHistory();
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "질문 처리에 실패했습니다.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <h2>Q&A</h2>
    <p>분석 완료된 결과를 선택한 뒤 질문하면, 관련 파일을 근거로 답변과 citation을 생성합니다.</p>

    <form class="form-stack" @submit.prevent="ask">
      <select v-model="selectedAnalysisId" class="input" :disabled="pending || selectableAnalyses.length === 0" required>
        <option value="" disabled>분석 결과를 선택하세요</option>
        <option v-for="item in selectableAnalyses" :key="item.id" :value="item.id">
          {{ item.repository.owner }}/{{ item.repository.name }} ·
          {{ item.projectTagline ?? "요약 없음" }} ·
          {{ new Date(item.createdAt).toLocaleString("ko-KR") }}
        </option>
      </select>

      <div v-if="selectedAnalysis" class="dense-list-item">
        <strong>{{ selectedAnalysis.repository.owner }}/{{ selectedAnalysis.repository.name }}</strong>
        <p class="muted" style="margin: 6px 0 0;">
          {{ selectedAnalysis.projectTagline ?? selectedAnalysis.projectSummary ?? "프로젝트 요약이 없습니다." }}
        </p>
      </div>

      <textarea
        v-model="question"
        class="textarea"
        placeholder="예: 이 프로젝트의 백엔드 엔트리 포인트는 어디인가요?"
        required
      />
      <button class="button" type="submit" :disabled="loading || !selectedAnalysis">
        {{ loading ? "답변 생성 중..." : "질문하기" }}
      </button>
    </form>

    <p v-if="pending" class="muted" style="margin-top: 16px;">분석 목록을 불러오는 중입니다.</p>
    <p v-else-if="!selectableAnalyses.length" class="muted" style="margin-top: 16px;">
      질문 가능한 분석 결과가 없습니다. 먼저 저장소 분석을 완료해주세요.
    </p>
    <p v-if="errorMessage" style="color: var(--danger); margin-top: 16px;">{{ errorMessage }}</p>

    <div v-if="answer" style="margin-top: 24px; display: grid; gap: 14px;">
      <h3>답변</h3>
      <p style="white-space: pre-wrap; margin: 0;">{{ answer }}</p>
      <div v-if="citations.length" class="citation-list">
        <span v-for="citation in citations" :key="citation.id" class="citation-chip">
          {{ citation.path }}<span v-if="citation.reason"> · {{ citation.reason }}</span>
        </span>
      </div>
    </div>

    <div style="margin-top: 28px; display: grid; gap: 14px;">
      <div class="panel-header" style="margin-bottom: 0;">
        <div>
          <h3>질문 / 답변 이력</h3>
          <p class="muted">최근 생성된 Q&A를 저장 순서대로 확인합니다.</p>
        </div>
      </div>

      <div v-if="!(historyData?.qas?.length)" class="dense-list-item">
        <p class="muted" style="margin: 0;">아직 저장된 질문 이력이 없습니다.</p>
      </div>

      <div v-for="item in historyData?.qas ?? []" :key="item.id" class="dense-list-item" style="display: grid; gap: 10px;">
        <div class="chart-caption">
          <strong>{{ item.repository.owner }}/{{ item.repository.name }}</strong>
          <span>{{ new Date(item.createdAt).toLocaleString("ko-KR") }}</span>
        </div>
        <div>
          <strong>질문</strong>
          <p style="margin: 6px 0 0; white-space: pre-wrap;">{{ item.question }}</p>
        </div>
        <div>
          <strong>답변</strong>
          <p style="margin: 6px 0 0; white-space: pre-wrap;">{{ item.answer }}</p>
        </div>
        <div v-if="item.citations.length" class="citation-list">
          <span v-for="citation in item.citations" :key="citation.id" class="citation-chip">
            {{ citation.path }}<span v-if="citation.reason"> · {{ citation.reason }}</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
