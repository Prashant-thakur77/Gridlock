<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { Search, AlertTriangle, Clock, MapPin, BarChart3, Bot, Sparkles, TrendingUp, Activity, Zap } from '@lucide/vue';
import { mockHotspots } from '../mockData';

const props = defineProps({
  timeOffset: { type: Number, default: 0 }
});
const emit = defineEmits(['select-hotspot', 'update:time-offset']);

const searchQuery = ref('');
const selectedSeverity = ref('all'); // filter: all, critical, high, medium

const sortedHotspots = computed(() => {
  let filtered = mockHotspots;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    filtered = mockHotspots.filter(hs => hs.name.toLowerCase().includes(q) || hs.type.toLowerCase().includes(q));
  }
  if (selectedSeverity.value !== 'all') {
    filtered = filtered.filter(hs => hs.severity.toLowerCase() === selectedSeverity.value);
  }
  return filtered.map(hs => ({
    ...hs,
    delayMinutes: hs.delayMinutes + Math.floor(props.timeOffset * 2.5)
  })).sort((a, b) => b.violationCount - a.violationCount);
});

const cityStats = computed(() => ({
  total: sortedHotspots.value.reduce((s, h) => s + h.violationCount, 0),
  avgDelay: Math.round(sortedHotspots.value.reduce((s, h) => s + h.delayMinutes, 0) / (sortedHotspots.value.length || 1)),
  critical: sortedHotspots.value.filter(h => h.severity === 'Critical').length,
}));

// AI Insights
const aiInsightText = ref('');
const isGenerating = ref(true);
let typingTimeout = null;

const generateInsight = () => {
  if (typingTimeout) clearTimeout(typingTimeout);
  isGenerating.value = true;
  aiInsightText.value = '';

  const topHs = sortedHotspots.value[0];
  if (!topHs) return;

  const timeContext = props.timeOffset === 0 ? 'currently' : `in +${props.timeOffset}h`;
  const messages = [
    `🔍 Scanning ${sortedHotspots.value.length} active zones across Bengaluru...`,
    `⚠️ ${topHs.name} is the highest-risk zone ${timeContext} with ${topHs.violationCount.toLocaleString('en-IN')} violations recorded.`,
    `🚓 Recommend immediate deployment of enforcement units to ${topHs.name}. Primary offence: ${topHs.type}.`,
    props.timeOffset > 0
      ? `📈 Predictive model indicates ${Math.round(props.timeOffset * 12)}% congestion increase over the next ${props.timeOffset} hours if no action is taken.`
      : `✅ Maintaining current monitoring. City-wide average delay: +${cityStats.value.avgDelay} minutes.`
  ];

  let msgIndex = 0;
  let charIndex = 0;
  const typeChar = () => {
    if (msgIndex >= messages.length) { isGenerating.value = false; return; }
    if (charIndex === 0 && msgIndex > 0) aiInsightText.value += '\n\n';
    if (charIndex < messages[msgIndex].length) {
      aiInsightText.value += messages[msgIndex].charAt(charIndex);
      charIndex++;
      typingTimeout = setTimeout(typeChar, 15 + Math.random() * 20);
    } else {
      msgIndex++; charIndex = 0;
      typingTimeout = setTimeout(typeChar, 400);
    }
  };
  typingTimeout = setTimeout(typeChar, 300);
};

onMounted(() => generateInsight());
watch(() => props.timeOffset, () => { generateInsight(); });
watch(searchQuery, () => { generateInsight(); });
</script>

