<script setup>
import { onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet.heat';
import { mockHotspots, generateHeatmapData } from '../mockData';

const props = defineProps({
  timeOffset: { type: Number, default: 0 },
  enforcementActive: { type: Boolean, default: false },
  selectedHotspot: { type: Object, default: null }
});
const emit = defineEmits(['select-hotspot']);
const mapContainer = ref(null);
let map = null;
let heatLayer = null;

const renderHeatmap = () => {
  if (heatLayer && map) {
    map.removeLayer(heatLayer);
  }
  
  const baseData = generateHeatmapData();
  
  // Calculate distances and reduce intensity if enforcement is active nearby
  const adjustedData = baseData.map(pt => {
    let intensity = Math.min(pt[2] + (props.timeOffset * 0.1), 1.0);
    
    if (props.enforcementActive && props.selectedHotspot) {
      // Distance formula to check if point is near selected hotspot
      const dx = pt[0] - props.selectedHotspot.lat;
      const dy = pt[1] - props.selectedHotspot.lng;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // If within ~1km (roughly 0.01 degrees), drastically reduce intensity
      if (dist < 0.015) {
        intensity = intensity * 0.1; 
      }
    }

    return [
      pt[0] + (Math.random() - 0.5) * 0.005 * props.timeOffset,
      pt[1] + (Math.random() - 0.5) * 0.005 * props.timeOffset,
      intensity
    ];
  });

  heatLayer = L.heatLayer(adjustedData, {
    radius: props.enforcementActive ? 15 : 20 + (props.timeOffset * 2), 
    blur: 25,
    maxZoom: 14,
    gradient: props.enforcementActive ? 
      { 0.4: '#1e3a8a', 0.6: '#3b82f6', 1.0: '#8b5cf6' } : // Cooler colors when enforced
      { 0.2: '#1e3a8a', 0.4: '#3b82f6', 0.6: '#8b5cf6', 0.8: '#ec4899', 1.0: '#ef4444' }
  }).addTo(map);
};

onMounted(() => {
  // Initialize map centered on Bengaluru
  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false
  }).setView([12.9716, 77.5946], 13);

  // Use a premium dark mode tile layer (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);

  renderHeatmap();

  // Custom Icon for Hotspots
  const pulseIcon = L.divIcon({
    className: 'custom-pulse-icon',
    html: `<div class="pulse-ring"></div><div class="pulse-dot"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Add Hotspot Markers
  mockHotspots.forEach(hotspot => {
    const marker = L.marker([hotspot.lat, hotspot.lng], { icon: pulseIcon }).addTo(map);
    
    // Minimal popup
    marker.bindTooltip(`<b>${hotspot.name}</b><br>Severity: ${hotspot.severity}`, {
      className: 'custom-tooltip',
      direction: 'top'
    });

    marker.on('click', () => {
      // Pan to center
      map.flyTo([hotspot.lat, hotspot.lng], 15, { duration: 1.5 });
      emit('select-hotspot', hotspot);
    });
  });

  // Add simulated traffic flow lines (polylines) connecting major roads
  const flowPath1 = [[12.9754, 77.6061], [12.9766, 77.5713]]; // MG Road to Majestic
  const flowPath2 = [[12.9784, 77.6408], [12.9352, 77.6245]]; // Indiranagar to Koramangala
  
  [flowPath1, flowPath2].forEach(path => {
    L.polyline(path, {
      color: 'var(--accent-primary)',
      weight: 3,
      opacity: 0.6,
      className: 'animated-flow-line'
    }).addTo(map);
  });
});

watch([() => props.timeOffset, () => props.enforcementActive], () => {
  renderHeatmap();
});
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style>
.map-container {
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary); /* Fallback */
}

/* Leaflet Overrides */
.leaflet-container {
  font-family: var(--font-family) !important;
}

/* Custom Marker Styling */
.custom-pulse-icon {
  display: flex;
  justify-content: center;
  align-items: center;
}

.pulse-dot {
  width: 12px;
  height: 12px;
  background-color: var(--status-danger);
  border-radius: 50%;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 10px var(--status-danger);
}

.pulse-ring {
  width: 30px;
  height: 30px;
  background-color: var(--status-danger);
  border-radius: 50%;
  position: absolute;
  z-index: 1;
  opacity: 0.5;
  animation: pulse 1.5s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

/* Tooltip Override */
.leaflet-tooltip.custom-tooltip {
  background: var(--bg-glass);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  padding: 0.5rem 0.75rem;
}
.leaflet-tooltip-top.custom-tooltip:before {
  border-top-color: var(--border-color);
}

/* Animated Flow Lines */
.animated-flow-line {
  stroke-dasharray: 10 15;
  animation: flowAnimation 20s linear infinite;
}

@keyframes flowAnimation {
  to {
    stroke-dashoffset: -1000;
  }
}
</style>
