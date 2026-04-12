<script setup lang="ts">
const props = defineProps<{
  commits: Array<{
    id: string;
    committedAt: string;
    title: string;
  }>;
}>();

const timeline = computed(() => {
  const sorted = [...props.commits]
    .map((commit) => ({
      ...commit,
      timestamp: new Date(commit.committedAt).getTime()
    }))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (!sorted.length) {
    return {
      points: [],
      oldestLabel: "-",
      newestLabel: "-",
      rangeText: "커밋 데이터가 없습니다."
    };
  }

  const min = sorted[0]?.timestamp ?? 0;
  const max = sorted[sorted.length - 1]?.timestamp ?? min;
  const range = Math.max(max - min, 1);
  const daySpan = Math.max(1, Math.ceil(range / (1000 * 60 * 60 * 24)));

  return {
    points: sorted.map((commit) => ({
      ...commit,
      x: sorted.length === 1 ? 50 : ((commit.timestamp - min) / range) * 100
    })),
    oldestLabel: new Date(min).toLocaleString("ko-KR"),
    newestLabel: new Date(max).toLocaleString("ko-KR"),
    rangeText: `최근 ${sorted.length}개 커밋이 약 ${daySpan}일 범위에 분포합니다.`
  };
});
</script>

<template>
  <CollapsiblePanel
    title="커밋 시간 분포"
    description="오래된 커밋부터 최신 커밋까지 실제 시간 순서로 표시합니다."
    :default-open="false"
  >
    <div class="chart-shell">
      <div class="chart-caption" style="margin-bottom: 10px;">
        <strong>시간축 설명</strong>
        <span>{{ timeline.rangeText }}</span>
      </div>

      <svg viewBox="0 0 100 44" width="100%" height="140" preserveAspectRatio="none" aria-label="commit time distribution">
        <line x1="2" y1="22" x2="98" y2="22" stroke="#263244" stroke-width="1" />
        <g v-for="point in timeline.points" :key="point.id">
          <line :x1="2 + (point.x * 0.96)" y1="22" :x2="2 + (point.x * 0.96)" y2="14" stroke="#48d2c2" stroke-width="0.8" />
          <circle
            :cx="2 + (point.x * 0.96)"
            cy="14"
            r="1.8"
            fill="#48d2c2"
          >
            <title>{{ point.title }} · {{ new Date(point.committedAt).toLocaleString("ko-KR") }}</title>
          </circle>
        </g>
        <text x="2" y="36" fill="#8f9eb3" font-size="3">오래된 커밋</text>
        <text x="78" y="36" fill="#8f9eb3" font-size="3">최신 커밋</text>
      </svg>

      <div class="grid grid-2" style="margin-top: 10px;">
        <div class="dense-list-item">
          <strong>시작 시점</strong>
          <p class="muted" style="margin: 6px 0 0;">{{ timeline.oldestLabel }}</p>
        </div>
        <div class="dense-list-item">
          <strong>마지막 시점</strong>
          <p class="muted" style="margin: 6px 0 0;">{{ timeline.newestLabel }}</p>
        </div>
      </div>

      <div class="dense-list" style="margin-top: 10px;">
        <div v-for="point in timeline.points.slice().reverse().slice(0, 5)" :key="point.id" class="dense-list-item">
          <strong>{{ point.title }}</strong>
          <p class="muted" style="margin: 4px 0 0;">{{ new Date(point.committedAt).toLocaleString("ko-KR") }}</p>
        </div>
      </div>
    </div>
  </CollapsiblePanel>
</template>
