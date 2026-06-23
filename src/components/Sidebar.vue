<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { Search, AlertTriangle, Clock, MapPin, BarChart3, Bot, Sparkles, TrendingUp, Activity, Zap, Shield, Radio, BookOpen, ChevronDown } from '@lucide/vue';
import { mockHotspots, globalStats, hourlyTrend, weeklyHeatmap, dayOfWeekTrend, meta, offenceCodeLookup } from '../mockData';

const props = defineProps({ timeOffset: { type: Number, default: 0 } });
const emit = defineEmits(['select-hotspot', 'update:time-offset']);

// Sidebar tabs
const activeTab = ref('zones'); // 'zones' | 'heatmap' | 'offences'

const searchQuery = ref('');
const selectedSeverity = ref('all');

// Risk score calculation (rises with timeOffset)
const riskScore = (hs) => Math.min(100, hs.riskScore + Math.round(props.timeOffset * 1.5));

const sortedHotspots = computed(() => {
  let filtered = mockHotspots;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    filtered = mockHotspots.filter(hs =>
      hs.name.toLowerCase().includes(q) ||
      hs.type.toLowerCase().includes(q) ||
      (hs.station || '').toLowerCase().includes(q) ||
      (hs.topJunction || '').toLowerCase().includes(q)
    );
  }
  if (selectedSeverity.value !== 'all') {
    filtered = filtered.filter(hs => hs.severity.toLowerCase() === selectedSeverity.value);
  }
  return filtered.map(hs => ({
    ...hs,
    delayMinutes: hs.delayMinutes + Math.floor(props.timeOffset * 2.5),
    displayRisk: riskScore(hs),
  })).sort((a, b) => b.violationCount - a.violationCount);
});

const cityStats = computed(() => ({
  total: globalStats.totalViolations.toLocaleString('en-IN'),
  avgDelay: Math.round(sortedHotspots.value.reduce((s, h) => s + h.delayMinutes, 0) / (sortedHotspots.value.length || 1)),
  critical: sortedHotspots.value.filter(h => h.severity === 'Critical').length,
  conviction: globalStats.convictionRate,
}));

// Hourly heatmap data (real)
const peakHour = meta.peakHour;
const hourlyMax = Math.max(...hourlyTrend.map(h => h.count));

// AI Insights
const aiInsightText = ref('');
const isGenerating = ref(true);
let typingTimeout = null;

const generateInsight = () => {
  if (typingTimeout) clearTimeout(typingTimeout);
  isGenerating.value = true;
  aiInsightText.value = '';

  const topHs = sortedHotspots.value[0];
  if (!topHs) { isGenerating.value = false; return; }

  const peakLabel = `${peakHour.toString().padStart(2,'0')}:00–${(peakHour+1).toString().padStart(2,'0')}:00`;
  const timeContext = props.timeOffset === 0 ? 'currently' : `in +${props.timeOffset}h forecast`;

  const messages = [
    `🔍 Scanning ${sortedHotspots.value.length} active enforcement zones across Bengaluru...`,
    `⚠️  #1 Risk Zone ${timeContext}: ${topHs.name} · ${topHs.violationCount.toLocaleString('en-IN')} violations · Risk ${topHs.displayRisk}/100`,
    `⏰  City-wide peak violation window: ${peakLabel} (${meta.peakHourCount.toLocaleString('en-IN')} incidents). Deploy enforcement at ${(peakHour - 1).toString().padStart(2,'0')}:30 for maximum impact.`,
    props.timeOffset > 0
      ? `📈  Predictive model: congestion will increase ~${Math.round(props.timeOffset * 12)}% over next ${props.timeOffset}h if no intervention at top-3 zones.`
      : `🛡️  City-wide conviction rate: ${globalStats.convictionRate}% · ${(298450 - meta.approvedCount).toLocaleString('en-IN')} violations still pending action.`,
  ];

  let mi = 0, ci = 0;
  const typeChar = () => {
    if (mi >= messages.length) { isGenerating.value = false; return; }
    if (ci === 0 && mi > 0) aiInsightText.value += '\n\n';
    if (ci < messages[mi].length) {
      aiInsightText.value += messages[mi].charAt(ci);
      ci++;
      typingTimeout = setTimeout(typeChar, 12 + Math.random() * 18);
    } else { mi++; ci = 0; typingTimeout = setTimeout(typeChar, 350); }
  };
  typingTimeout = setTimeout(typeChar, 200);
};

