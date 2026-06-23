<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { X, Camera, AlertOctagon, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, FileDown, MapPin, Clock, Activity, Shield } from '@lucide/vue';
import { generateDetailedPDF } from '../generateReport';
import { monthlyTrend, meta, mockHotspots } from '../mockData';

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
      if (liveViolations.value > Math.floor(props.hotspot.violationCount * 0.55)) {
        liveViolations.value -= Math.floor(Math.random() * 4) + 1;
      }
    } else {
      if (Math.random() > 0.65) liveViolations.value++;
    }
  }, 2200);
});

watch(() => props.enforcementActive, (isActive) => {
  if (isActive) {
    enforcedSince.value = new Date();
    liveViolations.value = Math.floor(liveViolations.value * 0.88);
  } else { enforcedSince.value = null; }
});

watch(() => props.hotspot, (hs) => {
  liveViolations.value = hs.violationCount;
  enforcedSince.value = null;
});

onUnmounted(() => clearInterval(interval));

const reductionPct = computed(() => Math.max(0, Math.round(
  ((props.hotspot.violationCount - liveViolations.value) / props.hotspot.violationCount) * 100
)));
const currentDelay = computed(() =>
  props.enforcementActive ? Math.max(Math.floor(props.hotspot.delayMinutes * 0.18), 2) : props.hotspot.delayMinutes
);

const severityColor = computed(() => ({
  Critical: 'var(--status-danger)',
  High: 'var(--status-warning)',
  Medium: 'var(--accent-primary)'
}[props.hotspot.severity] || 'var(--accent-primary)'));

// Real vehicle breakdown from pipeline
const vehicleBreakdown = computed(() => {
  const raw = props.hotspot.vehicleBreakdown || [];
  if (!raw.length) return [
    { name: 'SCOOTER', pct: 32 }, { name: 'CAR', pct: 30 },
    { name: 'MOTOR CYCLE', pct: 14 }, { name: 'PASSENGER AUTO', pct: 13 }, { name: 'OTHER', pct: 11 }
  ];
  return raw;
});

const vehicleColors = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--status-warning)', 'var(--accent-cyan)', 'var(--status-danger)'];

