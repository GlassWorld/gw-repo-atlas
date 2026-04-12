<template>
  <div class="main-stack">
    <section class="hero">
      <div class="report-kicker">
        <div class="hero-copy">
          <span class="meta-pill">Git Registration</span>
          <h1 class="report-title">저장소 경로와 액세스 토큰을 함께 등록하고 관리합니다.</h1>
          <p>
            이제 연결 정보 등록 시 저장소 URL과 토큰을 함께 저장합니다.
            한 번 등록한 뒤에는 `저장소 관리` 메뉴에서 추가 입력 없이 바로 분석을 시작할 수 있습니다.
          </p>
        </div>
        <div class="chart-shell">
          <div class="dense-list">
            <div class="dense-list-item">연결 정보 하나에 저장소 URL과 토큰을 함께 저장합니다.</div>
            <div class="dense-list-item">프라이빗 저장소는 등록된 토큰으로 비대화형 clone 됩니다.</div>
            <div class="dense-list-item">저장된 연결 정보를 기준으로 저장소가 자동 등록됩니다.</div>
          </div>
        </div>
      </div>
    </section>

    <GitDomainForm />
  </div>
</template>