// Weekly heatmap max for normalization
const heatmapMax = Math.max(...weeklyHeatmap.flatMap(d => d.hours.map(h => h.count)));
const heatColor = (intensity) => {
  if (intensity >= 80) return 'rgba(248,113,113,0.9)';
  if (intensity >= 60) return 'rgba(251,191,36,0.8)';
  if (intensity >= 35) return 'rgba(79,142,245,0.6)';
  if (intensity >= 10) return 'rgba(79,142,245,0.25)';
  return 'rgba(255,255,255,0.04)';
};

// SCITA stats from meta
const scitaPct = meta.scitaPct;
const scitaGap = 100 - scitaPct;
const scitaCircum = 2 * Math.PI * 20; // r=20
const scitaDash = (scitaPct / 100) * scitaCircum;
const scitaGapDash = scitaCircum - scitaDash;

// Offence code search
const offenceSearch = ref('');
const filteredOffences = computed(() => {
  if (!offenceSearch.value) return offenceCodeLookup.slice(0, 20);
  const q = offenceSearch.value.toLowerCase();
  return offenceCodeLookup.filter(o => o.code.includes(q) || o.name.toLowerCase().includes(q));
});
onMounted(() => generateInsight());
watch(() => props.timeOffset, () => generateInsight());
watch(searchQuery, () => generateInsight());
watch(selectedSeverity, () => generateInsight());
</script>

