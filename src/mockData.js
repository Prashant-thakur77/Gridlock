import realData from './realData.json';

export const mockHotspots = realData.hotspots;
export const globalStats = realData.globalStats;
export const monthlyTrend = realData.monthlyTrend;
export const hourlyTrend = realData.hourlyTrend;
export const dayOfWeekTrend = realData.dayOfWeekTrend;
export const weeklyHeatmap = realData.weeklyHeatmap;
export const vehicleDistribution = realData.vehicleDistribution;
export const violationTypes = realData.violationTypes;
export const offenceCodeLookup = realData.offenceCodeLookup;
export const meta = realData.meta;

export const generateHeatmapData = () => realData.heatmapData;
