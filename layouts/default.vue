<script setup lang="ts">
const { data: auth } = await useFetch<{
  user: { id: string; name: string; loginId: string; email: string | null } | null;
}>("/api/auth/me");

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/login");
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/">RepoAtlas</NuxtLink>
      <nav class="topnav">
        <NuxtLink to="/">대시보드</NuxtLink>
        <NuxtLink to="/git-register">Git 등록</NuxtLink>
        <NuxtLink to="/repositories">저장소 관리</NuxtLink>
        <NuxtLink to="/analyses">분석 내역</NuxtLink>
        <NuxtLink to="/qa">Q&A</NuxtLink>
        <span v-if="auth?.user">{{ auth.user.name }}</span>
        <button v-if="auth?.user" type="button" class="button secondary" @click="logout">로그아웃</button>
      </nav>
    </header>
    <main class="page-shell">
      <slot />
    </main>
  </div>
</template>
