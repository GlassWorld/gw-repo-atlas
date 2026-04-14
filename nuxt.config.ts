export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  app: {
    head: {
      title: "Repo-Atlas",
      titleTemplate: "%s | Repo-Atlas"
    }
  },
  devtools: {
    enabled: true
  },
  css: ["~/assets/css/main.css"],
  modules: [],
  runtimeConfig: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    databaseUrl: process.env.DATABASE_URL,
    analysis: {
      cloneRoot: "/tmp/repo-atlas"
    }
  },
  typescript: {
    strict: true,
    // Nuxt's integrated checker currently trips over the generated
    // vue-router Volar plugin in this project setup. We keep strict mode
    // and run type checks through an explicit script instead.
    typeCheck: false
  },
  nitro: {
    experimental: {
      openAPI: false
    }
  }
});
