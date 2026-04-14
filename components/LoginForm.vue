<script setup lang="ts">
const authSession = useAuthSession();
const form = reactive({
  loginId: "",
  password: ""
});
const loading = ref(false);
const errorMessage = ref("");

async function submit() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const loginResponse = await $fetch<{
      user: { id: string; name: string; loginId: string; email: string | null };
    }>("/api/auth/login", {
      method: "POST",
      body: {
        loginId: form.loginId,
        password: form.password
      }
    });

    authSession.set(loginResponse.user);
    await navigateTo("/");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "로그인 처리에 실패했습니다.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel" style="max-width: 520px; margin: 0 auto;">
    <form class="form-stack" @submit.prevent="submit">
      <input v-model="form.loginId" class="input" type="text" placeholder="아이디" required />
      <input v-model="form.password" class="input" type="password" placeholder="비밀번호" required />
      <button class="button" type="submit" :disabled="loading">{{ loading ? "처리 중..." : "로그인" }}</button>
      <p v-if="errorMessage" style="margin: 0; color: var(--danger);">{{ errorMessage }}</p>
    </form>
  </section>
</template>
