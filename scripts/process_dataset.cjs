const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const INPUT = '/home/prashant/Downloads/jan to may police violation_anonymized791b166.csv';
const OUTPUT = path.join(__dirname, '../src/realData.json');

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// --- Accumulators ---
const stations = {};
const heatmapPoints = [];
const globalHourly = new Array(24).fill(0);
const globalMonthly = {};
const globalVehicles = {};
const globalViolTypes = {};
const globalDayOfWeek = new Array(7).fill(0);
// 7×24 matrix for day-of-week × hour heatmap
const globalWeeklyHeatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
const offenceCodes = {}; // code → violation name
let totalRows = 0;
let approvedCount = 0;
let rejectedCount = 0;
let scitaSent = 0;

console.log('🚀 Starting Phase 8 enhanced data pipeline...');

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
    const scita    = (row.data_sent_to_scita || '').trim().toUpperCase();

    if (scita === 'TRUE') scitaSent++;

    // --- Offence codes ---
    const offenceCodeRaw = row.offence_code || '';
    let violTypes = [];
    try {
      const parsed = JSON.parse(row.violation_type);
      if (Array.isArray(parsed)) violTypes = parsed;
    } catch(e) { violTypes = row.violation_type ? [row.violation_type] : ['PARKING']; }

    try {
      const codes = JSON.parse(offenceCodeRaw);
      if (Array.isArray(codes)) {
        codes.forEach((code, i) => {
          const cKey = String(code);
          if (!offenceCodes[cKey] && violTypes[i]) offenceCodes[cKey] = violTypes[i].toString().trim();
        });
      }
    } catch(e) {}

    // --- Temporal parsing ---
    let hour = -1, dayOfWeek = -1;
    if (dt.length >= 14) {
      hour = parseInt(dt.substring(11, 13), 10);
      if (!isNaN(hour)) {
        globalHourly[hour]++;
        // Parse full date for day of week
        try {
          const d = new Date(dt.substring(0, 10) + 'T00:00:00');
          dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
          globalDayOfWeek[dayOfWeek]++;
          globalWeeklyHeatmap[dayOfWeek][hour]++;
        } catch(e) {}
      }
    }

    // --- Global monthly ---
    if (dt.length >= 7) {
      const monthKey = dt.substring(0, 7);
      globalMonthly[monthKey] = (globalMonthly[monthKey] || 0) + 1;
    }

    globalVehicles[vType] = (globalVehicles[vType] || 0) + 1;
    if (valStat === 'approved') approvedCount++;
    if (valStat === 'rejected') rejectedCount++;

    violTypes.forEach(vt => {
      const clean = (vt || 'PARKING').toString().trim();
      globalViolTypes[clean] = (globalViolTypes[clean] || 0) + 1;
    });

    if (heatmapPoints.length < 15000) heatmapPoints.push([lat, lng, 0.5]);

    // --- Per station ---
    if (!stations[station]) {
      stations[station] = {
        name: station,
        latSum: 0, lngSum: 0, count: 0,
        approved: 0, rejected: 0,
        vehicles: {},
        violations: {},
        hourly: new Array(24).fill(0),
        dayOfWeek: new Array(7).fill(0),
        junctions: {},
      };
    }
    const s = stations[station];
    s.latSum += lat; s.lngSum += lng; s.count++;
    if (valStat === 'approved') s.approved++;
    if (valStat === 'rejected') s.rejected++;
    s.vehicles[vType] = (s.vehicles[vType] || 0) + 1;
    violTypes.forEach(vt => {
      const clean = (vt || 'PARKING').toString().trim();
      s.violations[clean] = (s.violations[clean] || 0) + 1;
    });
    if (hour >= 0) s.hourly[hour]++;
    if (dayOfWeek >= 0) s.dayOfWeek[dayOfWeek]++;
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
        const totalVeh = Object.values(s.vehicles).reduce((a,b) => a+b, 0);
        const topVehicles = Object.entries(s.vehicles)
          .sort((a,b) => b[1]-a[1]).slice(0, 5)
          .map(([name, count]) => ({ name, count, pct: Math.round((count / totalVeh) * 100) }));

        const topViolation = Object.keys(s.violations).sort((a,b) => s.violations[b]-s.violations[a])[0] || 'WRONG PARKING';
        const totalViol = Object.values(s.violations).reduce((a,b) => a+b, 0);
        const violBreakdown = Object.entries(s.violations)
          .sort((a,b) => b[1]-a[1]).slice(0, 4)
          .map(([name, count]) => ({ name, count, pct: Math.round((count / totalViol) * 100) }));

        const peakHour = s.hourly.indexOf(Math.max(...s.hourly));
        const convictionRate = s.count > 0 ? Math.round((s.approved / s.count) * 100) : 0;
        const topJunction = Object.keys(s.junctions).sort((a,b) => s.junctions[b]-s.junctions[a])[0] || null;
        const delayMinutes = Math.min(Math.round(s.count / 600), 55) + 5;

        // Worst day of week
        const worstDayIdx = s.dayOfWeek.indexOf(Math.max(...s.dayOfWeek));
        const worstDay = DAYS[worstDayIdx];
        const worstDayShort = worstDay.slice(0, 3);

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
          worstDay,
          worstDayShort,
          dayOfWeekCounts: s.dayOfWeek,
          vehicleBreakdown: topVehicles,
          violationBreakdown: violBreakdown,
          hourlyCounts: s.hourly,
          description: `${s.name} police station jurisdiction shows chronic ${topViolation.toLowerCase()} violations. Peak enforcement window is ${peakHour.toString().padStart(2,'0')}:00–${(peakHour+1).toString().padStart(2,'0')}:00. Worst day: ${worstDay}. Conviction rate: ${convictionRate}%.`,
        };
      })
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 12);

    hotspots.forEach((hs, i) => {
      hs.severity = i < 2 ? 'Critical' : i < 5 ? 'High' : 'Medium';
      hs.riskScore = Math.round(
        (hs.violationCount / hotspots[0].violationCount) * 60 +
        (hs.convictionRate / 100) * 20 +
        (hs.delayMinutes / 60) * 20
      );
    });

    // ---- Global stats ----
    const monthlyTrend = Object.entries(globalMonthly)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const month = parseInt(key.split('-')[1], 10);
        const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return { label: labels[month - 1], count };
      });

    const hourlyTrend = globalHourly.map((count, hour) => ({
      hour, label: `${hour.toString().padStart(2,'0')}:00`, count,
    }));
    const peakHour = globalHourly.indexOf(Math.max(...globalHourly));

    const totalVeh = Object.values(globalVehicles).reduce((a,b) => a+b, 0);
    const vehicleDistribution = Object.entries(globalVehicles)
      .sort((a,b) => b[1]-a[1]).slice(0, 6)
      .map(([name, count]) => ({ name, count, pct: Math.round((count/totalVeh)*100) }));

    const totalViolTypes = Object.values(globalViolTypes).reduce((a,b) => a+b, 0);
    const violationTypes = Object.entries(globalViolTypes)
      .sort((a,b) => b[1]-a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count, pct: Math.round((count/totalViolTypes)*100) }));

    // Day-of-week global
    const dayOfWeekTrend = DAYS.map((day, i) => ({ day, short: day.slice(0,3), count: globalDayOfWeek[i] }));
    const worstGlobalDay = DAYS[globalDayOfWeek.indexOf(Math.max(...globalDayOfWeek))];

    // Weekly heatmap (7×24) — normalize each cell 0-100
    const heatMax = Math.max(...globalWeeklyHeatmap.flat());
    const weeklyHeatmap = globalWeeklyHeatmap.map((row, d) => ({
      day: DAYS[d],
      short: DAYS[d].slice(0,3),
      hours: row.map(cnt => ({ count: cnt, intensity: Math.round((cnt / heatMax) * 100) }))
    }));

    // Offence code lookup (sorted by code number)
    const offenceCodeLookup = Object.entries(offenceCodes)
      .sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([code, name]) => ({ code, name }));

    const globalConvictionRate = Math.round((approvedCount / totalRows) * 100);
    const scitaPct = Math.round((scitaSent / totalRows) * 100);

    const finalData = {
      meta: {
        totalRows, approvedCount, rejectedCount, globalConvictionRate,
        peakHour, peakHourCount: globalHourly[peakHour],
        peakHourLabel: `${peakHour.toString().padStart(2,'0')}:00`,
        scitaSent, scitaTotal: totalRows, scitaPct,
        worstGlobalDay,
        closedCount: 0, // confirmed NULL for all records — systemic gap
        processedAt: new Date().toISOString(),
      },
      globalStats: {
        totalViolations: hotspots.reduce((s,h) => s+h.violationCount, 0),
        convictionRate: globalConvictionRate,
        peakHour,
        peakHourLabel: `${peakHour.toString().padStart(2,'0')}:00`,
        scitaPct,
        worstDay: worstGlobalDay,
      },
      monthlyTrend, hourlyTrend, dayOfWeekTrend, weeklyHeatmap,
      vehicleDistribution, violationTypes, offenceCodeLookup,
      heatmapData: heatmapPoints,
      hotspots,
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(finalData));
    console.log(`\n📦 Output: ${OUTPUT}`);
    console.log(`   Hotspots: ${hotspots.length} | Heatmap: ${heatmapPoints.length} pts`);
    console.log(`   Peak Hour: ${peakHour}:00 | Worst Day: ${worstGlobalDay}`);
    console.log(`   SCITA Sent: ${scitaSent.toLocaleString()} (${scitaPct}%)`);
    console.log(`   Offence Codes: ${offenceCodeLookup.length} unique`);
    console.log(`   Weekly Heatmap: 7×24 = 168 cells`);
    console.log(`\n🏆 Top 3 Hotspots:`);
    hotspots.slice(0,3).forEach((h,i) =>
      console.log(`   ${i+1}. ${h.name} — ${h.violationCount.toLocaleString()} violations | Worst: ${h.worstDay} | Peak: ${h.peakHour}:00`)
    );
  });
