<template>
  <div class="grid" style="gap: 24px;">
    <section class="hero">
      <div class="hero-copy">
        <span class="meta-pill">파일 근거 기반 질문응답</span>
        <h1>분석 결과를 바탕으로 저장소 질문에 답합니다.</h1>
        <p>
          질문 시 관련 가능성이 높은 파일을 선별해 OpenAI에 전달하고, 응답과 함께 citation 경로를 저장합니다.
        </p>
      </div>
    </section>

    <QaPanel />
  </div>
</template>
