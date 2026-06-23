<script setup>
import { ref } from 'vue';
import MapLayer from './components/MapLayer.vue';
import Sidebar from './components/Sidebar.vue';
import DetailsPanel from './components/DetailsPanel.vue';

// State
const selectedHotspot = ref(null);
const currentTimeOffset = ref(0); // 0 = now, up to 12 hours ahead
const enforcementActive = ref(false);

const handleHotspotSelect = (hotspot) => {
  selectedHotspot.value = hotspot;
  enforcementActive.value = false; // reset when changing hotspots
};

const handleEnforcementToggle = (val) => {
  enforcementActive.value = val;
};
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

    <!-- Glassmorphic Overlays -->
    <div class="overlays-container">
      <Sidebar 
        :time-offset="currentTimeOffset" 
        @update:time-offset="val => currentTimeOffset = val" 
        @select-hotspot="handleHotspotSelect" 
      />
      <DetailsPanel 
        v-if="selectedHotspot" 
        :hotspot="selectedHotspot" 
        :enforcement-active="enforcementActive"
        @toggle-enforcement="handleEnforcementToggle"
        @close="selectedHotspot = null" 
      />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.map-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1; /* Base layer */
}

.overlays-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through to map where there's no panel */
  z-index: 10;
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
}

.overlays-container > * {
  pointer-events: auto; /* Re-enable clicks on the panels themselves */
}

/* Animations for panels entering */
.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
