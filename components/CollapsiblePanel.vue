<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string;
  description?: string;
  defaultOpen?: boolean;
}>(), {
  description: "",
  defaultOpen: true
});

const isOpen = ref(props.defaultOpen);

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <section class="panel collapsible-panel" :data-open="isOpen ? 'true' : 'false'">
    <div class="panel-header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="description" class="muted">{{ description }}</p>
      </div>
      <button
        class="button secondary collapse-toggle"
        type="button"
        :aria-label="isOpen ? `${title} 패널 접기` : `${title} 패널 펼치기`"
        :title="isOpen ? '접기' : '펼치기'"
        @click="toggleOpen"
      >
        <span class="collapse-icon" :data-open="isOpen ? 'true' : 'false'">▾</span>
      </button>
    </div>

    <div v-if="isOpen" class="collapsible-body">
      <slot />
    </div>
  </section>
</template>
