<script setup>
import { ref } from 'vue';
import MapLayer from './components/MapLayer.vue';
import Sidebar from './components/Sidebar.vue';
import DetailsPanel from './components/DetailsPanel.vue';
import { mockHotspots } from './mockData.js';

// State
const selectedHotspot = ref(null);
const currentTimeOffset = ref(0);
const enforcementActive = ref(false);

const handleHotspotSelect = (hotspot) => {
  selectedHotspot.value = hotspot;
  enforcementActive.value = false;
};

const handleEnforcementToggle = (val) => {
  enforcementActive.value = val;
};

// Compute city-wide stats from real data
const totalViolations = mockHotspots.reduce((sum, h) => sum + h.violationCount, 0);
const criticalCount = mockHotspots.filter(h => h.severity === 'Critical').length;
const now = new Date();
const timeString = ref(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
setInterval(() => {
  timeString.value = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}, 1000);
</script>

<template>
  <div class="app-container">
    <!-- Map Background -->
    <MapLayer 
      class="map-layer" 
      :time-offset="currentTimeOffset" 
      :enforcement-active="enforcementActive"
      :selected-hotspot="selectedHotspot"
      @select-hotspot="handleHotspotSelect" 
    />

    <!-- Top Navigation Bar -->
    <div class="top-bar">
      <div class="top-bar-left flex-row items-center gap-3">
        <div class="logo-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--accent-primary)" opacity="0.9"/>
            <path d="M2 17L12 22L22 17" stroke="var(--accent-secondary)" stroke-width="2" stroke-linecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <div class="top-logo-text">Gridlock<span class="accent-text">AI</span></div>
          <div class="top-subtitle">Bengaluru Traffic Intelligence Platform</div>
        </div>
      </div>
      <div class="top-bar-stats flex-row items-center gap-4">
        <div class="top-stat">
          <span class="top-stat-val">{{ totalViolations.toLocaleString('en-IN') }}</span>
          <span class="top-stat-label">Total Violations</span>
        </div>
        <div class="top-divider"></div>
        <div class="top-stat">
          <span class="top-stat-val" style="color: var(--status-danger)">{{ criticalCount }}</span>
          <span class="top-stat-label">Critical Zones</span>
        </div>
        <div class="top-divider"></div>
        <div class="top-stat">
          <span class="top-stat-val" style="color: var(--status-warning)">{{ mockHotspots.length }}</span>
          <span class="top-stat-label">Hotspots Tracked</span>
        </div>
        <div class="top-divider"></div>
        <div class="top-stat">
          <span class="live-dot"></span>
          <span class="top-stat-val" style="color:var(--accent-cyan)">LIVE</span>
          <span class="top-stat-label mono">{{ timeString }}</span>
        </div>
      </div>
    </div>

    <!-- Glassmorphic Overlays -->
    <div class="overlays-container">
      <Sidebar 
        :time-offset="currentTimeOffset" 
        @update:time-offset="val => currentTimeOffset = val" 
        @select-hotspot="handleHotspotSelect" 
      />
      <Transition name="panel-slide">
        <DetailsPanel 
          v-if="selectedHotspot" 
          :hotspot="selectedHotspot" 
          :enforcement-active="enforcementActive"
          @toggle-enforcement="handleEnforcementToggle"
          @close="selectedHotspot = null" 
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.map-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  height: 56px;
  background: rgba(8, 12, 18, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  box-shadow: 0 4px 30px rgba(0,0,0,0.5);
}

.logo-mark {
  background: rgba(79,142,245,0.1);
  border: 1px solid rgba(79,142,245,0.2);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-logo-text {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.accent-text { color: var(--accent-primary); }

.top-subtitle {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.03em;
  margin-top: 1px;
}

.top-bar-stats {
  background: var(--bg-glass-light);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.4rem 1rem;
}

.top-stat {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.top-stat-val {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.top-stat-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}

.top-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 6px var(--accent-cyan);
  animation: pulse-live 2s ease-in-out infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--accent-cyan); }
  50% { opacity: 0.6; box-shadow: 0 0 14px var(--accent-cyan); }
}

/* Panels */
.overlays-container {
  position: absolute;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  padding: 1rem;
}

.overlays-container > * {
  pointer-events: auto;
}

/* Panel slide transition */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
