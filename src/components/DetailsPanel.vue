<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { X, Camera, AlertOctagon, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, FileDown, MapPin, Clock, Activity } from '@lucide/vue';
import html2pdf from 'html2pdf.js';

const props = defineProps({
  hotspot: { type: Object, required: true },
  enforcementActive: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'toggle-enforcement']);

const liveViolations = ref(props.hotspot.violationCount);
const enforcedSince = ref(null);

let interval;
onMounted(() => {
  interval = setInterval(() => {
    if (props.enforcementActive) {
      // Slowly reduce when enforced
      if (liveViolations.value > Math.floor(props.hotspot.violationCount * 0.6)) {
        liveViolations.value -= Math.floor(Math.random() * 5) + 1;
      }
    } else {
      // Slowly increase when not enforced
      if (Math.random() > 0.6) liveViolations.value++;
    }
  }, 2500);
});

watch(() => props.enforcementActive, (isActive) => {
  if (isActive) {
    enforcedSince.value = new Date();
    liveViolations.value = Math.floor(liveViolations.value * 0.85);
  } else {
    enforcedSince.value = null;
  }
});

watch(() => props.hotspot, (newHs) => {
  liveViolations.value = newHs.violationCount;
  enforcedSince.value = null;
});

onUnmounted(() => clearInterval(interval));

const reductionPct = computed(() => {
  const original = props.hotspot.violationCount;
  return Math.max(0, Math.round(((original - liveViolations.value) / original) * 100));
});

const currentDelay = computed(() =>
  props.enforcementActive ? Math.max(Math.floor(props.hotspot.delayMinutes * 0.2), 2) : props.hotspot.delayMinutes
);

const handleDispatch = () => emit('toggle-enforcement', !props.enforcementActive);

