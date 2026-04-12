<script setup lang="ts">
defineProps<{
  treeLines: string[];
}>();
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h3>파일 트리</h3>
        <p>Git tracked file 목록을 리포트용으로 정렬합니다.</p>
      </div>
    </div>
    <div class="chart-shell">
      <div class="file-tree">{{ treeLines.join("\n") }}</div>
    </div>
  </section>
</template>
