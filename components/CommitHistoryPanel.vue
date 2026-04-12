<script setup lang="ts">
defineProps<{
  commits: Array<{
    id: string;
    commitHash: string;
    authorName: string;
    committedAt: string;
    title: string;
    changeSummary: string | null;
  }>;
}>();
</script>

<template>
  <CollapsiblePanel title="최근 커밋 흐름" description="메시지와 시간 기준으로 정렬한 최신 변경 흐름" :default-open="false">
    <ul class="list" style="margin-top: 12px;">
      <li v-for="commit in commits" :key="commit.id">
        <div class="dense-list-item">
        <strong>{{ commit.title }}</strong>
        <p class="muted" style="margin: 4px 0;">
          {{ commit.authorName }} · {{ new Date(commit.committedAt).toLocaleString("ko-KR") }}
        </p>
        <code class="mono">{{ commit.commitHash.slice(0, 10) }}</code>
        <p v-if="commit.changeSummary" class="muted" style="margin: 6px 0 0;">
          {{ commit.changeSummary }}
        </p>
        </div>
      </li>
    </ul>
  </CollapsiblePanel>
</template>