// Donut conic gradient string from real data
const donutGradient = computed(() => {
  let cursor = 0;
  const stops = vehicleBreakdown.value.map((v, i) => {
    const start = cursor;
    cursor += v.pct;
    return `${vehicleColors[i]} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
});

// Violation breakdown
const violBreakdown = computed(() => props.hotspot.violationBreakdown || []);

// Real monthly trend (global — per hotspot not tracked to save memory)
const trendData = computed(() => monthlyTrend);
const trendMax = computed(() => Math.max(...trendData.value.map(d => d.count)));

// Per-hotspot hourly as sparkline (peak highlight)
const hourlyCounts = computed(() => props.hotspot.hourlyCounts || new Array(24).fill(0));
const hourlyMax = computed(() => Math.max(...hourlyCounts.value));

const handleDispatch = () => emit('toggle-enforcement', !props.enforcementActive);

const isExporting = ref(false);
const handleExportPDF = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    await generateDetailedPDF(props.hotspot, mockHotspots);
  } finally {
    isExporting.value = false;
  }
};

const peakHourLabel = computed(() => {
  const ph = props.hotspot.peakHour ?? 5;
  return `${ph.toString().padStart(2,'0')}:00–${(ph+1).toString().padStart(2,'0')}:00`;
});
</script>

<template>
  <div class="details-panel glass-panel flex-col" id="pdf-export-content">

    <!-- Header -->
    <div class="panel-header">
      <div class="flex-row items-center gap-3 flex-1">
        <div class="hotspot-icon" :style="{ background: `${severityColor}18`, borderColor: `${severityColor}35` }">
          <AlertOctagon size="15" :style="{ color: severityColor }" />
        </div>
        <div class="flex-col flex-1">
          <div class="flex-row items-center gap-2">
            <h2 class="panel-title">{{ hotspot.name }}</h2>
            <span class="badge" :class="{
              'badge-danger': hotspot.severity === 'Critical',
              'badge-warning': hotspot.severity === 'High',
              'badge-info': hotspot.severity === 'Medium'
            }">{{ hotspot.severity }}</span>
            <span class="risk-badge">RS {{ hotspot.riskScore }}</span>
          </div>
          <p class="panel-sub">
            <MapPin size="9" style="display:inline;margin-right:2px;" />
            {{ hotspot.station }} Police Station · Peak {{ peakHourLabel }}
          </p>
        </div>
      </div>
      <button class="close-btn" @click="emit('close')" data-html2canvas-ignore>
        <X size="16" />
      </button>
    </div>

    <!-- Enforcement Banner -->
    <Transition name="banner-fade">
      <div v-if="enforcementActive" class="enforcement-banner">
        <CheckCircle2 size="13" />
        <span>Enforcement active · <strong>{{ reductionPct }}%</strong> violation reduction detected · Delay reduced to +{{ currentDelay }}m</span>
      </div>
    </Transition>

    <!-- Scrollable content -->
    <div class="panel-content flex-col">

      <!-- Camera Feed -->
      <div class="camera-block">
        <div class="cam-header flex-row justify-between items-center">
          <div class="flex-row items-center gap-2">
            <Camera size="11" style="color:var(--text-muted)" />
            <span class="text-xs">CAM-{{ hotspot.id.slice(-4).toUpperCase() }} · {{ hotspot.station }}</span>
          </div>
          <div class="flex-row items-center gap-2">
            <span class="rec-dot"></span>
            <span class="text-xs" style="color:var(--status-danger); font-weight:700">REC</span>
          </div>
        </div>
        <div class="cam-viewport">
          <div class="yolo-box box-a"><span class="yolo-lbl">SCOOTER · 94%</span></div>
          <div class="yolo-box box-b"><span class="yolo-lbl">CAR · 91%</span></div>
          <div class="yolo-box box-c" style="border-color:var(--status-warning)"><span class="yolo-lbl" style="background:var(--status-warning)">AUTO · 87%</span></div>
          <div class="scan-line"></div>
          <div class="corner c1"></div><div class="corner c2"></div>
          <div class="corner c3"></div><div class="corner c4"></div>
          <div class="cam-alert-text">{{ enforcementActive ? '✓ ENFORCEMENT ACTIVE — VIOLATIONS REDUCING' : 'PARKING VIOLATIONS DETECTED' }}</div>
        </div>
      </div>

      <!-- 3 Metric Cards -->
      <div class="metrics-trio">
        <div class="m-card">
          <div class="m-label">Live Violations</div>
          <div class="flex-row items-center gap-1">
            <span class="m-val" :class="{ 'col-green': enforcementActive, 'col-red': !enforcementActive }">
              {{ liveViolations.toLocaleString('en-IN') }}
            </span>
            <TrendingDown v-if="enforcementActive" size="14" style="color:var(--status-success)" />
            <TrendingUp v-else size="14" style="color:var(--status-danger)" />
          </div>
          <div class="m-bar">
            <div class="m-bar-fill" :class="{ 'mf-green': enforcementActive, 'mf-red': !enforcementActive }"
              :style="{ width: Math.min((liveViolations / 40000) * 100, 100) + '%' }"></div>
          </div>
        </div>
        <div class="m-card">
          <div class="m-label">Traffic Delay</div>
          <div class="flex-row items-center gap-1">
            <span class="m-val" :class="{ 'col-green': enforcementActive, 'col-yellow': !enforcementActive }">
              +{{ currentDelay }}m
            </span>
            <Clock size="13" :style="{ color: enforcementActive ? 'var(--status-success)' : 'var(--status-warning)' }" />
          </div>
          <div class="m-bar">
            <div class="m-bar-fill" :class="{ 'mf-green': enforcementActive, 'mf-orange': !enforcementActive }"
              :style="{ width: Math.min((currentDelay / 60) * 100, 100) + '%' }"></div>
          </div>
        </div>
        <div class="m-card">
          <div class="m-label">Conviction Rate</div>
          <div class="flex-row items-center gap-1">
            <span class="m-val" :class="{ 'col-green': hotspot.convictionRate >= 50, 'col-yellow': hotspot.convictionRate < 50 }">
              {{ hotspot.convictionRate }}%
            </span>
            <Shield size="13" :style="{ color: hotspot.convictionRate >= 50 ? 'var(--status-success)' : 'var(--status-warning)' }" />
          </div>
          <div class="m-bar">
            <div class="m-bar-fill" :class="{ 'mf-green': hotspot.convictionRate >= 50, 'mf-orange': hotspot.convictionRate < 50 }"
              :style="{ width: hotspot.convictionRate + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="desc-block">
        <Activity size="11" style="color:var(--text-muted);flex-shrink:0;margin-top:2px" />
        <p class="desc-text">{{ hotspot.description }}</p>
      </div>

      <!-- Violation Type Breakdown -->
      <div v-if="violBreakdown.length" class="chart-card">
        <div class="chart-card-title">
          <span>Violation Type Breakdown</span>
          <span class="text-xs">Top offences at this station</span>
        </div>
        <div class="viol-list">
          <div v-for="v in violBreakdown" :key="v.name" class="viol-row">
            <div class="viol-name">{{ v.name }}</div>
            <div class="viol-bar-wrap">
              <div class="viol-bar" :style="{ width: v.pct + '%' }"></div>
            </div>
            <div class="viol-pct">{{ v.pct }}%</div>
          </div>
        </div>
      </div>

      <!-- Vehicle Distribution -->
      <div class="chart-card">
        <div class="chart-card-title">
          <span>Vehicle Distribution</span>
          <span class="text-xs">Real data · {{ hotspot.station }}</span>
        </div>
        <div class="donut-row flex-row items-center gap-4">
          <div class="donut-wrap">
            <div class="donut-ring" :style="{ background: donutGradient }"></div>
            <div class="donut-hole">
              <span class="donut-pct-val">{{ vehicleBreakdown[0]?.pct }}%</span>
              <span class="donut-pct-lbl">{{ vehicleBreakdown[0]?.name }}</span>
            </div>
          </div>
          <div class="legend-stack flex-col gap-2 flex-1">
            <div v-for="(v, i) in vehicleBreakdown" :key="v.name" class="leg-row">
              <div class="leg-dot" :style="{ background: vehicleColors[i] }"></div>
              <div class="flex-row justify-between flex-1">
                <span class="leg-name">{{ v.name }}</span>
                <span class="leg-pct">{{ v.pct }}%</span>
              </div>
              <div class="leg-bar">
                <div class="leg-fill" :style="{ width: v.pct + '%', background: vehicleColors[i] }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Monthly Trend (real data) -->
      <div class="chart-card">
        <div class="chart-card-title">
          <span>Monthly Violation Trend</span>
          <span class="text-xs">Nov 2023 – May 2024 · City-wide</span>
        </div>
        <div class="month-chart">
          <div v-for="(m, i) in trendData" :key="i" class="m-col">
            <div class="m-val-lbl">{{ (m.count/1000).toFixed(0) }}k</div>
            <div class="m-bar-outer">
              <div class="m-bar-inner"
                :class="{ 'm-peak': m.count === trendMax, 'm-weekend': m.label === 'Apr' }"
                :style="{ height: (m.count / trendMax * 100) + '%' }"
              ></div>
            </div>
            <div class="m-label-txt">{{ m.label }}</div>
          </div>
        </div>
      </div>

      <!-- Per-station hourly sparkline -->
      <div class="chart-card">
        <div class="chart-card-title">
          <span>Hourly Pattern — This Station</span>
          <span class="badge badge-danger text-xs">Peak {{ peakHourLabel }}</span>
        </div>
        <div class="sparkline-wrap">
          <div v-for="(cnt, h) in hourlyCounts" :key="h" class="spark-bar-col"
            :title="`${h.toString().padStart(2,'0')}:00 — ${cnt} violations`">
            <div class="spark-bar"
              :class="{ 'spark-peak': h === hotspot.peakHour, 'spark-near': Math.abs(h - hotspot.peakHour) === 1 }"
              :style="{ height: (cnt / hourlyMax * 100) + '%' }"
            ></div>
          </div>
        </div>
        <div class="spark-labels flex-row justify-between">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-row" data-html2canvas-ignore>
        <button class="btn-enforce" :class="{ 'btn-enforced': enforcementActive }" @click="handleDispatch">
          <component :is="enforcementActive ? CheckCircle2 : ShieldAlert" size="15" />
          <span>{{ enforcementActive ? 'Unit En Route · Tap to Recall' : 'Simulate Enforcement' }}</span>
        </button>
        <button class="btn-pdf" @click="handleExportPDF" :disabled="isExporting" :title="isExporting ? 'Generating PDF...' : 'Export 4-page PDF Report'">
          <span v-if="isExporting" class="pdf-spinner"></span>
          <FileDown v-else size="15" />
        </button>
      </div>

      <!-- PDF-only data block (hidden in UI, visible in PDF) -->
      <div class="pdf-only-block" style="display:none" data-html2canvas-include>
        <div class="pdf-block-title">OFFICIAL INCIDENT REPORT — GRIDLOCK AI</div>
        <table class="pdf-table">
          <tr><td>Station</td><td>{{ hotspot.station }} Police Station</td></tr>
          <tr><td>Coordinates</td><td>{{ hotspot.lat }}, {{ hotspot.lng }}</td></tr>
          <tr><td>Total Violations</td><td>{{ hotspot.violationCount.toLocaleString('en-IN') }}</td></tr>
          <tr><td>Conviction Rate</td><td>{{ hotspot.convictionRate }}%</td></tr>
          <tr><td>Peak Hour</td><td>{{ peakHourLabel }}</td></tr>
          <tr><td>Primary Offence</td><td>{{ hotspot.type }}</td></tr>
          <tr><td>Risk Score</td><td>{{ hotspot.riskScore }}/100</td></tr>
          <tr><td>BTP Junction</td><td>{{ hotspot.topJunction || 'N/A' }}</td></tr>
          <tr><td>Data Source</td><td>Bengaluru Traffic Police Violation DB · Jan–May 2024</td></tr>
          <tr><td>Generated</td><td>{{ new Date().toLocaleString('en-IN') }}</td></tr>
        </table>
      </div>

    </div>
  </div>
</template>

<style scoped>
.details-panel { width: 380px; max-height: 100%; display: flex; flex-direction: column; overflow: hidden; }

/* Header */
.panel-header {
  padding: 0.875rem 1.125rem; border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
}
.hotspot-icon { width: 32px; height: 32px; border-radius: 9px; border: 1px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.panel-title { font-size: 0.95rem; font-weight: 700; letter-spacing: -0.02em; }
.panel-sub { font-size: 0.63rem; color: var(--text-muted); margin-top: 2px; }
.risk-badge { font-size: 0.6rem; font-weight: 700; font-family: var(--font-mono); background: rgba(248,113,113,0.12); color: var(--status-danger); border: 1px solid rgba(248,113,113,0.3); padding: 1px 5px; border-radius: 4px; }
.close-btn { background: var(--bg-glass-light); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 0.35rem; border-radius: var(--radius-sm); transition: all 0.2s; display: flex; }
.close-btn:hover { color: var(--text-primary); background: var(--bg-glass-medium); }

/* Enforcement Banner */
.enforcement-banner { background: rgba(52,211,153,0.07); border-bottom: 1px solid rgba(52,211,153,0.18); padding: 0.4rem 1.125rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: var(--status-success); flex-shrink: 0; }
.banner-fade-enter-active, .banner-fade-leave-active { transition: all 0.3s; max-height: 50px; overflow: hidden; }
.banner-fade-enter-from, .banner-fade-leave-to { opacity: 0; max-height: 0; }

/* Content */
.panel-content { flex: 1; overflow-y: auto; padding: 0.875rem 1.125rem; gap: 0.875rem; display: flex; flex-direction: column; }

/* Camera */
.camera-block { border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); background: #050810; }
.cam-header { padding: 0.35rem 0.7rem; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); }
.rec-dot { width: 5px; height: 5px; background: var(--status-danger); border-radius: 50%; animation: blink-anim 1.2s infinite; }
@keyframes blink-anim { 0%,100%{opacity:1} 50%{opacity:0.15} }
.cam-viewport {
  height: 148px; position: relative; overflow: hidden;
  background: linear-gradient(rgba(5,8,16,0.7), rgba(5,8,16,0.7)),
    url('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600') center/cover;
}
.scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: rgba(79,142,245,0.5); box-shadow: 0 0 6px rgba(79,142,245,0.7); animation: scan 3s linear infinite; }
@keyframes scan { 0%{top:0} 100%{top:100%} }
.yolo-box { position: absolute; border: 1.5px solid var(--status-danger); background: rgba(248,113,113,0.05); animation: jitter 5s infinite; }
.box-a { top: 35%; left: 15%; width: 65px; height: 45px; }
.box-b { top: 50%; left: 55%; width: 80px; height: 50px; animation-duration: 4s; animation-direction: reverse; }
.box-c { top: 18%; left: 42%; width: 50px; height: 38px; animation-duration: 6.5s; }
@keyframes jitter { 0%,100%{transform:translate(0,0)} 25%{transform:translate(2px,-1px)} 50%{transform:translate(-1px,2px)} 75%{transform:translate(1px,1px)} }
.yolo-lbl { position: absolute; top: -17px; left: -1.5px; background: var(--status-danger); color: white; font-size: 0.52rem; font-weight: 700; padding: 1px 4px; white-space: nowrap; font-family: var(--font-mono); }
.corner { position: absolute; width: 10px; height: 10px; border-color: rgba(79,142,245,0.5); border-style: solid; }
.c1{top:5px;left:5px;border-width:2px 0 0 2px} .c2{top:5px;right:5px;border-width:2px 2px 0 0}
.c3{bottom:5px;left:5px;border-width:0 0 2px 2px} .c4{bottom:5px;right:5px;border-width:0 2px 2px 0}
.cam-alert-text { position: absolute; bottom: 6px; left: 0; right: 0; text-align: center; font-size: 0.5rem; font-family: var(--font-mono); font-weight: 700; color: var(--status-danger); letter-spacing: 0.1em; opacity: 0.85; }

/* Metrics */
.metrics-trio { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
.m-card { background: var(--bg-glass-light); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; }
.m-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; margin-bottom: 0.2rem; }
.m-val { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.03em; font-family: var(--font-mono); }
.col-green { color: var(--status-success); }
.col-red { color: var(--status-danger); }
.col-yellow { color: var(--status-warning); }
.m-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; margin-top: 0.4rem; overflow: hidden; }
.m-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }
.mf-red { background: linear-gradient(to right, var(--status-danger), #fb923c); }
.mf-green { background: linear-gradient(to right, var(--status-success), #34d399); }
.mf-orange { background: linear-gradient(to right, var(--status-warning), #f97316); }

/* Description */
.desc-block { display: flex; gap: 0.5rem; background: rgba(0,0,0,0.2); border-left: 2px solid var(--status-warning); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 0.65rem; }
.desc-text { font-size: 0.77rem; line-height: 1.55; color: var(--text-secondary); }

/* Chart Cards */
.chart-card { background: var(--bg-glass-light); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; }
.chart-card-title { display: flex; justify-content: space-between; align-items: center; font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.6rem; }

/* Violation breakdown */
.viol-list { display: flex; flex-direction: column; gap: 0.4rem; }
.viol-row { display: flex; align-items: center; gap: 0.5rem; }
.viol-name { font-size: 0.67rem; color: var(--text-secondary); width: 130px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viol-bar-wrap { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; }
.viol-bar { height: 100%; background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary)); border-radius: 99px; transition: width 0.5s; }
.viol-pct { font-size: 0.65rem; font-family: var(--font-mono); color: var(--text-muted); width: 26px; text-align: right; }

/* Donut */
.donut-row { align-items: center; }
.donut-wrap { position: relative; width: 72px; height: 72px; flex-shrink: 0; }
.donut-ring { width: 72px; height: 72px; border-radius: 50%; }
.donut-hole { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 48px; height: 48px; background: var(--bg-tertiary); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1; }
.donut-pct-val { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }
.donut-pct-lbl { font-size: 0.45rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.legend-stack { display: flex; flex-direction: column; gap: 0.4rem; }
.leg-row { display: flex; flex-direction: column; gap: 2px; }
.leg-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.leg-name { font-size: 0.67rem; color: var(--text-secondary); }
.leg-pct { font-size: 0.67rem; font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); }
.leg-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; width: 100%; }
.leg-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }

/* Month chart */
.month-chart { display: flex; align-items: flex-end; gap: 0.35rem; height: 72px; }
.m-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 3px; }
.m-val-lbl { font-size: 0.52rem; color: var(--text-muted); font-family: var(--font-mono); min-height: 12px; display: flex; align-items: flex-end; }
.m-bar-outer { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.m-bar-inner { width: 100%; border-radius: 2px 2px 0 0; background: var(--accent-primary); opacity: 0.5; min-height: 2px; transition: height 0.5s; }
.m-bar-inner.m-peak { opacity: 1; background: var(--status-danger); box-shadow: 0 0 8px rgba(248,113,113,0.4); }
.m-bar-inner.m-weekend { background: var(--accent-secondary); opacity: 0.65; }
.m-label-txt { font-size: 0.58rem; color: var(--text-muted); font-weight: 600; }

/* Sparkline */
.sparkline-wrap { display: flex; align-items: flex-end; gap: 1.5px; height: 44px; background: var(--bg-glass-light); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 3px 3px 0; }
.spark-bar-col { flex: 1; display: flex; align-items: flex-end; height: 100%; cursor: pointer; }
.spark-bar { width: 100%; border-radius: 1px 1px 0 0; background: rgba(79,142,245,0.35); min-height: 1px; }
.spark-bar.spark-peak { background: var(--status-danger) !important; box-shadow: 0 0 5px rgba(248,113,113,0.6); }
.spark-bar.spark-near { background: rgba(251,191,36,0.65) !important; }
.spark-labels { font-size: 0.55rem; color: var(--text-muted); margin-top: 3px; }

/* Actions */
.action-row { display: flex; gap: 0.5rem; }
.btn-enforce {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.65rem 1rem; border-radius: var(--radius-md);
  font-weight: 600; font-size: 0.78rem; cursor: pointer;
  border: 1px solid rgba(79,142,245,0.3);
  background: linear-gradient(135deg, rgba(79,142,245,0.12), rgba(155,108,247,0.12));
  color: var(--accent-primary); transition: all 0.25s;
}
.btn-enforce:hover { background: linear-gradient(135deg, rgba(79,142,245,0.22), rgba(155,108,247,0.22)); }
.btn-enforce.btn-enforced { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); color: var(--status-success); }
.btn-pdf { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-glass-light); color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
.btn-pdf:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }

/* Badge helpers */
.badge { padding: 1px 6px; border-radius: 99px; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-danger { background: var(--status-danger-dim); color: var(--status-danger); border: 1px solid rgba(248,113,113,0.25); }
.badge-warning { background: var(--status-warning-dim); color: var(--status-warning); border: 1px solid rgba(251,191,36,0.25); }
.badge-info { background: rgba(79,142,245,0.1); color: var(--accent-primary); border: 1px solid rgba(79,142,245,0.25); }
.text-xs { font-size: 0.62rem; color: var(--text-muted); }
.flex-1 { flex: 1; }

/* PDF block (visible only in pdf export via html2canvas) */
.pdf-only-block { background: white; color: #000; padding: 12px; border-radius: 6px; margin-top: 8px; }
.pdf-block-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 8px; }
.pdf-table { font-size: 9px; width: 100%; border-collapse: collapse; }
.pdf-table td { padding: 3px 6px; border: 1px solid #ddd; }
.pdf-table td:first-child { font-weight: 600; background: #f5f5f5; width: 35%; }
.btn-pdf:disabled { opacity: 0.6; cursor: wait; }
.pdf-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: var(--text-primary);
  border-radius: 50%;
  animation: spin-pdf 0.7s linear infinite;
}
@keyframes spin-pdf { to { transform: rotate(360deg); } }
</style>
