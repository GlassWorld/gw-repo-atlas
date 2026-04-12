<template>
  <div class="grid" style="gap: 24px;">
    <section class="hero">
      <div class="hero-copy">
        <span class="meta-pill">Git Domain Credentials</span>
        <h1>Git 도메인과 프라이빗 저장소 토큰을 사용자별로 관리합니다.</h1>
        <p>
          예를 들어 `github.com` 도메인에 토큰을 등록하면, 프라이빗 저장소 분석 시 해당 토큰을 자동으로 사용합니다.
        </p>
      </div>
    </section>

    <GitDomainForm />
  </div>
</template>
