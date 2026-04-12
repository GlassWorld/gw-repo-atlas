<script setup lang="ts">
defineProps<{
  title: string;
  items: string[];
}>();
</script>

<template>
  <CollapsiblePanel :title="title" description="분석 결과에서 추출된 상위 목록" :default-open="false">
    <ul class="list" style="margin-top: 12px;">
      <li v-for="item in items" :key="item" class="dense-list-item">
        <span style="display: block; min-width: 0; overflow-wrap: anywhere; word-break: break-word;">
          {{ item }}
        </span>
      </li>
    </ul>
  </CollapsiblePanel>
</template>
