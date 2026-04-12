<script setup lang="ts">
const props = defineProps<{
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
}>();

const labelMap = {
  PENDING: "대기 중",
  RUNNING: "분석 중",
  SUCCESS: "완료",
  FAILED: "실패"
} as const;

const classMap = {
  PENDING: "status-pending",
  RUNNING: "status-running",
  SUCCESS: "status-success",
  FAILED: "status-failed"
} as const;
</script>

<template>
  <span class="status-badge" :class="classMap[props.status]">
    {{ labelMap[props.status] }}
  </span>
</template>