<template>
  <div class="sidebar glass-panel flex-col">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="flex-row items-center gap-3">
        <div class="sidebar-logo-icon">
          <MapPin size="15" stroke-width="2.5" />
        </div>
        <div>
          <h1 class="sidebar-title">Gridlock<span class="accent-text">AI</span></h1>
          <p class="sidebar-sub">Traffic Intelligence · Bengaluru</p>
        </div>
      </div>
      <div class="status-pill">
        <span class="status-dot"></span> LIVE
      </div>
    </div>

    <div class="sidebar-scroll">

      <!-- City Stats Grid -->
      <div class="section-pad">
        <div class="section-label flex-row items-center gap-2 mb-2">
          <Activity size="11" /><span>City Overview · Jan–May 2024</span>
        </div>
        <div class="stats-grid">
          <div class="stat-tile tile-red">
            <AlertTriangle size="13" />
            <div class="stat-val">{{ cityStats.total }}</div>
            <div class="stat-lbl">Total Violations</div>
          </div>
          <div class="stat-tile tile-yellow">
            <Clock size="13" />
            <div class="stat-val">+{{ cityStats.avgDelay }}m</div>
            <div class="stat-lbl">Avg City Delay</div>
          </div>
          <div class="stat-tile tile-blue">
            <Zap size="13" />
            <div class="stat-val">{{ cityStats.critical }}</div>
            <div class="stat-lbl">Critical Zones</div>
          </div>
          <div class="stat-tile tile-green">
            <Shield size="13" />
            <div class="stat-val">{{ cityStats.conviction }}%</div>
            <div class="stat-lbl">Conviction Rate</div>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- Search + Filter -->
      <div class="section-pad">
        <div class="search-wrap">
          <Search size="13" class="search-icon-el" />
          <input type="text" v-model="searchQuery" placeholder="Search junctions, areas, BTP codes..." class="search-inp" />
        </div>
        <div class="filter-row mt-2">
          <button v-for="f in ['all','critical','high','medium']" :key="f"
            class="filter-btn"
            :class="{ active: selectedSeverity === f, [`f-${f}`]: true }"
            @click="selectedSeverity = f"
          >
            {{ f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1) }}
          </button>
        </div>
      </div>

      <div class="divider" />

      <!-- AI Insights -->
      <div class="section-pad">
        <div class="ai-header flex-row items-center justify-between mb-2">
          <div class="flex-row items-center gap-2">
            <Bot size="11" class="accent-text" />
            <span class="section-label">Gridlock AI Assistant</span>
          </div>
          <Sparkles v-if="isGenerating" size="11" class="accent-text spin-anim" />
        </div>
        <div class="ai-box">
          <pre class="ai-text">{{ aiInsightText }}<span v-if="isGenerating" class="ai-cursor">▋</span></pre>
        </div>
      </div>

      <div class="divider" />

      <!-- Peak Hour Chart (Real Data) -->
      <div class="section-pad">
        <div class="flex-row justify-between items-center mb-2">
          <div class="section-label flex-row items-center gap-2">
            <BarChart3 size="11" /><span>Violations by Hour of Day</span>
          </div>
          <span class="badge badge-danger">Peak {{ meta.peakHourLabel }}</span>
        </div>
        <div class="hourly-chart">
          <div
            v-for="(h, i) in hourlyTrend"
            :key="i"
            class="h-bar-col"
            :title="`${h.label}: ${h.count.toLocaleString('en-IN')} violations`"
          >
            <div
              class="h-bar"
              :class="{ 'h-bar-peak': i === peakHour, 'h-bar-near': Math.abs(i - peakHour) === 1 }"
              :style="{ height: (h.count / hourlyMax * 100) + '%' }"
            ></div>
          </div>
        </div>
        <div class="hourly-labels flex-row justify-between">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
      </div>

      <div class="divider" />

      <!-- Predictive Slider -->
      <div class="section-pad">
        <div class="flex-row justify-between items-center mb-2">
          <div class="section-label flex-row items-center gap-2">
            <TrendingUp size="11" />
            <span>Predictive Model — {{ timeOffset === 0 ? 'Live Now' : `+${timeOffset}h Forecast` }}</span>
          </div>
          <span v-if="timeOffset > 0" class="badge badge-warning">+{{ Math.round(timeOffset * 12) }}% Risk</span>
        </div>
        <input type="range" min="0" max="12" :value="timeOffset"
          @input="e => emit('update:time-offset', Number(e.target.value))"
          class="time-slider"
        />
        <div class="slider-labels flex-row justify-between">
          <span>Now</span><span>+4h</span><span>+8h</span><span>+12h</span>
        </div>
      </div>

      <div class="divider" />

      <!-- Hotspot List -->
      <div class="section-pad hotspot-section">
        <div class="section-label flex-row items-center justify-between mb-2">
          <div class="flex-row items-center gap-2">
            <AlertTriangle size="11" /><span>Priority Hotspots</span>
          </div>
          <span class="text-xs">{{ sortedHotspots.length }} zones</span>
        </div>
        <div class="hotspot-list">
          <div
            v-for="(hs, idx) in sortedHotspots"
            :key="hs.id"
            class="hs-card glass-card"
            @click="emit('select-hotspot', hs)"
          >
            <div class="hs-rank mono">#{{ idx + 1 }}</div>
            <div class="hs-body flex-col flex-1">
              <div class="flex-row items-start justify-between gap-1">
                <span class="hs-name">{{ hs.name }}</span>
                <div class="flex-col items-end gap-1" style="flex-shrink:0">
                  <span class="badge" :class="{
                    'badge-danger': hs.severity === 'Critical',
                    'badge-warning': hs.severity === 'High',
                    'badge-info': hs.severity === 'Medium'
                  }">{{ hs.severity }}</span>
                  <span class="risk-chip" :class="{ 'risk-high': hs.displayRisk >= 70, 'risk-med': hs.displayRisk >= 40 && hs.displayRisk < 70 }">
                    RS {{ hs.displayRisk }}
                  </span>
                </div>
              </div>
              <!-- BTP Junction code if available -->
              <div v-if="hs.topJunction" class="btp-code mono mt-1">{{ hs.topJunction }}</div>
              <div class="flex-row items-center justify-between mt-1">
                <span class="hs-detail">{{ hs.violationCount.toLocaleString('en-IN') }} violations · Peak {{ hs.peakHour.toString().padStart(2,'0') }}:00</span>
                <div class="flex-row items-center gap-1">
                  <span class="worst-day-chip" title="Worst day of week">⛔ {{ hs.worstDayShort }}</span>
                  <span class="delay-chip" :class="{ 'delay-high': hs.delayMinutes > 30 }">+{{ hs.delayMinutes }}m</span>
                </div>
              </div>
              <div class="mini-bar mt-1">
                <div class="mini-fill"
                  :class="{ 'fill-red': hs.severity === 'Critical', 'fill-yellow': hs.severity === 'High', 'fill-blue': hs.severity === 'Medium' }"
                  :style="{ width: Math.min((hs.violationCount / 35000) * 100, 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div v-if="!sortedHotspots.length" class="no-results">No zones match your filter.</div>
        </div>
      </div>

      <div class="divider" />

      <!-- Weekly Day x Hour Heatmap -->
      <div class="section-pad">
        <div class="flex-row justify-between items-center mb-2">
          <div class="section-label flex-row items-center gap-2">
            <BarChart3 size="11" /><span>Day × Hour Violation Heatmap</span>
          </div>
          <span class="badge badge-danger">Worst: {{ meta.worstGlobalDay }} {{ meta.peakHourLabel }}</span>
        </div>
        <div class="weekly-heatmap">
          <div v-for="dayData in weeklyHeatmap" :key="dayData.day" class="hm-row">
            <div class="hm-day-label">{{ dayData.short }}</div>
            <div
              v-for="(cell, h) in dayData.hours"
              :key="h"
              class="hm-cell"
              :style="{ background: heatColor(cell.intensity) }"
              :title="`${dayData.day} ${h.toString().padStart(2,'0')}:00 — ${cell.count.toLocaleString('en-IN')} violations`"
            ></div>
          </div>
          <div class="hm-x-labels">
            <span class="hm-day-label" style="visibility:hidden">Mon</span>
            <span>12a</span><span style="margin-left:auto">6a</span><span style="margin-left:auto">12p</span><span style="margin-left:auto">6p</span><span style="margin-left:auto">11p</span>
          </div>
        </div>
        <div class="hm-legend flex-row items-center gap-1 mt-1">
          <span style="font-size:0.58rem;color:var(--text-muted);">Low</span>
          <div class="hm-grad"></div>
          <span style="font-size:0.58rem;color:var(--text-muted);">High</span>
        </div>
      </div>

      <div class="divider" />

      <!-- SCITA Integration + Case Closure Gap -->
      <div class="section-pad">
        <div class="section-label flex-row items-center gap-2 mb-2">
          <Radio size="11" /><span>SCITA Integration Status</span>
        </div>
        <div class="scita-row">
          <div class="scita-ring-wrap">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5" />
              <circle cx="26" cy="26" r="20" fill="none" stroke="#34d399" stroke-width="5"
                :stroke-dasharray="`${scitaDash} ${scitaGapDash}`"
                stroke-dashoffset="31.4" stroke-linecap="round" />
            </svg>
            <div class="scita-center mono">{{ scitaPct }}%</div>
          </div>
          <div class="scita-info flex-col gap-1">
            <div class="scita-stat">
              <span class="scita-val" style="color:var(--status-success)">{{ meta.scitaSent.toLocaleString('en-IN') }}</span>
              <span class="scita-lbl">Records synced to SCITA</span>
            </div>
            <div class="scita-stat">
              <span class="scita-val" style="color:var(--text-muted)">{{ (meta.scitaTotal - meta.scitaSent).toLocaleString('en-IN') }}</span>
              <span class="scita-lbl">Pending sync</span>
            </div>
          </div>
        </div>
        <!-- Case Closure Gap Alert -->
        <div class="closure-alert mt-2">
          <div class="closure-icon">⚠️</div>
          <div class="flex-col gap-1">
            <div class="closure-title">System Alert: Case Closure Gap</div>
            <div class="closure-body">0 of {{ meta.totalRows.toLocaleString('en-IN') }} violation cases have a <code>closed_datetime</code> record. {{ meta.approvedCount.toLocaleString('en-IN') }} approved violations remain officially open — a systemic accountability gap.</div>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- Offence Code Reference -->
      <div class="section-pad pb-extra">
        <div class="section-label flex-row items-center gap-2 mb-2">
          <BookOpen size="11" /><span>Offence Code Reference ({{ offenceCodeLookup.length }} codes)</span>
        </div>
        <div class="search-wrap mb-2">
          <Search size="11" class="search-icon-el" />
          <input v-model="offenceSearch" placeholder="Search code or offence name..." class="search-inp" style="font-size:0.74rem;" />
        </div>
        <div class="offence-list">
          <div v-for="o in filteredOffences" :key="o.code" class="offence-row">
            <span class="offence-code mono">{{ o.code }}</span>
            <span class="offence-name">{{ o.name }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.sidebar { width: 320px; max-height: 100%; display: flex; flex-direction: column; overflow: hidden; }

/* Header */
.sidebar-header {
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.sidebar-logo-icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg, rgba(79,142,245,0.2), rgba(155,108,247,0.2));
  border: 1px solid rgba(79,142,245,0.3);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-primary);
}
.sidebar-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.accent-text { color: var(--accent-primary); }
.sidebar-sub { font-size: 0.6rem; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.02em; }

