<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { X, Camera, AlertOctagon, TrendingUp, ShieldAlert, CheckCircle2 } from '@lucide/vue';

const props = defineProps({
  hotspot: { type: Object, required: true },
  enforcementActive: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'toggle-enforcement']);

import html2pdf from 'html2pdf.js';

// Mock Live Data update
const liveViolations = ref(props.hotspot.violationCount);
const dispatched = ref(false);

let interval;
onMounted(() => {
  interval = setInterval(() => {
    // Randomly increase violations occasionally to simulate live data
    if (Math.random() > 0.7 && !props.enforcementActive) {
      liveViolations.value++;
    }
  }, 3000);
});

watch(() => props.enforcementActive, (isActive) => {
  if (isActive) {
    // Simulate drop in violations over time when enforced
    liveViolations.value = Math.max(Math.floor(liveViolations.value * 0.7), 0);
  }
});

onUnmounted(() => {
  clearInterval(interval);
});

const handleDispatch = () => {
  emit('toggle-enforcement', !props.enforcementActive);
};

const handleExportPDF = () => {
  const element = document.getElementById('pdf-export-content');
  const opt = {
    margin: 10,
    filename: `Incident_Report_${props.hotspot.name.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
};

// Mock chart data
const weeklyTrends = [
  { day: 'M', value: 45 },
  { day: 'T', value: 60 },
  { day: 'W', value: 35 },
  { day: 'T', value: 80 },
  { day: 'F', value: 95 },
  { day: 'S', value: 110 },
  { day: 'S', value: 50 },
];
const maxTrend = 110;
</script>

<template>
  <div class="details-panel glass-panel flex-col" id="pdf-export-content">
    <div class="header flex-row items-center justify-between">
      <div class="flex-row items-center gap-2">
        <div class="icon-bg">
          <AlertOctagon size="18" class="text-danger" />
        </div>
        <div>
          <h2 class="text-h3">{{ hotspot.name }}</h2>
          <p class="text-small">{{ hotspot.type }} Issue</p>
        </div>
      </div>
      <button class="close-btn" @click="emit('close')" data-html2canvas-ignore>
        <X size="20" />
      </button>
    </div>

    <div class="content flex-col">
      <!-- Camera Feed Simulation -->
      <div class="camera-feed-container">
        <div class="feed-header flex-row justify-between items-center">
          <span class="text-small flex-row items-center gap-1">
            <Camera size="12" /> Live Cam: CAM-{{ hotspot.id.toUpperCase() }}
          </span>
          <span class="live-badge">
            <span class="pulse-dot-small"></span> LIVE
          </span>
        </div>
        <div class="feed-viewport">
          <div class="yolo-box box-1">
            <span class="yolo-label">Car - Illegal</span>
          </div>
          <div class="yolo-box box-2">
            <span class="yolo-label">Auto - Illegal</span>
          </div>
          <div class="scan-line"></div>
          <div class="crosshair center"></div>
        </div>
      </div>

      <p class="description text-body">{{ hotspot.description }}</p>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="text-small text-muted">Detected Violations</div>
          <div class="flex-row items-center justify-between mt-1">
            <span class="text-h2">{{ liveViolations }}</span>
            <TrendingUp v-if="!enforcementActive" size="16" class="text-danger" />
            <span v-else class="text-success text-small font-semibold">Dropping</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="text-small text-muted">Congestion Impact</div>
          <div class="flex-row items-center justify-between mt-1">
            <span class="text-h2" :class="enforcementActive ? 'text-success' : 'text-warning'">
              +{{ enforcementActive ? Math.floor(hotspot.delayMinutes * 0.2) : hotspot.delayMinutes }}m
            </span>
            <div class="impact-bar">
              <div class="impact-fill" :class="{ 'bg-success': enforcementActive }" :style="{ width: Math.min(((enforcementActive ? hotspot.delayMinutes * 0.2 : hotspot.delayMinutes) / 40) * 100, 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vehicle Distribution Donut Chart -->
      <div class="donut-section flex-row items-center justify-between">
        <div class="flex-col">
          <span class="text-small text-muted mb-1">Vehicle Distribution</span>
          <div class="legend-item"><span class="dot car"></span> Cars (65%)</div>
          <div class="legend-item"><span class="dot scooter"></span> Scooters (25%)</div>
          <div class="legend-item"><span class="dot auto"></span> Autos (10%)</div>
        </div>
        <div class="donut-chart"></div>
      </div>

      <!-- Weekly Trends Chart -->
      <div class="trend-section">
        <div class="text-small text-muted mb-1">Weekly Violation Trends</div>
        <div class="chart-container">
          <div v-for="(item, idx) in weeklyTrends" :key="idx" class="chart-bar-wrap">
            <div 
              class="chart-bar" 
              :style="{ height: `${(item.value / maxTrend) * 100}%` }"
              :class="{ 'bar-danger': item.value > 80 }"
            ></div>
            <div class="chart-label">{{ item.day }}</div>
          </div>
        </div>
      </div>

      <div class="action-section flex-row gap-2" data-html2canvas-ignore>
        <button 
          class="btn-primary" style="flex: 1"
          :class="{ 'btn-success': enforcementActive }"
          @click="handleDispatch"
        >
          <ShieldAlert v-if="!enforcementActive" size="18" />
          <CheckCircle2 v-else size="18" />
          {{ enforcementActive ? 'Unit En Route (Impact Simulating)' : 'Simulate Enforcement' }}
        </button>
        <button class="btn-secondary" @click="handleExportPDF">
          PDF Report
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details-panel {
  width: 400px;
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.icon-bg {
  background: rgba(239, 68, 68, 0.1);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  display: flex;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.close-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-primary);
}

.content {
  padding: 1.5rem;
  gap: 1.5rem;
  overflow-y: auto;
}

.description {
  background: rgba(0,0,0,0.2);
  padding: 1rem;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--status-warning);
}

/* Camera Feed */
.camera-feed-container {
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}

.feed-header {
  background: #111;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #333;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--status-danger);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.pulse-dot-small {
  width: 6px;
  height: 6px;
  background: var(--status-danger);
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.feed-viewport {
  height: 180px;
  background: 
    linear-gradient(rgba(20, 20, 20, 0.8), rgba(20, 20, 20, 0.8)),
    url('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600') center/cover;
  position: relative;
  overflow: hidden;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
  animation: scan 3s linear infinite;
}

@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}

.yolo-box {
  position: absolute;
  border: 2px solid var(--status-danger);
  background: rgba(239, 68, 68, 0.1);
  box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.2);
}

.box-1 {
  top: 40%;
  left: 30%;
  width: 60px;
  height: 45px;
  animation: jitter 5s infinite;
}

.box-2 {
  top: 55%;
  left: 65%;
  width: 80px;
  height: 60px;
  animation: jitter 4s infinite reverse;
}

@keyframes jitter {
  0% { transform: translate(0, 0); }
  25% { transform: translate(2px, -1px); }
  50% { transform: translate(-1px, 2px); }
  75% { transform: translate(1px, 1px); }
  100% { transform: translate(0, 0); }
}

.yolo-label {
  position: absolute;
  top: -18px;
  left: -2px;
  background: var(--status-danger);
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 4px;
  white-space: nowrap;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.metric-card {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.impact-bar {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  margin-left: 0.75rem;
  overflow: hidden;
}

.impact-fill {
  height: 100%;
  background: var(--status-warning);
  border-radius: 2px;
  transition: width 1s ease;
}

.mt-1 { margin-top: 0.5rem; }

.full-width {
  width: 100%;
  padding: 1rem;
  font-size: 1.05rem;
}

.btn-success {
  background: var(--status-success);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
}

.text-success { color: var(--status-success); }
.bg-success { background: var(--status-success) !important; }

/* Donut Chart */
.donut-section {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.legend-item {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.car { background: var(--accent-primary); }
.dot.scooter { background: var(--accent-secondary); }
.dot.auto { background: var(--status-warning); }

.donut-chart {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent-primary) 0% 65%, 
    var(--accent-secondary) 65% 90%, 
    var(--status-warning) 90% 100%
  );
  position: relative;
}
.donut-chart::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: var(--bg-primary);
  border-radius: 50%;
}

/* Chart Styles */
.trend-section {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.mb-1 { margin-bottom: 0.5rem; }

.chart-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 80px;
  padding-top: 10px;
}

.chart-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 0.4rem;
  width: 12%;
}

.chart-bar {
  width: 100%;
  background: var(--accent-primary);
  border-radius: 2px 2px 0 0;
  transition: height 0.5s ease;
  min-height: 2px;
}

.chart-bar.bar-danger {
  background: var(--status-danger);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.chart-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 600;
}
</style>
