export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") {
    return;
  }

  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const data = await $fetch<{
    user: { id: string; loginId: string } | null;
  }>("/api/auth/me", {
    headers
  }).catch(() => ({ user: null }));

  if (!data.user) {
    return navigateTo("/login");
  }
});
