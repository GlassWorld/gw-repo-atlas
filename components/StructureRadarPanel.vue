<script setup lang="ts">
const props = defineProps<{
  files: Array<{
    isEntryPoint: boolean;
    isKeyFile: boolean;
  }>;
  commits: Array<{
    id: string;
  }>;
}>();

const stats = computed(() => {
  const totalFiles = props.files.length || 1;
  const entryPoints = props.files.filter((file) => file.isEntryPoint).length;
  const keyFiles = props.files.filter((file) => file.isKeyFile).length;
  const commits = props.commits.length;

  return [
    { label: "Entry", value: entryPoints, ratio: Math.min(entryPoints / Math.max(totalFiles, 4), 1), color: "#48d2c2" },
    { label: "Key", value: keyFiles, ratio: Math.min(keyFiles / Math.max(totalFiles / 2, 4), 1), color: "#6ea8fe" },
    { label: "Commit", value: commits, ratio: Math.min(commits / 12, 1), color: "#f2b35d" }
  ];
});
</script>

<template>
  <CollapsiblePanel title="구조 시그널" description="엔트리, 핵심 파일, 커밋 밀도">
    <div class="chart-shell">
      <div class="chart-legend" style="margin-bottom: 14px;">
        <span v-for="item in stats" :key="item.label" class="legend-item">
          <span class="legend-swatch" :style="{ background: item.color }" />
          {{ item.label }} · {{ item.value }}
        </span>
      </div>
      <div style="display: grid; gap: 10px;">
        <div v-for="item in stats" :key="item.label">
          <div class="chart-caption">
            <strong>{{ item.label }}</strong>
            <span>{{ Math.round(item.ratio * 100) }}%</span>
          </div>
          <div style="height: 12px; background: rgba(255,255,255,0.04);">
            <div :style="{ width: `${item.ratio * 100}%`, height: '100%', background: item.color }" />
          </div>
        </div>
      </div>
    </div>
  </CollapsiblePanel>
</template>
