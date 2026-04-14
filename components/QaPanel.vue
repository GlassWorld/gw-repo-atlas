<script setup lang="ts">
import { renderMarkdown } from "../utils/markdown";

const selectedAnalysisId = ref("");
const question = ref("");
const loading = ref(false);
const errorMessage = ref("");
const isAskModalOpen = ref(false);
const selectedQaId = ref<string | null>(null);

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

const selectedQa = computed(() =>
  (historyData.value?.qas ?? []).find((item) => item.id === selectedQaId.value) ?? null
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

function summarizeText(text: string, maxLength = 120) {
  const normalized = normalizeMultilineText(text).replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function renderAnswerHtml(text: string) {
  return renderMarkdown(normalizeMultilineText(text));
}

function openAskModal() {
  if (!selectableAnalyses.value.length) {
    return;
  }

  errorMessage.value = "";
  question.value = "";
  isAskModalOpen.value = true;
}

function closeAskModal() {
  if (loading.value) {
    return;
  }

  isAskModalOpen.value = false;
  errorMessage.value = "";
  question.value = "";
}

function openDetailModal(qaId: string) {
  selectedQaId.value = qaId;
}

function closeDetailModal() {
  selectedQaId.value = null;
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

    await refreshHistory();
    isAskModalOpen.value = false;
    question.value = "";
    selectedQaId.value = response.qa.id;
  } catch (error) {
    errorMessage.value = getErrorMessage(error, "질문 처리에 실패했습니다.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>Q&A</h2>
        <p class="muted">저장된 질문 이력을 목록으로 보고, 상세 내용은 모달에서 확인합니다.</p>
      </div>
      <button class="button" type="button" :disabled="pending || !selectableAnalyses.length" @click="openAskModal">
        새 질문
      </button>
    </div>

    <div class="grid grid-3" style="margin-bottom: 16px;">
      <div class="metric-card">
        <span class="metric-label">질문 가능 분석</span>
        <strong class="metric-value">{{ selectableAnalyses.length }}</strong>
        <span class="muted">성공적으로 완료된 분석만 선택할 수 있습니다.</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">저장된 Q&A</span>
        <strong class="metric-value">{{ historyData?.qas?.length ?? 0 }}</strong>
        <span class="muted">최근 질문과 답변을 목록으로 확인할 수 있습니다.</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">동작 방식</span>
        <strong class="metric-value">Modal</strong>
        <span class="muted">질문 작성과 상세 확인을 각각 모달로 분리했습니다.</span>
      </div>
    </div>

    <p v-if="pending" class="muted" style="margin-top: 0;">분석 목록을 불러오는 중입니다.</p>
    <p v-else-if="!selectableAnalyses.length" class="muted" style="margin-top: 0;">
      질문 가능한 분석 결과가 없습니다. 먼저 저장소 분석을 완료해주세요.
    </p>

    <div class="panel-header" style="margin-bottom: 0;">
      <div>
        <h3>질문 / 답변 목록</h3>
        <p class="muted">질문을 선택하면 질문 원문, 답변 전문, citation을 상세 모달에서 보여줍니다.</p>
      </div>
    </div>

    <div v-if="!(historyData?.qas?.length)" class="dense-list-item" style="margin-top: 14px;">
      <p class="muted" style="margin: 0;">아직 저장된 질문 이력이 없습니다. 우측 상단의 `새 질문` 버튼으로 첫 질문을 남겨보세요.</p>
    </div>

    <div v-else class="dense-list" style="margin-top: 14px;">
      <div v-for="item in historyData?.qas ?? []" :key="item.id" class="dense-list-item" style="display: grid; gap: 10px;">
        <div class="chart-caption" style="margin-bottom: 0;">
          <strong>{{ item.repository.owner }}/{{ item.repository.name }}</strong>
          <span>{{ new Date(item.createdAt).toLocaleString("ko-KR") }}</span>
        </div>

        <div style="display: grid; gap: 6px;">
          <strong>{{ summarizeText(item.question, 90) }}</strong>
          <p class="muted" style="margin: 0;">{{ summarizeText(item.answer, 150) }}</p>
        </div>

        <div class="toolbar" style="justify-content: space-between; align-items: center;">
          <span class="muted">citation {{ item.citations.length }}건</span>
          <button class="button secondary" type="button" @click="openDetailModal(item.id)">
            상세 보기
          </button>
        </div>
      </div>
    </div>

    <div v-if="isAskModalOpen" class="modal-backdrop" @click.self="closeAskModal">
      <div class="modal-panel">
        <div class="panel-header" style="margin-bottom: 16px;">
          <div>
            <h3>새 질문</h3>
            <p class="muted" style="margin: 6px 0 0;">
              분석 완료된 결과를 선택한 뒤 질문하면, 관련 파일을 근거로 답변과 citation을 생성합니다.
            </p>
          </div>
          <button class="button secondary" type="button" :disabled="loading" @click="closeAskModal">
            닫기
          </button>
        </div>

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

          <div class="toolbar">
            <button class="button" type="submit" :disabled="loading || !selectedAnalysis || !question.trim()">
              {{ loading ? "답변 생성 중..." : "질문하기" }}
            </button>
            <button class="button secondary" type="button" :disabled="loading" @click="closeAskModal">
              취소
            </button>
          </div>

          <p v-if="errorMessage" style="margin: 0; color: var(--danger);">{{ errorMessage }}</p>
        </form>
      </div>
    </div>

    <div v-if="selectedQa" class="modal-backdrop" @click.self="closeDetailModal">
      <div class="modal-panel" style="width: min(820px, 100%);">
        <div class="panel-header" style="margin-bottom: 16px;">
          <div>
            <h3>질문 상세</h3>
            <p class="muted" style="margin: 6px 0 0;">
              {{ selectedQa.repository.owner }}/{{ selectedQa.repository.name }} ·
              {{ new Date(selectedQa.createdAt).toLocaleString("ko-KR") }}
            </p>
          </div>
          <button class="button secondary" type="button" @click="closeDetailModal">
            닫기
          </button>
        </div>

        <div class="form-stack">
          <div class="dense-list-item">
            <strong>질문</strong>
            <p style="margin: 8px 0 0; white-space: pre-wrap;">{{ selectedQa.question }}</p>
          </div>

          <div class="dense-list-item">
            <strong>답변</strong>
            <div class="markdown-body" style="margin-top: 8px;" v-html="renderAnswerHtml(selectedQa.answer)" />
          </div>

          <div class="dense-list-item">
            <div class="chart-caption" style="margin-bottom: 8px;">
              <strong>관련 파일</strong>
              <span>총 {{ selectedQa.citations.length }}건</span>
            </div>
            <div v-if="selectedQa.citations.length" class="citation-list">
              <span v-for="citation in selectedQa.citations" :key="citation.id" class="citation-chip">
                {{ citation.path }}<span v-if="citation.reason"> · {{ citation.reason }}</span>
              </span>
            </div>
            <p v-else class="muted" style="margin: 0;">저장된 citation이 없습니다.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
