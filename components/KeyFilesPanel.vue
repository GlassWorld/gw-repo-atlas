<script setup lang="ts">
defineProps<{
  files: Array<{
    path: string;
    summary: string | null;
    snippet: string | null;
  }>;
}>();
</script>

<template>
  <CollapsiblePanel title="핵심 파일" description="온보딩 우선순위가 높은 파일 후보" :default-open="false">
    <ul class="list" style="margin-top: 12px;">
      <li v-for="file in files" :key="file.path">
        <div class="dense-list-item">
        <strong class="mono">{{ file.path }}</strong>
        <p class="muted" style="margin: 6px 0 0;">
          {{ file.summary ?? "핵심 진입점 또는 중요 메타 파일로 분류되었습니다." }}
        </p>
        <pre
          v-if="file.snippet"
          class="file-tree"
          style="margin: 12px 0 0; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border);"
        >{{ file.snippet }}</pre>
        </div>
      </li>
    </ul>
  </CollapsiblePanel>
</template>
