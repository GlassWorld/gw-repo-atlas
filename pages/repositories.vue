<template>
  <div class="main-stack">
    <section class="hero">
      <div class="report-kicker">
        <div class="hero-copy">
          <span class="meta-pill">Repository Management</span>
          <h1 class="report-title">등록된 저장소를 관리하고 필요할 때마다 분석을 실행합니다.</h1>
          <p>
            저장소는 한 번만 등록하고, 이후에는 목록에서 바로 분석을 비동기로 시작합니다.
            결과는 `분석 내역` 메뉴에서 확인합니다.
          </p>
        </div>
        <div class="chart-shell">
          <div class="dense-list">
            <div class="dense-list-item">저장소 등록은 모달에서 처리됩니다.</div>
            <div class="dense-list-item">분석은 등록된 저장소 카드에서 즉시 시작할 수 있습니다.</div>
            <div class="dense-list-item">저장된 Git 정보와 연결된 상태로 분석이 수행됩니다.</div>
          </div>
        </div>
      </div>
    </section>

    <RepositoryForm />
  </div>
</template>
