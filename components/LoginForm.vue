<script setup lang="ts">
const mode = ref<"login" | "signup">("login");
const form = reactive({
  loginId: "",
  name: "",
  password: "",
  email: ""
});
const loading = ref(false);
const errorMessage = ref("");

async function submit() {
  loading.value = true;
  errorMessage.value = "";

  try {
    if (mode.value === "signup") {
      await $fetch("/api/auth/signup", {
        method: "POST",
        body: {
          loginId: form.loginId,
          name: form.name,
          password: form.password,
          email: form.email
        }
      });
    }

    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        loginId: form.loginId,
        password: form.password
      }
    });

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
    <div style="display: flex; gap: 12px; margin-bottom: 18px;">
      <button class="button secondary" type="button" @click="mode = 'login'">로그인</button>
      <button class="button secondary" type="button" @click="mode = 'signup'">회원가입</button>
    </div>

    <form class="form-stack" @submit.prevent="submit">
      <input v-model="form.loginId" class="input" type="text" placeholder="login id" required />
      <input
        v-if="mode === 'signup'"
        v-model="form.name"
        class="input"
        type="text"
        placeholder="표시 이름"
        required
      />
      <input
        v-if="mode === 'signup'"
        v-model="form.email"
        class="input"
        type="email"
        placeholder="연락용 이메일 (선택)"
      />
      <input v-model="form.password" class="input" type="password" placeholder="비밀번호" required />
      <button class="button" type="submit" :disabled="loading">
        {{ loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입 후 로그인" }}
      </button>
      <p v-if="errorMessage" style="margin: 0; color: var(--danger);">{{ errorMessage }}</p>
    </form>
  </section>
</template>
