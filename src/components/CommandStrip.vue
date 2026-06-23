<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { mockHotspots } from '../mockData';

const props = defineProps({ selectedHotspot: Object });
const emit = defineEmits(['select-hotspot']);

// Command strip is the compact bottom bar in command center mode
const sColor = (sev) => ({ Critical: '#f87171', High: '#fbbf24', Medium: '#4f8ef5' }[sev] || '#4f8ef5');
</script>

<template>
  <div class="cmd-strip">
    <div class="cmd-strip-inner">
      <div
        v-for="(hs, i) in mockHotspots"
        :key="hs.id"
        class="cmd-card"
        :class="{ 'cmd-card-active': selectedHotspot?.id === hs.id }"
        :style="{ borderTopColor: sColor(hs.severity) }"
        @click="emit('select-hotspot', hs)"
      >
        <div class="cmd-rank mono">#{{ i + 1 }}</div>
        <div class="cmd-name">{{ hs.station }}</div>
        <div class="cmd-meta flex-row gap-1">
          <span class="cmd-badge" :style="{ color: sColor(hs.severity), background: sColor(hs.severity) + '15' }">{{ hs.severity }}</span>
          <span class="cmd-rs mono">RS{{ hs.riskScore }}</span>
        </div>
        <div class="cmd-count mono">{{ hs.violationCount.toLocaleString('en-IN') }}</div>
        <div class="cmd-bar">
          <div class="cmd-bar-fill" :style="{ width: Math.min((hs.violationCount / 35000)*100, 100)+'%', background: sColor(hs.severity) }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmd-strip {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 500;
  background: rgba(5,8,16,0.97); border-top: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(16px); padding: 0.5rem 1rem;
}
.cmd-strip-inner {
  display: flex; gap: 0.4rem; overflow-x: auto;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.cmd-card {
  flex: 0 0 140px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-top: 2px solid; border-radius: 8px; padding: 0.5rem 0.6rem;
  cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 2px;
}
.cmd-card:hover { background: rgba(255,255,255,0.06); }
.cmd-card-active { background: rgba(79,142,245,0.08) !important; border-color: rgba(79,142,245,0.3) !important; }
.cmd-rank { font-size: 0.55rem; color: var(--text-muted); font-weight: 700; }
.cmd-name { font-size: 0.7rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd-meta { display: flex; align-items: center; gap: 0.25rem; }
.cmd-badge { font-size: 0.52rem; font-weight: 700; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; }
.cmd-rs { font-size: 0.55rem; color: var(--text-muted); }
.cmd-count { font-size: 0.68rem; font-weight: 700; color: var(--text-secondary); margin-top: 2px; }
.cmd-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin-top: 3px; }
.cmd-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
.flex-row { display: flex; }
.gap-1 { gap: 0.25rem; }
.mono { font-family: var(--font-mono); }
</style>
