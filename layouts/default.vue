<script setup lang="ts">
const authSession = useAuthSession();
const route = useRoute();

const navItems = [
  {
    label: "대시보드",
    to: "/",
    isActive: () => route.path === "/"
  },
  {
    label: "Git 등록",
    to: "/git-register",
    isActive: () => route.path.startsWith("/git-register")
  },
  {
    label: "저장소 관리",
    to: "/repositories",
    isActive: () => route.path.startsWith("/repositories")
  },
  {
    label: "분석",
    to: "/analyses",
    isActive: () => route.path.startsWith("/analyses") || route.path.startsWith("/analysis/")
  },
  {
    label: "Q&A",
    to: "/qa",
    isActive: () => route.path.startsWith("/qa")
  }
];

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
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="{ active: item.isActive() }"
          >
            {{ item.label }}
          </NuxtLink>
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
