const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT = '/home/prashant/Downloads/jan to may police violation_anonymized791b166.csv';
const OUTPUT = path.join(__dirname, '../src/realData.json');

// --- Accumulators ---
const stations = {};
const heatmapPoints = [];
const globalHourly = new Array(24).fill(0);
const globalMonthly = {};
const globalVehicles = {};
const globalViolTypes = {};
let totalRows = 0;
let approvedCount = 0;
let rejectedCount = 0;

console.log('🚀 Starting enhanced data aggregation pipeline...');

fs.createReadStream(INPUT)
  .pipe(csv())
  .on('data', (row) => {
    totalRows++;
    if (!row.latitude || !row.longitude || !row.police_station) return;

    const lat  = parseFloat(row.latitude);
    const lng  = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const station  = row.police_station.trim();
    const vType    = (row.vehicle_type || 'UNKNOWN').trim();
    const jName    = (row.junction_name || '').trim();
    const valStat  = (row.validation_status || '').trim().toLowerCase();
    const dt       = row.created_datetime || '';

    // --- Global hourly ---
    if (dt.length >= 14) {
      const hour = parseInt(dt.substring(11, 13), 10);
      if (!isNaN(hour)) globalHourly[hour]++;
    }

    // --- Global monthly ---
    if (dt.length >= 7) {
      const monthKey = dt.substring(0, 7); // e.g. "2024-01"
      globalMonthly[monthKey] = (globalMonthly[monthKey] || 0) + 1;
    }

    // --- Global vehicles ---
    globalVehicles[vType] = (globalVehicles[vType] || 0) + 1;

    // --- Global validation ---
    if (valStat === 'approved') approvedCount++;
    if (valStat === 'rejected') rejectedCount++;

    // --- Violation types ---
    let violTypes = [];
    try {
      const parsed = JSON.parse(row.violation_type);
      if (Array.isArray(parsed)) violTypes = parsed;
    } catch(e) { violTypes = row.violation_type ? [row.violation_type] : ['PARKING']; }
    violTypes.forEach(vt => {
      const clean = (vt || 'PARKING').toString().trim();
      globalViolTypes[clean] = (globalViolTypes[clean] || 0) + 1;
    });

    // --- Heatmap points ---
    if (heatmapPoints.length < 15000) {
      heatmapPoints.push([lat, lng, 0.5]);
    }

    // --- Per station ---
    if (!stations[station]) {
      stations[station] = {
        name: station,
        latSum: 0, lngSum: 0, count: 0,
        approved: 0, rejected: 0,
        vehicles: {},
        violations: {},
        hourly: new Array(24).fill(0),
        junctions: {},
      };
    }
    const s = stations[station];
    s.latSum += lat;
    s.lngSum += lng;
    s.count++;

    if (valStat === 'approved') s.approved++;
    if (valStat === 'rejected') s.rejected++;

    s.vehicles[vType] = (s.vehicles[vType] || 0) + 1;

    violTypes.forEach(vt => {
      const clean = (vt || 'PARKING').toString().trim();
      s.violations[clean] = (s.violations[clean] || 0) + 1;
    });

    if (dt.length >= 14) {
      const hour = parseInt(dt.substring(11, 13), 10);
      if (!isNaN(hour)) s.hourly[hour]++;
    }

    if (jName && jName !== 'No Junction' && jName !== 'NULL') {
      s.junctions[jName] = (s.junctions[jName] || 0) + 1;
    }
  })
  .on('end', () => {
    console.log(`✅ Processed ${totalRows.toLocaleString()} rows.`);

    // ---- Build hotspots ----
    const hotspots = Object.values(stations)
      .filter(s => s.count > 100)
      .map(s => {
        // Top vehicle breakdown (top 4 types as percentage)
        const totalVeh = Object.values(s.vehicles).reduce((a,b) => a+b, 0);
        const topVehicles = Object.entries(s.vehicles)
          .sort((a,b) => b[1]-a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count, pct: Math.round((count / totalVeh) * 100) }));

        // Top violation types
        const topViolation = Object.keys(s.violations).sort((a,b) => s.violations[b]-s.violations[a])[0] || 'WRONG PARKING';

        // Top violation breakdown (top 3)
        const totalViol = Object.values(s.violations).reduce((a,b) => a+b, 0);
        const violBreakdown = Object.entries(s.violations)
          .sort((a,b) => b[1]-a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count, pct: Math.round((count / totalViol) * 100) }));

        // Peak hour at this station
        const peakHour = s.hourly.indexOf(Math.max(...s.hourly));

        // Conviction rate
        const convictionRate = s.count > 0 ? Math.round((s.approved / s.count) * 100) : 0;

        // Top junction name (BTP code)
        const topJunction = Object.keys(s.junctions).sort((a,b) => s.junctions[b]-s.junctions[a])[0] || null;

        // Per-station monthly breakdown
        // (we don't track per-station monthly in this pass for memory reasons — will use global monthly)

        // Delay minutes heuristic (capped at 60)
        const delayMinutes = Math.min(Math.round(s.count / 600), 55) + 5;

        return {
          id: `stn-${s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
          name: `${s.name} Junction`,
          station: s.name,
          lat: parseFloat((s.latSum / s.count).toFixed(6)),
          lng: parseFloat((s.lngSum / s.count).toFixed(6)),
          violationCount: s.count,
          type: topViolation,
          delayMinutes,
          convictionRate,
          peakHour,
          topJunction,
          vehicleBreakdown: topVehicles,
          violationBreakdown: violBreakdown,
          hourlyCounts: s.hourly,
          description: `${s.name} police station jurisdiction shows chronic ${topViolation.toLowerCase()} violations. Peak enforcement window is ${peakHour}:00–${peakHour + 1}:00. Conviction rate: ${convictionRate}%.`,
        };
      })
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 12);

    // Assign severity
    hotspots.forEach((hs, i) => {
      hs.severity = i < 2 ? 'Critical' : i < 5 ? 'High' : 'Medium';
      // Risk score (0-100)
      hs.riskScore = Math.round(
        (hs.violationCount / hotspots[0].violationCount) * 60 +
        (hs.convictionRate / 100) * 20 +
        (hs.delayMinutes / 60) * 20
      );
    });

    // ---- Build global stats ----
    // Monthly trend (sorted)
    const monthlyTrend = Object.entries(globalMonthly)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return { label: labels[parseInt(month,10) - 1], count };
      });

    // Hourly trend
    const hourlyTrend = globalHourly.map((count, hour) => ({
      hour,
      label: `${hour.toString().padStart(2,'0')}:00`,
      count,
    }));
    const peakHour = globalHourly.indexOf(Math.max(...globalHourly));

    // Top vehicles globally
    const totalVeh = Object.values(globalVehicles).reduce((a,b) => a+b, 0);
    const vehicleDistribution = Object.entries(globalVehicles)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count, pct: Math.round((count/totalVeh)*100) }));

    // Top violation types globally
    const totalViolTypes = Object.values(globalViolTypes).reduce((a,b) => a+b, 0);
    const violationTypes = Object.entries(globalViolTypes)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, pct: Math.round((count/totalViolTypes)*100) }));

    const globalConvictionRate = Math.round((approvedCount / totalRows) * 100);
    const totalHotspotViolations = hotspots.reduce((s,h) => s+h.violationCount, 0);

    const finalData = {
      meta: {
        totalRows,
        approvedCount,
        rejectedCount,
        globalConvictionRate,
        peakHour,
        peakHourCount: globalHourly[peakHour],
        processedAt: new Date().toISOString(),
      },
      globalStats: {
        totalViolations: totalHotspotViolations,
        convictionRate: globalConvictionRate,
        peakHour,
        peakHourLabel: `${peakHour.toString().padStart(2,'0')}:00`,
      },
      monthlyTrend,
      hourlyTrend,
      vehicleDistribution,
      violationTypes,
      heatmapData: heatmapPoints,
      hotspots,
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(finalData));
    console.log(`\n📦 Output: ${OUTPUT}`);
    console.log(`   Hotspots:  ${hotspots.length}`);
    console.log(`   Heatmap:   ${heatmapPoints.length} points`);
    console.log(`   Peak Hour: ${peakHour}:00 (${globalHourly[peakHour].toLocaleString()} violations)`);
    console.log(`   Conviction Rate: ${globalConvictionRate}%`);
    console.log(`\n🏆 Top 3 Hotspots:`);
    hotspots.slice(0,3).forEach((h,i) => console.log(`   ${i+1}. ${h.name} — ${h.violationCount.toLocaleString()} violations, ${h.convictionRate}% conviction`));
  });