const handleExportPDF = () => {
  const element = document.querySelector('.app-container');
  const opt = {
    margin: 5,
    filename: `Gridlock_Incident_Report_${props.hotspot.name.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
};

// Severity data for stats
const severityColor = computed(() => ({
  Critical: 'var(--status-danger)',
  High: 'var(--status-warning)',
  Medium: 'var(--accent-primary)'
}[props.hotspot.severity] || 'var(--accent-primary)'));

// Weekly trends with real-ish patterns
const weeklyTrends = computed(() => {
  const base = props.hotspot.violationCount / 60;
  return [
    { day: 'Mon', value: Math.round(base * 0.7) },
    { day: 'Tue', value: Math.round(base * 0.85) },
    { day: 'Wed', value: Math.round(base * 0.75) },
    { day: 'Thu', value: Math.round(base * 1.0) },
    { day: 'Fri', value: Math.round(base * 1.2) },
    { day: 'Sat', value: Math.round(base * 1.45) },
    { day: 'Sun', value: Math.round(base * 0.55) },
  ];
});
const maxTrend = computed(() => Math.max(...weeklyTrends.value.map(d => d.value)));
</script>

<template>
  <div class="details-panel glass-panel flex-col" id="pdf-export-content">

    <!-- Panel Header -->
    <div class="panel-header">
      <div class="flex-row items-center gap-3 flex-1">
        <div class="hotspot-icon" :style="{ background: `${severityColor}20`, borderColor: `${severityColor}40` }">
          <AlertOctagon size="16" :style="{ color: severityColor }" />
        </div>
        <div class="flex-col flex-1">
          <div class="flex-row items-center gap-2">
            <h2 class="panel-title">{{ hotspot.name }}</h2>
            <span class="badge" :class="{
              'badge-danger': hotspot.severity === 'Critical',
              'badge-warning': hotspot.severity === 'High',
              'badge-info': hotspot.severity === 'Medium'
            }">{{ hotspot.severity }}</span>
          </div>
          <p class="panel-subtitle">
            <MapPin size="10" style="display:inline; margin-right:3px;" />
            Bengaluru · {{ hotspot.type }}
          </p>
        </div>
      </div>
      <button class="close-btn" @click="emit('close')" data-html2canvas-ignore>
        <X size="18" />
      </button>
    </div>

    <!-- Enforcement Status Banner -->
    <Transition name="fade">
      <div v-if="enforcementActive" class="enforcement-banner">
        <CheckCircle2 size="14" />
        <span>Enforcement unit deployed · {{ reductionPct }}% violation reduction detected</span>
      </div>
    </Transition>

    <!-- Scrollable content -->
    <div class="panel-content flex-col">

      <!-- Live Camera Feed -->
      <div class="camera-block">
        <div class="camera-header flex-row justify-between items-center">
          <div class="flex-row items-center gap-2">
            <Camera size="12" style="color: var(--text-muted)" />
            <span class="text-xs">Live Feed · CAM-{{ hotspot.id.slice(-4).toUpperCase() }}</span>
          </div>
          <div class="flex-row items-center gap-2">
            <span class="cam-record-dot"></span>
            <span class="text-xs" style="color: var(--status-danger)">REC</span>
          </div>
        </div>
        <div class="camera-viewport">
          <div class="yolo-box box-a">
            <span class="yolo-label">CAR · 97%</span>
          </div>
          <div class="yolo-box box-b">
            <span class="yolo-label">AUTO · 89%</span>
          </div>
          <div class="yolo-box box-c" style="border-color: var(--status-warning);">
            <span class="yolo-label" style="background:var(--status-warning)">SCOOTER · 92%</span>
          </div>
          <div class="scan-line"></div>
          <div class="cam-corner c1"></div>
          <div class="cam-corner c2"></div>
          <div class="cam-corner c3"></div>
          <div class="cam-corner c4"></div>
          <div class="cam-overlay-text">PARKING VIOLATION DETECTED</div>
        </div>
      </div>

      <!-- Primary Metrics -->
      <div class="metrics-row">
        <div class="metric-block">
          <div class="metric-label">Live Violations</div>
          <div class="flex-row items-end gap-2">
            <span class="metric-value" :class="{ 'val-success': enforcementActive, 'val-danger': !enforcementActive }">
              {{ liveViolations.toLocaleString('en-IN') }}
            </span>
            <TrendingDown v-if="enforcementActive" size="16" style="color:var(--status-success); margin-bottom:4px" />
            <TrendingUp v-else size="16" style="color:var(--status-danger); margin-bottom:4px" />
          </div>
          <div class="metric-bar-track">
            <div 
              class="metric-bar-fill" 
              :class="{ 'bar-green': enforcementActive, 'bar-red': !enforcementActive }"
              :style="{ width: Math.min((liveViolations / 40000) * 100, 100) + '%' }"
            ></div>
          </div>
        </div>
        <div class="metric-block">
          <div class="metric-label">Traffic Delay</div>
          <div class="flex-row items-end gap-2">
            <span class="metric-value" :class="{ 'val-success': enforcementActive, 'val-warning': !enforcementActive }">
              +{{ currentDelay }}m
            </span>
            <Clock size="16" :style="{ color: enforcementActive ? 'var(--status-success)' : 'var(--status-warning)', marginBottom:'4px' }" />
          </div>
          <div class="metric-bar-track">
            <div 
              class="metric-bar-fill"
              :class="{ 'bar-green': enforcementActive, 'bar-orange': !enforcementActive }"
              :style="{ width: Math.min((currentDelay / 40) * 100, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="description-block">
        <Activity size="12" style="color: var(--text-muted); flex-shrink:0; margin-top: 2px;" />
        <p class="text-body description-text">{{ hotspot.description }}</p>
      </div>

      <!-- Vehicle Distribution -->
      <div class="chart-card">
        <div class="chart-card-title">
          <span>Vehicle Distribution</span>
          <span class="text-xs">at this junction</span>
        </div>
        <div class="donut-row flex-row items-center gap-4">
          <div class="donut-wrap">
            <div class="donut-chart"></div>
            <div class="donut-center-label">
              <span class="donut-pct">65%</span>
              <span class="donut-pct-label">Cars</span>
            </div>
          </div>
          <div class="legend-col flex-col gap-2 flex-1">
            <div class="legend-row">
              <div class="legend-dot" style="background:var(--accent-primary)"></div>
              <div class="flex-row justify-between flex-1">
                <span class="legend-label">Cars</span>
                <span class="legend-val">65%</span>
              </div>
              <div class="legend-bar-track">
                <div class="legend-bar-fill" style="width:65%; background:var(--accent-primary)"></div>
              </div>
            </div>
            <div class="legend-row">
              <div class="legend-dot" style="background:var(--accent-secondary)"></div>
              <div class="flex-row justify-between flex-1">
                <span class="legend-label">Scooters</span>
                <span class="legend-val">25%</span>
              </div>
              <div class="legend-bar-track">
                <div class="legend-bar-fill" style="width:25%; background:var(--accent-secondary)"></div>
              </div>
            </div>
            <div class="legend-row">
              <div class="legend-dot" style="background:var(--status-warning)"></div>
              <div class="flex-row justify-between flex-1">
                <span class="legend-label">Autos</span>
                <span class="legend-val">10%</span>
              </div>
              <div class="legend-bar-track">
                <div class="legend-bar-fill" style="width:10%; background:var(--status-warning)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly Trends -->
      <div class="chart-card">
        <div class="chart-card-title">
          <span>Weekly Violation Trend</span>
          <span class="text-xs">Jan – May 2024</span>
        </div>
        <div class="bar-chart">
          <div v-for="(item, i) in weeklyTrends" :key="i" class="bar-col">
            <div class="bar-val-label">{{ item.value }}</div>
            <div class="bar-outer">
              <div 
                class="bar-inner"
                :class="{ 'bar-peak': item.value === maxTrend, 'bar-weekend': item.day === 'Sat' || item.day === 'Sun' }"
                :style="{ height: (item.value / maxTrend * 100) + '%' }"
              ></div>
            </div>
            <div class="bar-day">{{ item.day }}</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="action-row" data-html2canvas-ignore>
        <button
          class="btn-enforce"
          :class="{ 'btn-active': enforcementActive }"
          @click="handleDispatch"
        >
          <component :is="enforcementActive ? CheckCircle2 : ShieldAlert" size="16" />
          <span>{{ enforcementActive ? 'Unit En Route · Tap to Recall' : 'Simulate Enforcement' }}</span>
        </button>
        <button class="btn-export" @click="handleExportPDF">
          <FileDown size="16" />
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.details-panel {
  width: 380px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.hotspot-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.panel-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.close-btn {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  display: flex;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

/* Enforcement banner */
.enforcement-banner {
  background: rgba(52,211,153,0.08);
  border-bottom: 1px solid rgba(52,211,153,0.2);
  padding: 0.5rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--status-success);
  flex-shrink: 0;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, max-height 0.3s; max-height: 60px; }
.fade-enter-from, .fade-leave-to { opacity: 0; max-height: 0; }

/* Scrollable content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  gap: 1rem;
}

/* Camera */
.camera-block {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #060a10;
}
.camera-header {
  padding: 0.4rem 0.75rem;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--border-color);
}
.cam-record-dot {
  width: 5px; height: 5px;
  background: var(--status-danger);
  border-radius: 50%;
  animation: blink 1.2s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

.camera-viewport {
  height: 160px;
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(rgba(6,10,16,0.7), rgba(6,10,16,0.7)),
    url('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600') center/cover;
}

.scan-line {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 1px;
  background: rgba(79,142,245,0.6);
  box-shadow: 0 0 8px rgba(79,142,245,0.8);
  animation: scan 3s linear infinite;
}
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }

.yolo-box {
  position: absolute;
  border: 1.5px solid var(--status-danger);
  background: rgba(248,113,113,0.06);
  animation: jitter 5s infinite;
}
.box-a { top: 38%; left: 20%; width: 70px; height: 50px; }
.box-b { top: 52%; left: 58%; width: 85px; height: 55px; animation-duration: 4s; animation-direction: reverse; }
.box-c { top: 20%; left: 45%; width: 55px; height: 40px; animation-duration: 6s; }
@keyframes jitter {
  0%,100% { transform: translate(0,0); }
  25% { transform: translate(2px,-1px); }
  50% { transform: translate(-1px,2px); }
  75% { transform: translate(1px,1px); }
}

.yolo-label {
  position: absolute;
  top: -18px; left: -1.5px;
  background: var(--status-danger);
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 2px 5px;
  white-space: nowrap;
  font-family: var(--font-mono);
}

.cam-corner {
  position: absolute;
  width: 12px; height: 12px;
  border-color: rgba(79,142,245,0.5);
  border-style: solid;
}
.c1 { top: 6px; left: 6px; border-width: 2px 0 0 2px; }
.c2 { top: 6px; right: 6px; border-width: 2px 2px 0 0; }
.c3 { bottom: 6px; left: 6px; border-width: 0 0 2px 2px; }
.c4 { bottom: 6px; right: 6px; border-width: 0 2px 2px 0; }

.cam-overlay-text {
  position: absolute;
  bottom: 8px; left: 0; right: 0;
  text-align: center;
  font-size: 0.55rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--status-danger);
  letter-spacing: 0.08em;
  opacity: 0.8;
}

/* Metrics */
.metrics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.metric-block {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.875rem;
}
.metric-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-family: var(--font-mono);
}
.val-danger { color: var(--status-danger); }
.val-success { color: var(--status-success); }
.val-warning { color: var(--status-warning); }

.metric-bar-track {
  margin-top: 0.5rem;
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 99px;
  overflow: hidden;
}
.metric-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.8s ease;
}
.bar-red { background: linear-gradient(to right, var(--status-danger), #fb923c); }
.bar-green { background: linear-gradient(to right, var(--status-success), #34d399); }
.bar-orange { background: linear-gradient(to right, var(--status-warning), #f97316); }

/* Description */
.description-block {
  display: flex;
  gap: 0.5rem;
  background: rgba(0,0,0,0.2);
  border-left: 2px solid var(--status-warning);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 0.75rem;
}
.description-text {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Chart Cards */
.chart-card {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.875rem;
}
.chart-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Donut */
.donut-row { align-items: center; }
.donut-wrap { position: relative; width: 72px; height: 72px; flex-shrink: 0; }
.donut-chart {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent-primary) 0% 65%, 
    var(--accent-secondary) 65% 90%, 
    var(--status-warning) 90% 100%
  );
}
.donut-chart::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 48px; height: 48px;
  background: var(--bg-tertiary);
  border-radius: 50%;
}
.donut-center-label {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  z-index: 1;
  text-align: center;
  pointer-events: none;
}
.donut-pct { font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); display: block; }
.donut-pct-label { font-size: 0.5rem; color: var(--text-muted); display: block; }

.legend-col { gap: 0.5rem !important; }
.legend-row { display: flex; flex-direction: column; gap: 2px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 0.72rem; color: var(--text-secondary); }
.legend-val { font-size: 0.72rem; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); }
.legend-bar-track {
  height: 2px;
  background: rgba(255,255,255,0.05);
  border-radius: 99px;
  width: 100%;
}
.legend-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }

/* Bar chart */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.3rem;
  height: 80px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 3px;
}
.bar-val-label {
  font-size: 0.55rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  min-height: 14px;
  display: flex;
  align-items: flex-end;
}
.bar-outer {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.bar-inner {
  width: 100%;
  background: var(--accent-primary);
  border-radius: 2px 2px 0 0;
  opacity: 0.5;
  transition: height 0.5s ease;
  min-height: 2px;
}
.bar-inner.bar-peak { opacity: 1; background: var(--status-danger); box-shadow: 0 0 6px rgba(248,113,113,0.4); }
.bar-inner.bar-weekend { background: var(--accent-secondary); opacity: 0.75; }
.bar-day { font-size: 0.6rem; color: var(--text-muted); font-weight: 600; }

/* Actions */
.action-row {
  display: flex;
  gap: 0.5rem;
}
.btn-enforce {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid rgba(79,142,245,0.3);
  background: linear-gradient(135deg, rgba(79,142,245,0.15), rgba(155,108,247,0.15));
  color: var(--accent-primary);
  transition: all 0.25s;
}
.btn-enforce:hover { background: linear-gradient(135deg, rgba(79,142,245,0.25), rgba(155,108,247,0.25)); }
.btn-enforce.btn-active {
  background: linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.08));
  border-color: rgba(52,211,153,0.35);
  color: var(--status-success);
}

.btn-export {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-glass-light);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-export:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); background: var(--bg-glass-medium); }

/* Utility */
.font-mono { font-family: var(--font-mono); }
</style>
