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
    { label: "문서화", item: props.score.documentation, weight: "25%" },
    { label: "테스트 하네스", item: props.score.testHarness, weight: "25%" },
    { label: "CI/CD", item: props.score.cicd, weight: "20%" },
    { label: "AI 코딩 설정", item: props.score.vibeCoding, weight: "15%" },
    { label: "코드 품질", item: props.score.codeQuality, weight: "15%" }
  ];
});

const projectKind = computed(() => props.score?.projectKind ?? {
  id: "unknown",
  label: "Unknown",
  confidence: 0,
  reason: "이전 분석 결과에는 프로젝트 종류 감지 정보가 없습니다.",
  signals: []
});

const appliedRules = computed(() => props.score?.appliedRules ?? []);

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      className: "health-score-good",
      emoji: "✅",
      label: "좋음"
    };
  }
  if (score >= 50) {
    return {
      className: "health-score-neutral",
      emoji: "😐",
      label: "보통"
    };
  }
  return {
    className: "health-score-bad",
    emoji: "⚠️",
    label: "주의"
  };
}

const totalTone = computed(() => getScoreTone(props.score?.total ?? 0));
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>헬스 스코어</h2>
        <p class="muted" style="margin: 6px 0 0;">
          {{ projectKind.label }} 기준 운영 준비도
          <span v-if="score">· 신뢰도 {{ projectKind.confidence }}/100</span>
        </p>
      </div>
      <strong class="metric-value health-total" :class="totalTone.className">
        <span aria-hidden="true">{{ totalTone.emoji }}</span>
        {{ score?.total ?? 0 }}
      </strong>
    </div>

    <div v-if="score" class="dense-list" style="margin-bottom: 12px;">
      <div class="dense-list-item">
        <div class="health-row-heading">
          <strong>감지된 프로젝트 종류</strong>
          <span class="mono">{{ projectKind.id }}</span>
        </div>
        <p class="muted" style="margin: 8px 0 0;">{{ projectKind.reason }}</p>
      </div>
    </div>

    <div v-if="score" class="dense-list">
      <div
        v-for="row in rows"
        :key="row.label"
        class="dense-list-item health-score-row"
        :class="getScoreTone(row.item.score).className"
      >
        <div class="health-row-heading">
          <strong>
            <span aria-hidden="true">{{ getScoreTone(row.item.score).emoji }}</span>
            {{ row.label }}
          </strong>
          <span class="score-chip">
            {{ getScoreTone(row.item.score).label }} · {{ row.item.score }}/100 · {{ row.weight }}
          </span>
        </div>
        <div class="health-meter" :class="getScoreTone(row.item.score).className" aria-hidden="true">
          <span :style="{ width: `${Math.max(0, Math.min(100, row.item.score))}%` }" />
        </div>
        <p class="muted" style="margin: 8px 0 0;">{{ row.item.reason }}</p>
      </div>
    </div>

    <div v-if="appliedRules.length" style="margin-top: 12px;">
      <h3 style="font-size: 0.95rem;">적용한 점검 기준</h3>
      <ul class="list" style="margin-top: 8px;">
        <li v-for="rule in appliedRules" :key="rule" class="dense-list-item">{{ rule }}</li>
      </ul>
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