<template>
  <div class="sidebar glass-panel flex-col">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="flex-row items-center gap-3">
        <div class="sidebar-logo-icon">
          <MapPin size="16" stroke-width="2.5" />
        </div>
        <div>
          <h1 class="sidebar-title">Gridlock<span class="highlight-text">AI</span></h1>
          <p class="sidebar-subtitle">Traffic Intelligence Dashboard</p>
        </div>
      </div>
      <div class="status-pill">
        <span class="status-dot"></span>
        Live
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="sidebar-scroll-area">

      <!-- City Overview Stats -->
      <div class="section-block">
        <div class="section-label flex-row items-center gap-2 mb-2">
          <Activity size="12" />
          <span>City Overview</span>
        </div>
        <div class="stats-grid">
          <div class="stat-tile stat-tile-danger">
            <div class="stat-tile-icon"><AlertTriangle size="14" /></div>
            <div class="stat-tile-val">{{ cityStats.total.toLocaleString('en-IN') }}</div>
            <div class="stat-tile-label">Total Violations</div>
          </div>
          <div class="stat-tile stat-tile-warning">
            <div class="stat-tile-icon"><Clock size="14" /></div>
            <div class="stat-tile-val">+{{ cityStats.avgDelay }}m</div>
            <div class="stat-tile-label">Avg. Delay</div>
          </div>
          <div class="stat-tile stat-tile-primary">
            <div class="stat-tile-icon"><Zap size="14" /></div>
            <div class="stat-tile-val">{{ cityStats.critical }}</div>
            <div class="stat-tile-label">Critical Zones</div>
          </div>
          <div class="stat-tile stat-tile-success">
            <div class="stat-tile-icon"><TrendingUp size="14" /></div>
            <div class="stat-tile-val">{{ sortedHotspots.length }}</div>
            <div class="stat-tile-label">Zones Tracked</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Search -->
      <div class="section-block">
        <div class="search-wrap">
          <Search size="14" class="search-icon" />
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search junctions, areas..."
            class="search-input"
          />
        </div>
        <!-- Severity Filter Pills -->
        <div class="filter-pills flex-row gap-2 mt-2">
          <button 
            v-for="f in ['all','critical','high','medium']" 
            :key="f"
            class="filter-pill"
            :class="{ active: selectedSeverity === f, [`pill-${f}`]: true }"
            @click="selectedSeverity = f"
          >
            {{ f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) }}
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- AI Insights -->
      <div class="section-block">
        <div class="section-label flex-row items-center justify-between mb-2">
          <div class="flex-row items-center gap-2">
            <Bot size="12" />
            <span>Gridlock AI Assistant</span>
          </div>
          <Sparkles v-if="isGenerating" size="12" class="sparkle-anim" />
        </div>
        <div class="ai-box">
          <pre class="ai-text">{{ aiInsightText }}<span v-if="isGenerating" class="cursor">▋</span></pre>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Predictive Model -->
      <div class="section-block">
        <div class="flex-row justify-between items-center mb-2">
          <div class="section-label flex-row items-center gap-2">
            <BarChart3 size="12" />
            <span>Predictive Model — {{ timeOffset === 0 ? 'Live Now' : `+${timeOffset}h Forecast` }}</span>
          </div>
          <span v-if="timeOffset > 0" class="badge badge-warning">+{{ Math.round(timeOffset * 12) }}% Risk</span>
        </div>
        <input
          type="range"
          min="0" max="12"
          :value="timeOffset"
          @input="e => emit('update:time-offset', Number(e.target.value))"
          class="time-slider"
        />
        <div class="slider-labels flex-row justify-between">
          <span>Now</span>
          <span>+4h</span>
          <span>+8h</span>
          <span>+12h Forecast</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Hotspots List -->
      <div class="section-block hotspot-section">
        <div class="section-label flex-row items-center justify-between mb-2">
          <div class="flex-row items-center gap-2">
            <AlertTriangle size="12" />
            <span>Priority Hotspots</span>
          </div>
          <span class="text-xs">{{ sortedHotspots.length }} zones</span>
        </div>
        <div class="hotspot-list">
          <div
            v-for="(hs, idx) in sortedHotspots"
            :key="hs.id"
            class="hotspot-card glass-card"
            @click="emit('select-hotspot', hs)"
          >
            <div class="hotspot-rank">#{{ idx + 1 }}</div>
            <div class="hotspot-info flex-col flex-1">
              <div class="flex-row items-center justify-between">
                <span class="hotspot-name">{{ hs.name }}</span>
                <span class="badge" :class="{
                  'badge-danger': hs.severity === 'Critical',
                  'badge-warning': hs.severity === 'High',
                  'badge-info': hs.severity === 'Medium'
                }">{{ hs.severity }}</span>
              </div>
              <div class="flex-row items-center justify-between mt-1">
                <div class="flex-row items-center gap-2">
                  <span class="hotspot-detail">{{ hs.violationCount.toLocaleString('en-IN') }} violations</span>
                  <span class="hotspot-dot">·</span>
                  <span class="hotspot-detail">{{ hs.type }}</span>
                </div>
                <span class="delay-tag" :class="{ 'delay-high': hs.delayMinutes > 30 }">
                  +{{ hs.delayMinutes }}m
                </span>
              </div>
              <!-- Mini bar -->
              <div class="mini-bar mt-1">
                <div 
                  class="mini-bar-fill"
                  :class="{
                    'bar-danger': hs.severity === 'Critical',
                    'bar-warning': hs.severity === 'High',
                    'bar-info': hs.severity === 'Medium'
                  }"
                  :style="{ width: Math.min((hs.violationCount / 35000) * 100, 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div v-if="sortedHotspots.length === 0" class="no-results">
            No hotspots match your search.
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 320px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.sidebar-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sidebar-logo-icon {
  background: linear-gradient(135deg, rgba(79,142,245,0.2), rgba(155,108,247,0.2));
  border: 1px solid rgba(79,142,245,0.3);
  border-radius: 10px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}

