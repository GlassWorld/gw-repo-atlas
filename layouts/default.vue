<script setup lang="ts">
const authSession = useAuthSession();

await authSession.refresh();

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  authSession.clear();
  await navigateTo("/login");
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">Repo-Atlas</NuxtLink>
      <div v-if="authSession.user.value" class="topbar-right">
        <nav class="topnav">
          <NuxtLink to="/">대시보드</NuxtLink>
          <NuxtLink to="/git-register">Git 등록</NuxtLink>
          <NuxtLink to="/repositories">저장소 관리</NuxtLink>
          <NuxtLink to="/analyses">분석 내역</NuxtLink>
          <NuxtLink to="/qa">Q&A</NuxtLink>
        </nav>
        <div class="auth-controls">
          <span class="user-chip">{{ authSession.user.value.name }}</span>
          <button type="button" class="button secondary" @click="logout">로그아웃</button>
        </div>
      </div>
    </header>
    <main class="page-shell">
      <slot />
    </main>
  </div>
</template>