.status-pill {
  display: flex; align-items: center; gap: 5px;
  background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.25);
  border-radius: 99px; padding: 3px 9px;
  font-size: 0.65rem; font-weight: 700; color: var(--status-success); letter-spacing: 0.06em;
}
.status-dot { width: 5px; height: 5px; background: var(--status-success); border-radius: 50%; animation: dot-blink 2s infinite; }
@keyframes dot-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

/* Scroll */
.sidebar-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

/* Section */
.section-pad { padding: 0.875rem 1.125rem; }
.section-label { font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.mt-2 { margin-top: 0.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-1 { margin-top: 0.25rem; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.stat-tile {
  border-radius: var(--radius-md); padding: 0.7rem;
  border: 1px solid; display: flex; flex-direction: column; gap: 0.2rem;
}
.tile-red { background: rgba(248,113,113,0.06); border-color: rgba(248,113,113,0.2); color: var(--status-danger); }
.tile-yellow { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.2); color: var(--status-warning); }
.tile-blue { background: rgba(79,142,245,0.06); border-color: rgba(79,142,245,0.2); color: var(--accent-primary); }
.tile-green { background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.2); color: var(--status-success); }
.stat-val { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; margin-top: 0.1rem; }
.stat-lbl { font-size: 0.62rem; color: var(--text-muted); font-weight: 500; }

/* Search */
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon-el { position: absolute; left: 0.7rem; color: var(--text-muted); }
.search-inp {
  width: 100%; background: var(--bg-glass-light); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); padding: 0.55rem 0.875rem 0.55rem 2.1rem;
  color: var(--text-primary); font-family: inherit; font-size: 0.82rem; outline: none;
  transition: all 0.2s;
}
.search-inp:focus { border-color: var(--border-accent); box-shadow: 0 0 0 3px rgba(79,142,245,0.1); }
.search-inp::placeholder { color: var(--text-muted); }