.sidebar-title {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.highlight-text { color: var(--accent-primary); }
.sidebar-subtitle {
  font-size: 0.62rem;
  color: var(--text-muted);
  margin-top: 2px;
  letter-spacing: 0.02em;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(52,211,153,0.1);
  border: 1px solid rgba(52,211,153,0.25);
  border-radius: 99px;
  padding: 3px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--status-success);
  letter-spacing: 0.05em;
}

.status-dot {
  width: 5px;
  height: 5px;
  background: var(--status-success);
  border-radius: 50%;
  animation: blink-dot 2s infinite;
}
@keyframes blink-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Scroll area */
.sidebar-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Section block */
.section-block {
  padding: 1rem 1.25rem;
}

.section-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

/* City Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stat-tile {
  border-radius: var(--radius-md);
  padding: 0.75rem;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.stat-tile-danger { background: rgba(248,113,113,0.06); border-color: rgba(248,113,113,0.2); }
.stat-tile-danger .stat-tile-icon { color: var(--status-danger); }
.stat-tile-danger .stat-tile-val { color: var(--status-danger); }

.stat-tile-warning { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.2); }
.stat-tile-warning .stat-tile-icon { color: var(--status-warning); }
.stat-tile-warning .stat-tile-val { color: var(--status-warning); }

.stat-tile-primary { background: rgba(79,142,245,0.06); border-color: rgba(79,142,245,0.2); }
.stat-tile-primary .stat-tile-icon { color: var(--accent-primary); }
.stat-tile-primary .stat-tile-val { color: var(--accent-primary); }

.stat-tile-success { background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.2); }
.stat-tile-success .stat-tile-icon { color: var(--status-success); }
.stat-tile-success .stat-tile-val { color: var(--status-success); }

.stat-tile-icon { display: flex; }
.stat-tile-val { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
.stat-tile-label { font-size: 0.65rem; color: var(--text-muted); font-weight: 500; }

/* Search */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-muted);
}
.search-input {
  width: 100%;
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.6rem 1rem 0.6rem 2.25rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
}
.search-input:focus {
  border-color: var(--border-accent);
  background: rgba(79,142,245,0.05);
  box-shadow: 0 0 0 3px rgba(79,142,245,0.1);
}
.search-input::placeholder { color: var(--text-muted); }

/* Filter pills */
.filter-pills { flex-wrap: wrap; }
.filter-pill {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  transition: all 0.2s;
  letter-spacing: 0.02em;
}
.filter-pill:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
.filter-pill.active.pill-all { background: rgba(79,142,245,0.15); color: var(--accent-primary); border-color: rgba(79,142,245,0.4); }
.filter-pill.active.pill-critical { background: var(--status-danger-dim); color: var(--status-danger); border-color: rgba(248,113,113,0.4); }
.filter-pill.active.pill-high { background: var(--status-warning-dim); color: var(--status-warning); border-color: rgba(251,191,36,0.4); }
.filter-pill.active.pill-medium { background: rgba(79,142,245,0.1); color: var(--accent-primary); border-color: rgba(79,142,245,0.3); }

/* AI Box */
.ai-box {
  background: rgba(79,142,245,0.05);
  border: 1px solid rgba(79,142,245,0.15);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  max-height: 140px;
  overflow-y: auto;
}
.ai-text {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}
.cursor {
  color: var(--accent-primary);
  animation: blink 1s step-start infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.sparkle-anim {
  color: var(--accent-primary);
  animation: spin 2s linear infinite;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Predictive Slider */
.time-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, var(--accent-primary) 0%, rgba(255,255,255,0.1) 0%);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  cursor: pointer;
  box-shadow: 0 0 10px rgba(79,142,245,0.6);
  transition: transform 0.15s;
}
.time-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider-labels {
  font-size: 0.62rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Hotspot section */
.hotspot-section { padding-bottom: 1.5rem; }
.hotspot-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hotspot-card {
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.6rem;
}
.hotspot-card:hover { border-color: var(--border-accent); }

.hotspot-rank {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  font-family: var(--font-mono);
  padding-top: 2px;
  min-width: 18px;
}

.hotspot-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.hotspot-detail {
  font-size: 0.7rem;
  color: var(--text-muted);
}
.hotspot-dot { color: var(--text-muted); font-size: 0.7rem; }

.delay-tag {
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--status-success);
  background: var(--status-success-dim);
  border: 1px solid rgba(52,211,153,0.2);
  padding: 1px 6px;
  border-radius: 99px;
}
.delay-tag.delay-high {
  color: var(--status-warning);
  background: var(--status-warning-dim);
  border-color: rgba(251,191,36,0.2);
}

/* Mini progress bar */
.mini-bar {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.05);
  border-radius: 99px;
  overflow: hidden;
}
.mini-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s ease;
}
.bar-danger { background: linear-gradient(to right, var(--status-danger), #fb923c); }
.bar-warning { background: linear-gradient(to right, var(--status-warning), #f97316); }
.bar-info { background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary)); }

.no-results {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 2rem 0;
}
</style>
