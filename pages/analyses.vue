<script setup lang="ts">
const { data, refresh } = await useFetch<{
  analyses: Array<{
    id: string;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
    projectTagline: string | null;
    projectSummary: string | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    repository: {
      id: string;
      name: string;
      owner: string;
      url: string;
      domain: string;
      isPrivate: boolean;
    };
    fileCount: number;
    commitCount: number;
    keyFileCount: number;
  }>;
}>("/api/analyses");
</script>

<template>
  <div class="main-stack">
    <section class="hero">
      <div class="report-kicker">
        <div class="hero-copy">
          <span class="meta-pill">Analysis History</span>
          <h1 class="report-title">비동기 분석 작업 결과를 목록으로 확인합니다.</h1>
          <p>
            진행 중인 작업 상태와 완료된 분석 결과를 여기서 확인하고, 필요한 경우 상세 리포트로 이동할 수 있습니다.
          </p>
        </div>
        <div class="toolbar" style="align-content: start;">
          <button class="button" type="button" @click="refresh">새로고침</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>분석 목록</h2>
          <p class="muted">저장소별 최근 실행 이력</p>
        </div>
      </div>
      <div class="dense-list">
        <div v-for="item in data?.analyses ?? []" :key="item.id" class="dense-list-item">
          <div class="toolbar" style="justify-content: space-between;">
            <strong>{{ item.repository.owner }}/{{ item.repository.name }}</strong>
            <StatusBadge :status="item.status" />
          </div>
          <p class="muted" style="margin: 6px 0 0;">
            {{ item.projectTagline ?? item.projectSummary ?? "분석 요약 생성 전" }}
          </p>
          <p class="muted" style="margin: 6px 0 0;">
            {{ item.fileCount }} files · {{ item.keyFileCount }} key files · {{ item.commitCount }} commits
          </p>
          <p class="muted" style="margin: 6px 0 0;">
            생성: {{ new Date(item.createdAt).toLocaleString("ko-KR") }}
            <span v-if="item.completedAt"> · 완료: {{ new Date(item.completedAt).toLocaleString("ko-KR") }}</span>
          </p>
          <p v-if="item.errorMessage" style="margin: 6px 0 0; color: var(--danger);">{{ item.errorMessage }}</p>
          <div class="toolbar" style="margin-top: 10px;">
            <NuxtLink class="button secondary" :to="`/analysis/${item.id}`">상세 분석 보기</NuxtLink>
            <NuxtLink class="button secondary" :to="item.repository.url" target="_blank">원본 저장소</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
