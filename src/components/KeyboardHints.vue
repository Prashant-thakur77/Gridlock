<script setup>
import { X, Keyboard } from '@lucide/vue';
const emit = defineEmits(['close']);
const shortcuts = [
  { keys: ["1-9"], desc: 'Select hotspot #1–#9' },
  { keys: ['Esc'], desc: 'Close panel / dismiss overlay' },
  { keys: ['C'], desc: 'Toggle Command Center mode' },
  { keys: ['R'], desc: 'Toggle patrol route on map' },
  { keys: ['P'], desc: 'Export PDF report' },
  { keys: ['?'], desc: 'Show this keyboard shortcuts panel' },
];
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="hints-box glass-panel">
      <div class="hints-header">
        <div class="flex-row items-center gap-2">
          <Keyboard size="15" style="color:var(--accent-primary)" />
          <span class="hints-title">Keyboard Shortcuts</span>
        </div>
        <button class="close-btn" @click="emit('close')"><X size="14" /></button>
      </div>
      <div class="hints-list">
        <div v-for="s in shortcuts" :key="s.desc" class="hint-row">
          <div class="hint-keys">
            <kbd v-for="k in s.keys" :key="k" class="kbd">{{ k }}</kbd>
          </div>
          <span class="hint-desc">{{ s.desc }}</span>
        </div>
      </div>
      <div class="hints-footer">Gridlock AI · Traffic Intelligence Platform</div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 8000; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
.hints-box { width: 360px; border-radius: var(--radius-lg) !important; overflow: hidden; }
.hints-header { padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.hints-title { font-size: 0.9rem; font-weight: 700; }
.close-btn { background: var(--bg-glass-light); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: var(--radius-sm); display: flex; }
.hints-list { padding: 0.75rem 1.125rem; display: flex; flex-direction: column; gap: 0.5rem; }
.hint-row { display: flex; align-items: center; gap: 1rem; }
.hint-keys { display: flex; gap: 0.3rem; flex-shrink: 0; min-width: 80px; }
.kbd { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-bottom: 2px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 2px 7px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-primary); font-weight: 600; }
.hint-desc { font-size: 0.78rem; color: var(--text-secondary); }
.hints-footer { padding: 0.6rem 1.125rem; border-top: 1px solid var(--border-color); font-size: 0.62rem; color: var(--text-muted); text-align: center; }
.flex-row { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
</style>
