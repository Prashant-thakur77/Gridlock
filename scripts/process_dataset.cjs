const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const inputFilePath = '/home/prashant/Downloads/jan to may police violation_anonymized791b166.csv';
const outputFilePath = path.join(__dirname, '../src/realData.json');

const stations = {};
const heatmapPoints = [];
let totalRows = 0;

console.log('Starting data aggregation pipeline...');

fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on('data', (row) => {
    totalRows++;
    
    // Only process rows that have valid lat/lng and are actually parking related
    // The dataset might have many violation types, we filter loosely
    if (!row.latitude || !row.longitude || !row.police_station) return;

    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const stationName = row.police_station.trim();

    // Collect first 10,000 points for the heatmap
    if (heatmapPoints.length < 10000) {
      heatmapPoints.push([lat, lng, 0.5]); // base intensity 0.5
    }

    // Aggregate by station
    if (!stations[stationName]) {
      stations[stationName] = {
        name: stationName,
        latSum: 0,
        lngSum: 0,
        count: 0,
        vehicles: {},
        violations: {}
      };
    }

    const s = stations[stationName];
    s.latSum += lat;
    s.lngSum += lng;
    s.count++;

    // Track vehicles
    const vType = row.vehicle_type || 'UNKNOWN';
    s.vehicles[vType] = (s.vehicles[vType] || 0) + 1;

    // Track violations
    // The CSV has violation_type as a string array like '["WRONG PARKING"]'
    let violType = 'PARKING';
    try {
      const parsed = JSON.parse(row.violation_type);
      if (parsed && parsed.length > 0) violType = parsed[0];
    } catch(e) {
      violType = row.violation_type || 'PARKING';
    }
    s.violations[violType] = (s.violations[violType] || 0) + 1;
  })
  .on('end', () => {
    console.log(`Finished processing ${totalRows} rows.`);
    
    // Process aggregated station data
    const aggregatedHotspots = Object.values(stations)
      .map(s => {
        // Find top vehicle
        const topVehicle = Object.keys(s.vehicles).sort((a, b) => s.vehicles[b] - s.vehicles[a])[0];
        
        // Find top violation
        const topViolation = Object.keys(s.violations).sort((a, b) => s.violations[b] - s.violations[a])[0];

        // Determine severity based on count relative to others
        return {
          id: `station-${Math.random().toString(36).substr(2, 9)}`,
          name: `${s.name} Junction`,
          lat: s.latSum / s.count,
          lng: s.lngSum / s.count,
          violationCount: s.count,
          type: topViolation,
          description: `Chronic issue at ${s.name} involving mostly ${topVehicle}s. Primary offence: ${topViolation}.`,
          // Fake delay minutes based on count (just for UI)
          delayMinutes: Math.min(Math.floor(s.count / 10), 60)
        };
      })
      .sort((a, b) => b.violationCount - a.violationCount) // Sort by highest violations
      .slice(0, 10); // Take top 10 worst stations

    // Assign severity labels based on rank
    aggregatedHotspots.forEach((hs, index) => {
      if (index < 2) hs.severity = 'Critical';
      else if (index < 5) hs.severity = 'High';
      else hs.severity = 'Medium';
    });

    const finalData = {
      heatmapData: heatmapPoints,
      hotspots: aggregatedHotspots
    };

    fs.writeFileSync(outputFilePath, JSON.stringify(finalData, null, 2));
    console.log(`Aggregation complete! Saved to ${outputFilePath}`);
    console.log(`Top Hotspot: ${aggregatedHotspots[0].name} with ${aggregatedHotspots[0].violationCount} violations.`);
  });
