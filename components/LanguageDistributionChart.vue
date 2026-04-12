<script setup lang="ts">
const props = defineProps<{
  files: Array<{
    path: string;
    language: string | null;
  }>;
}>();

const palette = ["#48d2c2", "#6ea8fe", "#f2b35d", "#ff6d6d", "#9d8cff", "#46c27a"];

const rows = computed(() => {
  const counts = new Map<string, number>();
  for (const file of props.files) {
    const language = file.language ?? "Unknown";
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  const values = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([language, count], index) => ({
      language,
      count,
      color: palette[index % palette.length]
    }));

  const max = Math.max(...values.map((item) => item.count), 1);
  return values.map((item) => ({
    ...item,
    width: `${(item.count / max) * 100}%`
  }));
});
</script>

<template>
  <CollapsiblePanel title="언어 분포" description="파일 개수 기준 상위 언어">
    <div class="chart-shell">
      <div class="dense-list">
        <div v-for="row in rows" :key="row.language" class="dense-list-item">
          <div class="chart-caption">
            <strong>{{ row.language }}</strong>
            <span>{{ row.count }} files</span>
          </div>
          <div style="height: 10px; background: rgba(255,255,255,0.04);">
            <div :style="{ width: row.width, height: '100%', background: row.color }" />
          </div>
        </div>
      </div>
    </div>
  </CollapsiblePanel>
</template>
