<script setup>
import { ref, computed } from 'vue';
import { X, Users, Zap, Shield, TrendingDown, MapPin } from '@lucide/vue';
import { mockHotspots } from '../mockData';

const emit = defineEmits(['close']);
const officerCount = ref(12);

const allocation = computed(() => {
  const total = mockHotspots.reduce((s, h) => s + h.riskScore, 0);
  return mockHotspots.map(hs => {
    const officers = Math.max(1, Math.round((hs.riskScore / total) * officerCount.value));
    const expectedReduction = Math.min(65, Math.round(officers * 4.5 + (hs.convictionRate * 0.2)));
    return { ...hs, officers, expectedReduction };
  }).sort((a,b) => b.officers - a.officers);
});

const totalAllocated = computed(() => allocation.value.reduce((s, h) => s + h.officers, 0));
const cityReduction = computed(() => Math.round(
  allocation.value.reduce((s, h) => s + h.expectedReduction, 0) / allocation.value.length
));

const sColor = (sev) => ({ Critical: '#f87171', High: '#fbbf24', Medium: '#4f8ef5' }[sev] || '#4f8ef5');
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box glass-panel">

      <!-- Header -->
      <div class="modal-header">
        <div class="flex-row items-center gap-3">
          <div class="modal-icon"><Users size="16" /></div>
          <div>
            <h2 class="modal-title">Resource Allocation Calculator</h2>
            <p class="modal-sub">Optimal enforcement deployment based on Risk Scores</p>
          </div>
        </div>
        <button class="close-btn" @click="emit('close')"><X size="16" /></button>
      </div>

      <!-- Officer Input -->
      <div class="officer-input-row">
        <div class="flex-col flex-1">
          <label class="input-label">Available Officers / Units</label>
          <div class="flex-row items-center gap-3 mt-1">
            <input type="range" min="1" max="50" v-model.number="officerCount" class="officer-slider" />
            <div class="officer-count-badge mono">{{ officerCount }}</div>
          </div>
        </div>
        <div class="summary-pills">
          <div class="sum-pill pill-blue">
            <Users size="11" />
            <span>{{ totalAllocated }} deployed</span>
          </div>
          <div class="sum-pill pill-green">
            <TrendingDown size="11" />
            <span>~{{ cityReduction }}% avg reduction</span>
          </div>
        </div>
      </div>

      <!-- Allocation Table -->
      <div class="alloc-table-wrap">
        <div class="alloc-header">
          <span class="col-zone">Zone</span>
          <span class="col-risk">Risk</span>
          <span class="col-officers">Officers</span>
          <span class="col-bars">Coverage</span>
          <span class="col-redux">Est. Reduction</span>
        </div>
        <div class="alloc-rows">
          <div v-for="hs in allocation" :key="hs.id" class="alloc-row">
            <div class="col-zone">
              <div class="flex-row items-center gap-2">
                <MapPin size="9" :style="{ color: sColor(hs.severity) }" />
                <div class="flex-col">
                  <span class="zone-name">{{ hs.station }}</span>
                  <span class="zone-sev" :style="{ color: sColor(hs.severity) }">{{ hs.severity }}</span>
                </div>
              </div>
            </div>
            <div class="col-risk">
              <span class="risk-val mono" :style="{ color: hs.riskScore >= 70 ? '#f87171' : hs.riskScore >= 45 ? '#fbbf24' : '#4f8ef5' }">{{ hs.riskScore }}</span>
            </div>
            <div class="col-officers">
              <div class="officer-dots">
                <div v-for="i in Math.min(hs.officers, 10)" :key="i"
                  class="officer-dot" :style="{ background: sColor(hs.severity) }"></div>
                <span v-if="hs.officers > 10" class="officer-more mono">+{{ hs.officers - 10 }}</span>
              </div>
              <span class="officer-num mono">{{ hs.officers }}</span>
            </div>
            <div class="col-bars">
              <div class="coverage-bar">
                <div class="coverage-fill"
                  :style="{ width: Math.min((hs.officers / officerCount) * 200, 100) + '%', background: sColor(hs.severity) }"></div>
              </div>
            </div>
            <div class="col-redux">
              <span class="redux-val" :style="{ color: hs.expectedReduction >= 40 ? '#34d399' : '#fbbf24' }">
                ▼ {{ hs.expectedReduction }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer insight -->
      <div class="modal-insight">
        <Zap size="11" style="color:var(--accent-cyan);flex-shrink:0;" />
        <p>With <strong>{{ officerCount }} officers</strong>, deploying {{ allocation[0]?.officers }} to <strong>{{ allocation[0]?.station }}</strong> and {{ allocation[1]?.officers }} to <strong>{{ allocation[1]?.station }}</strong> yields the highest city-wide impact. Algorithm weighted by Gridlock AI Risk Score across {{ mockHotspots.length }} zones.</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.modal-box {
  width: min(820px, 100%); max-height: 88vh;
  display: flex; flex-direction: column;
  border-radius: var(--radius-lg) !important;
  overflow: hidden;
}
.modal-header {
  padding: 1.125rem 1.25rem; border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.modal-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(79,142,245,0.12); border: 1px solid rgba(79,142,245,0.25); display: flex; align-items: center; justify-content: center; color: var(--accent-primary); }
.modal-title { font-size: 1rem; font-weight: 700; letter-spacing: -0.02em; }
.modal-sub { font-size: 0.63rem; color: var(--text-muted); margin-top: 1px; }
.close-btn { background: var(--bg-glass-light); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 0.35rem; border-radius: var(--radius-sm); display: flex; transition: all 0.2s; }
.close-btn:hover { color: var(--text-primary); }

.officer-input-row {
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 1.5rem; flex-shrink: 0;
}
.input-label { font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.mt-1 { margin-top: 0.25rem; }
.officer-slider { -webkit-appearance: none; flex: 1; height: 3px; background: rgba(255,255,255,0.08); border-radius: 99px; outline: none; cursor: pointer; }
.officer-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); cursor: pointer; box-shadow: 0 0 8px rgba(79,142,245,0.6); }
.officer-count-badge { font-size: 1.4rem; font-weight: 800; color: var(--accent-primary); width: 40px; text-align: right; }
.summary-pills { display: flex; gap: 0.5rem; flex-shrink: 0; }
.sum-pill { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 0.67rem; font-weight: 600; }
.pill-blue { background: rgba(79,142,245,0.1); color: var(--accent-primary); border: 1px solid rgba(79,142,245,0.25); }
.pill-green { background: rgba(52,211,153,0.08); color: var(--status-success); border: 1px solid rgba(52,211,153,0.2); }