/* Filter */
.filter-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.filter-btn {
  padding: 2px 9px; border-radius: 99px; font-size: 0.67rem; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-muted); transition: all 0.2s;
}
.filter-btn:hover { color: var(--text-primary); }
.filter-btn.active.f-all { background: rgba(79,142,245,0.15); color: var(--accent-primary); border-color: rgba(79,142,245,0.4); }
.filter-btn.active.f-critical { background: var(--status-danger-dim); color: var(--status-danger); border-color: rgba(248,113,113,0.4); }
.filter-btn.active.f-high { background: var(--status-warning-dim); color: var(--status-warning); border-color: rgba(251,191,36,0.4); }
.filter-btn.active.f-medium { background: rgba(79,142,245,0.1); color: var(--accent-primary); border-color: rgba(79,142,245,0.3); }

/* AI Box */
.ai-box { background: rgba(79,142,245,0.04); border: 1px solid rgba(79,142,245,0.15); border-radius: var(--radius-md); padding: 0.7rem; max-height: 130px; overflow-y: auto; }
.ai-text { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-secondary); line-height: 1.65; white-space: pre-wrap; }
.ai-cursor { color: var(--accent-primary); animation: blink 1s step-start infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
.spin-anim { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Hourly chart */
.hourly-chart {
  display: flex; align-items: flex-end; gap: 1.5px;
  height: 56px; background: var(--bg-glass-light);
  border: 1px solid var(--border-color); border-radius: var(--radius-sm);
  padding: 4px 4px 0;
}
.h-bar-col { flex: 1; display: flex; align-items: flex-end; height: 100%; cursor: pointer; }
.h-bar { width: 100%; border-radius: 1px 1px 0 0; background: rgba(79,142,245,0.4); transition: background 0.2s; min-height: 1px; }
.h-bar:hover { background: rgba(79,142,245,0.8); }
.h-bar.h-bar-peak { background: var(--status-danger) !important; box-shadow: 0 0 6px rgba(248,113,113,0.6); }
.h-bar.h-bar-near { background: rgba(251,191,36,0.7) !important; }
.hourly-labels { font-size: 0.58rem; color: var(--text-muted); margin-top: 3px; }

/* Slider */
.time-slider { -webkit-appearance: none; width: 100%; height: 3px; background: rgba(255,255,255,0.08); border-radius: 99px; outline: none; cursor: pointer; }
.time-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); cursor: pointer; box-shadow: 0 0 8px rgba(79,142,245,0.6); transition: transform 0.15s; }
.time-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider-labels { font-size: 0.58rem; color: var(--text-muted); margin-top: 3px; }

