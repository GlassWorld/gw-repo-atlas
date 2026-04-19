<script setup lang="ts">
import type { HealthScore } from "../types/atlas";

const props = defineProps<{
  score: HealthScore | null;
}>();

const rows = computed(() => {
  if (!props.score) {
    return [];
  }

  return [
    { label: "Documentation", item: props.score.documentation, weight: "25%" },
    { label: "Test Harness", item: props.score.testHarness, weight: "25%" },
    { label: "CI/CD", item: props.score.cicd, weight: "20%" },
    { label: "AI Coding", item: props.score.vibeCoding, weight: "15%" },
    { label: "Code Quality", item: props.score.codeQuality, weight: "15%" }
  ];
});
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>Health Score</h2>
        <p class="muted" style="margin: 6px 0 0;">스니펫과 파일트리 기반 운영 준비도</p>
      </div>
      <strong class="metric-value">{{ score?.total ?? 0 }}</strong>
    </div>

    <div v-if="score" class="dense-list">
      <div v-for="row in rows" :key="row.label" class="dense-list-item">
        <div class="health-row-heading">
          <strong>{{ row.label }}</strong>
          <span class="mono">{{ row.item.score }}/100 · {{ row.weight }}</span>
        </div>
        <div class="health-meter" aria-hidden="true">
          <span :style="{ width: `${Math.max(0, Math.min(100, row.item.score))}%` }" />
        </div>
        <p class="muted" style="margin: 8px 0 0;">{{ row.item.reason }}</p>
      </div>
    </div>

    <div v-if="score?.flags.length" style="margin-top: 12px;">
      <h3 style="font-size: 0.95rem;">주의사항</h3>
      <ul class="list" style="margin-top: 8px;">
        <li v-for="flag in score.flags" :key="flag" class="dense-list-item">{{ flag }}</li>
      </ul>
    </div>

    <div v-if="score?.suggestions.length" style="margin-top: 12px;">
      <h3 style="font-size: 0.95rem;">개선 제안</h3>
      <ul class="list" style="margin-top: 8px;">
        <li v-for="suggestion in score.suggestions" :key="suggestion" class="dense-list-item">
          {{ suggestion }}
        </li>
      </ul>
    </div>
  </section>
</template>
