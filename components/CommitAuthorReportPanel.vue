<script setup lang="ts">
const props = defineProps<{
  commits: Array<{
    id: string;
    authorName: string;
    committedAt: string;
    title: string;
  }>;
}>();

const authorRows = computed(() => {
  const grouped = new Map<string, {
    authorName: string;
    count: number;
    latestCommittedAt: string;
    latestTitle: string;
  }>();

  for (const commit of props.commits) {
    const key = commit.authorName?.trim() || "Unknown";
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        authorName: key,
        count: 1,
        latestCommittedAt: commit.committedAt,
        latestTitle: commit.title
      });
      continue;
    }

    const currentTime = new Date(current.latestCommittedAt).getTime();
    const nextTime = new Date(commit.committedAt).getTime();

    grouped.set(key, {
      authorName: key,
      count: current.count + 1,
      latestCommittedAt: nextTime > currentTime ? commit.committedAt : current.latestCommittedAt,
      latestTitle: nextTime > currentTime ? commit.title : current.latestTitle
    });
  }

  const rows = [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return new Date(right.latestCommittedAt).getTime() - new Date(left.latestCommittedAt).getTime();
  });

  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return rows.map((row) => ({
    ...row,
    width: `${(row.count / maxCount) * 100}%`
  }));
});
</script>

<template>
  <CollapsiblePanel
    title="작성자별 커밋 리포트"
    description="최근 수집된 커밋을 작성자 기준으로 묶어 빈도와 마지막 활동 시점을 보여줍니다."
  >
    <div class="chart-shell">
      <div class="dense-list">
        <div v-for="row in authorRows" :key="row.authorName" class="dense-list-item">
          <div class="chart-caption">
            <strong>{{ row.authorName }}</strong>
            <span>{{ row.count }} commits</span>
          </div>
          <div style="height: 10px; background: rgba(255,255,255,0.04); margin-bottom: 8px;">
            <div :style="{ width: row.width, height: '100%', background: '#48d2c2' }" />
          </div>
          <p class="muted" style="margin: 0;">
            마지막 활동: {{ new Date(row.latestCommittedAt).toLocaleString("ko-KR") }}
          </p>
          <p class="muted" style="margin: 6px 0 0;">
            최근 커밋: {{ row.latestTitle }}
          </p>
        </div>
      </div>
    </div>
  </CollapsiblePanel>
</template>
