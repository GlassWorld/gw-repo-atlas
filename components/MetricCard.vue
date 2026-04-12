<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  note?: string;
}>();
</script>

<template>
  <article class="metric-card">
    <span class="metric-label">{{ label }}</span>
    <strong class="metric-value">{{ value }}</strong>
    <span v-if="note" class="muted">{{ note }}</span>
  </article>
</template>
