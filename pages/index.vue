<script setup lang="ts">
const { data } = await useFetch<{
  dashboard: {
    metrics: {
      repositoryCount: number;
      privateRepositoryCount: number;
      analysisCount: number;
      successCount: number;
      runningCount: number;
      failedCount: number;
      gitDomainCount: number;
    };
    repositories: Array<{
      id: string;
      name: string;
      owner: string;
      domain: string;
      isPrivate: boolean;
      lastAnalysisStatus: string | null;
      lastAnalysisId: string | null;
    }>;
    recentAnalyses: Array<{
      id: string;
      status: string;
      projectTagline: string | null;
      createdAt: string;
      repositoryName: string;
      fileCount: number;
      commitCount: number;
    }>;
    gitDomains: Array<{
      id: string;
      domain: string;
      hasToken: boolean;
      isDefault: boolean;
    }>;
  };
}>("/api/dashboard");
</script>

<template>
  <div class="main-stack">
    <section class="hero">
      <div class="report-kicker">
        <div class="hero-copy">
          <span class="meta-pill">Analysis Dashboard</span>
          <h1 class="report-title">분석된 저장소 현황과 작업 흐름을 한 번에 확인합니다.</h1>
          <p>
            이 화면은 저장소별 통계와 최신 분석 현황을 보는 곳입니다. 새 분석은 `분석` 메뉴에서 저장소별로 실행하고,
            결과도 같은 메뉴에서 이어서 확인합니다.
          </p>
        </div>
        <div class="chart-shell">
          <div class="chart-caption">
            <strong>Operations Flow</strong>
            <span>register → async analyze → review</span>
          </div>
          <div class="dense-list">
            <div class="dense-list-item">1. Git 도메인/토큰 등록</div>
            <div class="dense-list-item">2. 저장소 URL 등록</div>
            <div class="dense-list-item">3. 분석 메뉴에서 저장소별 실행 및 결과 확인</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-4">
      <MetricCard label="Projects" :value="data?.dashboard.metrics.repositoryCount ?? 0" note="등록된 저장소" />
      <MetricCard label="Private" :value="data?.dashboard.metrics.privateRepositoryCount ?? 0" note="프라이빗 저장소" />
      <MetricCard label="Analyses" :value="data?.dashboard.metrics.analysisCount ?? 0" note="최신 분석 보유" />
      <MetricCard label="Git Domains" :value="data?.dashboard.metrics.gitDomainCount ?? 0" note="등록된 도메인" />
    </section>

    <section class="grid grid-3">
      <MetricCard label="Success" :value="data?.dashboard.metrics.successCount ?? 0" note="완료" />
      <MetricCard label="Running" :value="data?.dashboard.metrics.runningCount ?? 0" note="진행 중" />
      <MetricCard label="Failed" :value="data?.dashboard.metrics.failedCount ?? 0" note="실패" />
    </section>

    <section class="dashboard-grid">
      <aside class="sidebar-stack">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>등록된 Git 도메인</h2>
              <p class="muted">프라이빗 저장소 접근에 사용되는 자격증명</p>
            </div>
          </div>
          <div class="dense-list">
            <div v-for="item in data?.dashboard.gitDomains ?? []" :key="item.id" class="dense-list-item">
              <strong>{{ item.domain }}</strong>
              <p class="muted" style="margin: 4px 0 0;">
                {{ item.hasToken ? "토큰 등록됨" : "토큰 없음" }} · {{ item.isDefault ? "기본" : "보조" }}
              </p>
            </div>
          </div>
        </article>
      </aside>

      <section class="main-stack">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>프로젝트별 현황</h2>
              <p class="muted">등록된 저장소와 마지막 분석 상태</p>
            </div>
          </div>
          <div class="dense-list">
            <div v-for="item in data?.dashboard.repositories ?? []" :key="item.id" class="dense-list-item">
              <div class="toolbar" style="justify-content: space-between;">
                <strong>{{ item.owner }}/{{ item.name }}</strong>
                <StatusBadge v-if="item.lastAnalysisStatus" :status="item.lastAnalysisStatus as any" />
              </div>
              <p class="muted" style="margin: 6px 0 0;">
                {{ item.domain }} · {{ item.isPrivate ? "Private" : "Public" }}
              </p>
              <NuxtLink
                v-if="item.lastAnalysisId"
                class="button secondary"
                style="margin-top: 10px; display: inline-flex;"
                :to="`/analysis/${item.lastAnalysisId}`"
              >
                최신 분석 보기
              </NuxtLink>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>최신 분석</h2>
              <p class="muted">저장소별 최신 분석 결과</p>
            </div>
          </div>
          <div class="dense-list">
            <div v-for="item in data?.dashboard.recentAnalyses ?? []" :key="item.id" class="dense-list-item">
              <div class="toolbar" style="justify-content: space-between;">
                <strong>{{ item.repositoryName }}</strong>
                <StatusBadge :status="item.status as any" />
              </div>
              <p class="muted" style="margin: 6px 0 0;">
                {{ item.projectTagline ?? "요약 생성 전" }}
              </p>
              <p class="muted" style="margin: 6px 0 0;">
                {{ item.fileCount }} files · {{ item.commitCount }} commits ·
                {{ new Date(item.createdAt).toLocaleString("ko-KR") }}
              </p>
            </div>
          </div>
        </article>
      </section>
    </section>
  </div>
</template>