/* Hotspot list */
.hotspot-section { padding-bottom: 1.5rem; }
.hotspot-list { display: flex; flex-direction: column; gap: 0.45rem; }
.hs-card { padding: 0.7rem; cursor: pointer; display: flex; gap: 0.5rem; align-items: flex-start; }
.hs-card:hover { border-color: rgba(79,142,245,0.35) !important; }
.hs-rank { font-size: 0.62rem; font-weight: 700; color: var(--text-muted); padding-top: 1px; min-width: 16px; font-family: var(--font-mono); }
.hs-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); line-height: 1.2; }

.risk-chip {
  font-size: 0.6rem; font-weight: 700; font-family: var(--font-mono);
  padding: 1px 5px; border-radius: 4px;
  background: rgba(79,142,245,0.1); color: var(--accent-primary);
  border: 1px solid rgba(79,142,245,0.25);
}
.risk-chip.risk-high { background: rgba(248,113,113,0.12); color: var(--status-danger); border-color: rgba(248,113,113,0.3); }
.risk-chip.risk-med { background: rgba(251,191,36,0.1); color: var(--status-warning); border-color: rgba(251,191,36,0.25); }

.btp-code { font-size: 0.62rem; font-family: var(--font-mono); color: var(--accent-cyan); background: rgba(34,211,238,0.07); border: 1px solid rgba(34,211,238,0.18); border-radius: 4px; padding: 1px 5px; display: inline-block; }

.hs-detail { font-size: 0.67rem; color: var(--text-muted); }
.delay-chip { font-size: 0.67rem; font-weight: 700; font-family: var(--font-mono); background: var(--status-success-dim); color: var(--status-success); border: 1px solid rgba(52,211,153,0.2); padding: 1px 5px; border-radius: 99px; flex-shrink: 0; }
.delay-chip.delay-high { background: var(--status-warning-dim); color: var(--status-warning); border-color: rgba(251,191,36,0.2); }

