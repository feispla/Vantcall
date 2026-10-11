<script setup>
defineProps({ label: String, value: [Number, String], loading: Boolean })
</script>

<template>
  <div class="card tile">
    <div class="skeleton" v-if="loading" style="height:40px;width:70%"></div>
    <div v-else class="title value" data-test="stat-value">{{ value }}</div>
    <div class="muted label">{{ label }}</div>
  </div>
</template>

<style scoped>
.tile { display: flex; flex-direction: column; gap: 6px; }
.value { font-size: 44px; color: var(--text); }
.label { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
</style>