.alloc-table-wrap { flex: 1; overflow-y: auto; }
.alloc-header {
  display: grid; grid-template-columns: 1.6fr 0.5fr 1.2fr 1fr 0.9fr;
  gap: 0.5rem; padding: 0.5rem 1.25rem;
  background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color);
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: var(--text-muted);
}
.alloc-rows { display: flex; flex-direction: column; }
.alloc-row {
  display: grid; grid-template-columns: 1.6fr 0.5fr 1.2fr 1fr 0.9fr;
  gap: 0.5rem; padding: 0.6rem 1.25rem; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.alloc-row:hover { background: rgba(255,255,255,0.02); }

.zone-name { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); }
.zone-sev { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.risk-val { font-size: 0.85rem; font-weight: 700; }
.officer-dots { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.officer-dot { width: 6px; height: 6px; border-radius: 50%; }
.officer-more { font-size: 0.6rem; color: var(--text-muted); margin-left: 2px; }
.officer-num { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-left: 4px; }
.coverage-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
.coverage-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
.redux-val { font-size: 0.75rem; font-weight: 700; }

.modal-insight {
  padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color);
  background: rgba(34,211,238,0.04);
  display: flex; gap: 0.5rem; align-items: flex-start;
  font-size: 0.72rem; color: var(--text-muted); line-height: 1.5;
  flex-shrink: 0;
}
.modal-insight strong { color: var(--text-primary); }
.flex-1 { flex: 1; }
.flex-row { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.mono { font-family: var(--font-mono); }
</style>
