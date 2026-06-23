<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { Search, AlertTriangle, Clock, MapPin, BarChart3, Bot, Sparkles } from '@lucide/vue';
import { mockHotspots } from '../mockData';

const props = defineProps({
  timeOffset: { type: Number, default: 0 }
});
const emit = defineEmits(['select-hotspot', 'update:time-offset']);

const sortedHotspots = computed(() => {
  // If time offset > 0, we randomly increase delay minutes in the UI to simulate prediction
  return [...mockHotspots].map(hs => ({
    ...hs,
    delayMinutes: hs.delayMinutes + Math.floor(props.timeOffset * 2.5) // Fake prediction logic
  })).sort((a, b) => b.delayMinutes - a.delayMinutes);
});

// AI Insights Simulation
const aiInsightText = ref('');
const isGenerating = ref(true);

const generateInsight = () => {
  isGenerating.value = true;
  aiInsightText.value = '';
  
  const topHs = sortedHotspots.value[0];
  
  const messages = [
    "Analyzing current congestion levels across Bengaluru...",
    `${topHs.name} is experiencing critical parking congestion with ${topHs.violationCount} recorded violations.`,
    `Recommend deploying traffic enforcement units to ${topHs.name} to mitigate ${topHs.type}.`,
    "Prediction: Congestion will peak in 45 minutes."
  ];
  
  let msgIndex = 0;
  let charIndex = 0;
  
  const typeChar = () => {
    if (msgIndex >= messages.length) {
      isGenerating.value = false;
      return;
    }
    
    if (charIndex === 0 && msgIndex > 0) {
      aiInsightText.value += '\n\n';
    }
    
    if (charIndex < messages[msgIndex].length) {
      aiInsightText.value += messages[msgIndex].charAt(charIndex);
      charIndex++;
      setTimeout(typeChar, 20 + Math.random() * 30);
    } else {
      msgIndex++;
      charIndex = 0;
      setTimeout(typeChar, 500);
    }
  };
  
  setTimeout(typeChar, 500);
};

onMounted(() => {
  generateInsight();
});

watch(() => props.timeOffset, () => {
  if (props.timeOffset > 0) {
    aiInsightText.value = "Recalculating predictions based on time offset...";
    generateInsight();
  }
});
</script>

<template>
  <div class="sidebar glass-panel flex-col">
    <div class="header">
      <div class="logo-container">
        <div class="logo-icon">
          <MapPin size="20" stroke-width="2.5" />
        </div>
        <h1 class="text-h2 logo-text">Gridlock<span class="highlight">AI</span></h1>
      </div>
      <p class="text-small mt-1">Live Parking Congestion Monitor</p>
    </div>

    <div class="sidebar-content">
      <div class="global-stats p-4">
      <div class="stat-card">
        <AlertTriangle size="16" class="text-danger" />
        <div>
          <div class="stat-val text-h3">142</div>
          <div class="text-small">Active Violations</div>
        </div>
      </div>
      <div class="stat-card">
        <Clock size="16" class="text-warning" />
        <div>
          <div class="stat-val text-h3">+24m</div>
          <div class="text-small">Avg City Delay</div>
        </div>
      </div>
    </div>

    <div class="search-bar">
      <Search size="16" class="search-icon" />
      <input type="text" placeholder="Search areas or roads..." />
    </div>

    <!-- AI Insights Feature -->
    <div class="ai-insights-section">
      <div class="flex-row items-center gap-1 mb-1">
        <Bot size="14" class="text-accent" />
        <span class="text-small font-semibold text-accent">Gridlock AI Assistant</span>
        <Sparkles v-if="isGenerating" size="12" class="text-accent animate-pulse" />
      </div>
      <div class="ai-text-box text-small">
        {{ aiInsightText }}
        <span v-if="isGenerating" class="typing-cursor">|</span>
      </div>
    </div>

    <!-- Predictive Modeling Feature -->
    <div class="predictive-model-section flex-col">
      <div class="flex-row justify-between items-center mb-1">
        <span class="text-small font-semibold highlight">Predictive Model AI</span>
        <span class="text-small text-muted">{{ timeOffset === 0 ? 'Live Now' : `+${timeOffset} Hrs` }}</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="12" 
        :value="timeOffset"
        @input="e => emit('update:time-offset', Number(e.target.value))"
        class="time-slider"
      />
      <div class="flex-row justify-between text-small text-muted" style="font-size: 0.65rem; margin-top: 0.2rem">
        <span>Now</span>
        <span>+12h Forecast</span>
      </div>
    </div>

    <div class="hotspots-section flex-col">
      <div class="section-title flex-row items-center justify-between">
        <h3 class="text-body font-semibold">Priority Hotspots</h3>
        <BarChart3 size="14" class="text-muted" />
      </div>

      <div class="hotspots-list flex-col gap-2">
        <div 
          v-for="hs in sortedHotspots" 
          :key="hs.id"
          class="hotspot-item glass-card flex-row justify-between items-center"
          @click="emit('select-hotspot', hs)"
        >
          <div class="flex-col">
            <span class="hs-name">{{ hs.name }}</span>
            <span class="text-small flex-row items-center gap-1">
              <span class="indicator" :class="'indicator-' + hs.severity.toLowerCase()"></span>
              {{ hs.severity }} Priority
            </span>
          </div>
          <div class="delay-badge">
            {{ hs.delayMinutes }}m
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 340px;
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-glow);
}

.logo-text {
  letter-spacing: -0.05em;
}
.highlight {
  color: var(--accent-primary);
}
.mt-1 { margin-top: 0.25rem; }

.global-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-card {
  background: var(--bg-glass-light);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.text-danger { color: var(--status-danger); }
.text-warning { color: var(--status-warning); }
.stat-val { line-height: 1.1; margin-bottom: 0.1rem; }

.search-bar {
  margin: 0 1.5rem;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
}

.search-bar input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 0.6rem 1rem 0.6rem 2.5rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.search-bar input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.ai-insights-section {
  margin: 1rem 1.5rem 0;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
}

.text-accent {
  color: var(--accent-primary);
}

.ai-text-box {
  color: var(--text-secondary);
  line-height: 1.4;
  min-height: 60px;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: monospace;
  padding-right: 5px; /* for scrollbar */
}

.typing-cursor {
  display: inline-block;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.predictive-model-section {
  margin: 1rem 1.5rem 0;
  padding: 1rem;
  background: rgba(139, 92, 246, 0.08); /* Purple tint for AI */
  border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.mb-1 { margin-bottom: 0.25rem; }

.time-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  outline: none;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-secondary);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.6);
  transition: transform 0.1s;
}

.time-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.hotspots-section {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem 1.5rem;
}

.section-title {
  margin-bottom: 0.75rem;
}
.font-semibold { font-weight: 600; }

.hotspots-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-right: 0.5rem;
}

.hotspot-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.hs-name {
  font-weight: 500;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.indicator-critical { background: var(--status-danger); box-shadow: 0 0 5px var(--status-danger); }
.indicator-high { background: var(--status-warning); }
.indicator-medium { background: var(--accent-primary); }

.delay-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>
