import realData from './realData.json';

// Re-export everything from the enriched real dataset
export const mockHotspots = realData.hotspots;
export const globalStats = realData.globalStats;
export const monthlyTrend = realData.monthlyTrend;
export const hourlyTrend = realData.hourlyTrend;
export const vehicleDistribution = realData.vehicleDistribution;
export const violationTypes = realData.violationTypes;
export const meta = realData.meta;

export const generateHeatmapData = () => realData.heatmapData;
