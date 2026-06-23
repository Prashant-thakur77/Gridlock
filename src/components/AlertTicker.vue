<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Bell, X } from '@lucide/vue';
import { mockHotspots, vehicleDistribution, violationTypes } from '../mockData';

const emit = defineEmits(['select-hotspot']);

// Weighted random from real distributions
const vehicles = vehicleDistribution.slice(0, 5);
const violTypes = violationTypes.slice(0, 3);

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.count, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.count; if (r <= 0) return item; }
  return items[0];
}

function fakePlate() {
  const n = () => Math.floor(Math.random() * 10);
  const l = () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)];
  return `KA-${n()}${n()}-${l()}${l()}-${n()}${n()}${n()}${n()}`;
}

const alerts = ref([]);
let ticker;
let uid = 0;

function generateAlert() {
  const hs = mockHotspots[Math.floor(Math.random() * mockHotspots.length)];
  const veh = weightedRandom(vehicles);
  const viol = weightedRandom(violTypes);
  const id = ++uid;
  const sColor = { Critical: '#f87171', High: '#fbbf24', Medium: '#4f8ef5' }[hs.severity];

  alerts.value.unshift({
    id, hs, vehicle: veh.name, plate: fakePlate(),
    violation: viol.name, severity: hs.severity, sColor,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });

  // Keep max 4 visible
  if (alerts.value.length > 4) alerts.value.pop();

  // Auto-dismiss after 7s
  setTimeout(() => { alerts.value = alerts.value.filter(a => a.id !== id); }, 7000);
}

onMounted(() => {
  setTimeout(generateAlert, 1500);
  ticker = setInterval(generateAlert, 7500);
});
onUnmounted(() => clearInterval(ticker));

function dismiss(id) { alerts.value = alerts.value.filter(a => a.id !== id); }
function select(alert) { emit('select-hotspot', alert.hs); dismiss(alert.id); }
</script>

<template>
  <div class="ticker-container" aria-live="polite">
    <TransitionGroup name="alert-slide" tag="div" class="alerts-wrap">
      <div
        v-for="alert in alerts" :key="alert.id"
        class="alert-toast"
        :style="{ borderLeftColor: alert.sColor }"
        @click="select(alert)"
        role="alert"
      >
        <div class="alert-icon-wrap" :style="{ background: alert.sColor + '18' }">
          <Bell size="11" :style="{ color: alert.sColor }" />
        </div>
        <div class="alert-body">
          <div class="alert-top">
            <span class="alert-label" :style="{ color: alert.sColor }">{{ alert.severity }} · LIVE</span>
            <span class="alert-time mono">{{ alert.time }}</span>
          </div>
          <div class="alert-title">{{ alert.hs.name }}</div>
          <div class="alert-sub">{{ alert.violation }} · {{ alert.vehicle }} · <span class="mono">{{ alert.plate }}</span></div>
        </div>
        <button class="alert-close" @click.stop="dismiss(alert.id)"><X size="10" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.ticker-container {
  position: fixed; bottom: 1.25rem; right: 1.25rem;
  z-index: 9999; display: flex; flex-direction: column; gap: 0.4rem;
  pointer-events: none;
}
.alerts-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
.alert-toast {
  pointer-events: all; width: 290px;
  background: rgba(8, 12, 22, 0.96);
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 3px solid;
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  display: flex; align-items: flex-start; gap: 0.5rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  transition: transform 0.15s, box-shadow 0.15s;
}
.alert-toast:hover { transform: translateX(-4px); box-shadow: 0 6px 30px rgba(0,0,0,0.6); }
.alert-icon-wrap { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.alert-body { flex: 1; min-width: 0; }
.alert-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; }
.alert-label { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.alert-time { font-size: 0.58rem; color: var(--text-muted); }
.alert-title { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-sub { font-size: 0.62rem; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center; flex-shrink: 0; margin-top: 1px; }
.alert-close:hover { color: var(--text-primary); }
.mono { font-family: var(--font-mono); }

/* Transitions */
.alert-slide-enter-active { transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); }
.alert-slide-leave-active { transition: all 0.25s ease; }
.alert-slide-enter-from { transform: translateX(120%); opacity: 0; }
.alert-slide-leave-to { transform: translateX(120%); opacity: 0; max-height: 0; margin: 0; padding: 0; }
</style>