.mini-bar { height: 2px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; width: 100%; }
.mini-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
.fill-red { background: linear-gradient(to right, var(--status-danger), #fb923c); }
.fill-yellow { background: linear-gradient(to right, var(--status-warning), #f97316); }
.fill-blue { background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary)); }

.no-results { text-align: center; font-size: 0.78rem; color: var(--text-muted); padding: 2rem 0; }
.mono { font-family: var(--font-mono); }

/* Badge helpers */
.badge-danger { background: var(--status-danger-dim); color: var(--status-danger); border: 1px solid rgba(248,113,113,0.25); }
.badge-warning { background: var(--status-warning-dim); color: var(--status-warning); border: 1px solid rgba(251,191,36,0.25); }
.badge-info { background: rgba(79,142,245,0.1); color: var(--accent-primary); border: 1px solid rgba(79,142,245,0.25); }
/* Worst day chip */
.worst-day-chip { font-size: 0.6rem; font-weight: 700; font-family: var(--font-mono); padding: 1px 5px; border-radius: 4px; background: rgba(251,191,36,0.08); color: var(--status-warning); border: 1px solid rgba(251,191,36,0.2); }

/* Weekly Heatmap */
.weekly-heatmap { display: flex; flex-direction: column; gap: 2px; }
.hm-row { display: flex; align-items: center; gap: 2px; }
.hm-day-label { font-size: 0.55rem; font-weight: 700; color: var(--text-muted); width: 20px; flex-shrink: 0; font-family: var(--font-mono); }
.hm-cell { flex: 1; height: 7px; border-radius: 1px; transition: transform 0.1s; cursor: default; }
.hm-cell:hover { transform: scale(1.3); z-index: 1; }
.hm-x-labels { display: flex; align-items: center; font-size: 0.52rem; color: var(--text-muted); }
.hm-legend { gap: 0.4rem; }
.hm-grad { flex: 1; height: 4px; border-radius: 99px; background: linear-gradient(to right, rgba(79,142,245,0.15), rgba(251,191,36,0.7), rgba(248,113,113,0.9)); }

/* SCITA ring */
.scita-row { display: flex; align-items: center; gap: 1rem; }
.scita-ring-wrap { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
.scita-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 0.7rem; font-weight: 700; color: var(--status-success); }
.scita-info { flex: 1; }
.scita-stat { display: flex; flex-direction: column; gap: 1px; }
.scita-val { font-size: 0.85rem; font-weight: 700; font-family: var(--font-mono); }
.scita-lbl { font-size: 0.6rem; color: var(--text-muted); }
.gap-1 { gap: 0.25rem; }

/* Closure alert */
.closure-alert { background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.2); border-radius: var(--radius-md); padding: 0.65rem; display: flex; gap: 0.5rem; align-items: flex-start; }
.closure-icon { font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
.closure-title { font-size: 0.72rem; font-weight: 700; color: var(--status-warning); margin-bottom: 2px; }
.closure-body { font-size: 0.67rem; color: var(--text-muted); line-height: 1.5; }
.closure-body code { font-family: var(--font-mono); background: rgba(255,255,255,0.07); padding: 0 3px; border-radius: 3px; font-size: 0.65rem; }

/* Offence codes */
.offence-list { display: flex; flex-direction: column; gap: 0.3rem; max-height: 200px; overflow-y: auto; }
.offence-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
.offence-code { font-size: 0.65rem; font-weight: 700; color: var(--accent-cyan); background: rgba(34,211,238,0.08); border: 1px solid rgba(34,211,238,0.18); padding: 1px 5px; border-radius: 3px; min-width: 28px; text-align: center; }
.offence-name { font-size: 0.7rem; color: var(--text-secondary); }
.pb-extra { padding-bottom: 2rem; }
.flex-col { display: flex; flex-direction: column; }
</style>
