<template>
  <div class="grid" style="gap: 24px;">
    <section class="hero">
      <div class="hero-copy">
        <span class="meta-pill">RepoAtlas 로그인</span>
        <h1>로그인 후 저장소와 Git 도메인 접근 정보를 관리하세요.</h1>
        <p>
          퍼블릭 저장소는 바로 분석할 수 있고, 프라이빗 저장소는 사용자별로 등록한 Git 도메인 토큰을 사용해
          비대화형으로 clone 합니다.
        </p>
      </div>
    </section>

    <LoginForm />
  </div>
</template>
