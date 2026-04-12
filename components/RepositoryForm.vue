<script setup lang="ts">
const errorMessage = ref("");
const successMessage = ref("");
const deletingId = ref<string | null>(null);
const analyzingId = ref<string | null>(null);

const { data, refresh } = await useFetch<{
  repositories: Array<{
    id: string;
    url: string;
    owner: string;
    name: string;
    domain: string;
    isPrivate: boolean;
    gitCredentialId: string | null;
    gitCredential: {
      id: string;
      domain: string;
      providerName: string;
      hasToken: boolean;
    } | null;
    lastAnalysisStatus: string | null;
    lastAnalysisId: string | null;
  }>;
}>("/api/repositories");

async function analyze(id: string) {
  analyzingId.value = id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch("/api/analyze", {
      method: "POST",
      body: { repositoryId: id }
    });

    successMessage.value = "분석 작업이 비동기로 시작되었습니다.";
    await refresh();
    await navigateTo("/analyses");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "분석 시작에 실패했습니다.";
  } finally {
    analyzingId.value = null;
  }
}

async function remove(id: string) {
  deletingId.value = id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch(`/api/repository/${id}`, {
      method: "DELETE"
    });

    successMessage.value = "저장소가 삭제되었습니다.";
    await refresh();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "저장소 삭제에 실패했습니다.";
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>저장소 관리</h2>
        <p class="muted">등록된 연결 정보를 기준으로 저장소 목록을 보여주며, 이 화면에서 바로 분석을 시작할 수 있습니다.</p>
      </div>
      <NuxtLink class="button secondary" to="/git-register">연결 정보 등록하러 가기</NuxtLink>
    </div>

    <p v-if="successMessage" style="color: var(--success); margin: 0 0 12px;">
      {{ successMessage }}
    </p>
    <p v-if="errorMessage" style="color: var(--danger); margin: 0 0 12px;">
      {{ errorMessage }}
    </p>

    <div class="dense-list">
      <div v-if="!(data?.repositories?.length)" class="dense-list-item">
        <p class="muted" style="margin: 0;">등록된 저장소가 없습니다. 먼저 Git 연결 정보를 등록해주세요.</p>
      </div>
      <div v-for="item in data?.repositories ?? []" :key="item.id" class="dense-list-item">
        <div class="toolbar" style="justify-content: space-between; align-items: start;">
          <div style="display: grid; gap: 6px;">
            <strong>{{ item.owner }}/{{ item.name }}</strong>
            <span class="mono muted">{{ item.url }}</span>
          </div>
          <div class="toolbar">
            <button
              class="button"
              type="button"
              :disabled="analyzingId === item.id"
              @click="analyze(item.id)"
            >
              {{ analyzingId === item.id ? "분석 시작 중..." : "분석 시작" }}
            </button>
            <button
              class="button secondary"
              type="button"
              :disabled="deletingId === item.id"
              @click="remove(item.id)"
            >
              {{ deletingId === item.id ? "삭제 중..." : "삭제" }}
            </button>
          </div>
        </div>
        <p class="muted" style="margin: 6px 0 0;">
          {{ item.domain }} · {{ item.isPrivate ? "Private" : "Public" }} ·
          {{ item.lastAnalysisStatus ?? "분석 이력 없음" }}
        </p>
        <p class="muted" style="margin: 6px 0 0;">
          {{
            item.gitCredential
              ? `${item.gitCredential.providerName} · ${item.gitCredential.domain} · ${item.gitCredential.hasToken ? "토큰 등록됨" : "토큰 없음"}`
              : "연결된 Git 정보 없음"
          }}
        </p>
        <div class="toolbar" style="margin-top: 10px;">
          <NuxtLink class="button secondary" to="/git-register">연결 정보 수정</NuxtLink>
          <NuxtLink
            v-if="item.lastAnalysisId"
            class="button secondary"
            :to="`/analysis/${item.lastAnalysisId}`"
          >
            최신 분석 보기
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
