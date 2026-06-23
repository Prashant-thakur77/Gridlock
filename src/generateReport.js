// generateReport.js
// Generates a fully detailed, multi-page professional PDF incident report
// using html2pdf.js and a purpose-built HTML document string.

import html2pdf from 'html2pdf.js';
import { monthlyTrend, hourlyTrend, meta, violationTypes, globalStats } from './mockData';

const COLORS = {
  danger: '#f87171',
  warning: '#fbbf24',
  success: '#34d399',
  primary: '#4f8ef5',
  secondary: '#9b6cf7',
  cyan: '#22d3ee',
  dark: '#0f1520',
  darkBg: '#080c12',
  text: '#e8edf5',
  muted: '#64748b',
};

function buildHourlyBars(hourlyCounts) {
  const maxVal = Math.max(...hourlyCounts);
  return hourlyCounts.map((cnt, h) => {
    const pct = Math.round((cnt / maxVal) * 100);
    const isPeak = cnt === maxVal;
    const isNear = Math.abs(h - hourlyCounts.indexOf(maxVal)) === 1;
    const color = isPeak ? COLORS.danger : isNear ? COLORS.warning : COLORS.primary;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="width:100%;background:${color};border-radius:2px 2px 0 0;height:${pct}%;min-height:2px;"></div>
    </div>`;
  }).join('');
}

function buildMonthlyBars(monthData) {
  const maxVal = Math.max(...monthData.map(m => m.count));
  return monthData.map(m => {
    const pct = Math.round((m.count / maxVal) * 100);
    const isPeak = m.count === maxVal;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="font-size:7px;color:${COLORS.muted};font-family:monospace;">${(m.count/1000).toFixed(0)}k</div>
      <div style="flex:1;width:100%;display:flex;align-items:flex-end;">
        <div style="width:100%;background:${isPeak ? COLORS.danger : COLORS.primary};border-radius:2px 2px 0 0;height:${pct}%;min-height:2px;${isPeak ? `box-shadow:0 0 6px ${COLORS.danger};` : 'opacity:0.65;'}"></div>
      </div>
      <div style="font-size:7px;color:${COLORS.muted};font-weight:600;">${m.label}</div>
    </div>`;
  }).join('');
}

function buildVehicleRows(vehicleBreakdown) {
  const vehicleColors = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.cyan, COLORS.danger];
  return vehicleBreakdown.slice(0, 5).map((v, i) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${vehicleColors[i]};"></div>
          <span style="color:#cbd5e1;font-size:10px;">${v.name}</span>
        </div>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;text-align:right;">
        <span style="color:#e8edf5;font-size:10px;font-weight:700;font-family:monospace;">${v.pct}%</span>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;width:160px;">
        <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${v.pct}%;background:${vehicleColors[i]};border-radius:99px;"></div>
        </div>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;text-align:right;">
        <span style="color:#64748b;font-size:9px;">${v.count ? v.count.toLocaleString('en-IN') : '-'}</span>
      </td>
    </tr>`).join('');
}

function buildViolationRows(violBreakdown) {
  return violBreakdown.slice(0, 5).map((v, i) => {
    const colors = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.cyan, COLORS.secondary];
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;"><span style="color:#cbd5e1;font-size:10px;">${v.name}</span></td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;width:160px;">
        <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${v.pct}%;background:${colors[i]};border-radius:99px;"></div>
        </div>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="color:#e8edf5;font-size:10px;font-weight:700;font-family:monospace;">${v.pct}%</span></td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="color:#64748b;font-size:9px;">${v.count ? v.count.toLocaleString('en-IN') : '-'}</span></td>
    </tr>`;
  }).join('');
}

function buildTopHotspotRows(allHotspots) {
  const sColors = { Critical: COLORS.danger, High: COLORS.warning, Medium: COLORS.primary };
  return allHotspots.slice(0, 10).map((h, i) => `
    <tr>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:center;">
        <span style="color:${COLORS.muted};font-family:monospace;font-size:9px;">#${i+1}</span>
      </td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;"><span style="color:#e8edf5;font-size:9.5px;font-weight:600;">${h.name}</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;"><span style="color:${sColors[h.severity]};font-size:9px;font-weight:700;">${h.severity}</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="font-family:monospace;font-size:9px;color:#e8edf5;font-weight:600;">${h.violationCount.toLocaleString('en-IN')}</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="font-family:monospace;font-size:9px;color:${COLORS.warning};">${h.convictionRate}%</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="font-family:monospace;font-size:9px;color:${COLORS.danger};">+${h.delayMinutes}m</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="font-family:monospace;font-size:9px;color:${COLORS.success};">${h.peakHour.toString().padStart(2,'0')}:00</span></td>
      <td style="padding:5px 10px;border-bottom:1px solid #1a2540;text-align:right;"><span style="font-family:monospace;font-size:9px;color:${COLORS.cyan};">RS ${h.riskScore}</span></td>
    </tr>`).join('');
}

export async function generateDetailedPDF(hotspot, allHotspots) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const sColor = { Critical: COLORS.danger, High: COLORS.warning, Medium: COLORS.primary }[hotspot.severity] || COLORS.primary;

  const peakHour = hotspot.peakHour ?? meta.peakHour;
  const peakLabel = `${peakHour.toString().padStart(2,'0')}:00 – ${(peakHour+1).toString().padStart(2,'0')}:00`;

  const htmlContent = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      .pdf-container { font-family: 'Inter', sans-serif; background: ${COLORS.darkBg}; color: ${COLORS.text}; }
      .pdf-container * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-container .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; background: ${COLORS.darkBg}; page-break-after: always; }
      .pdf-container .page:last-child { page-break-after: avoid; }
      .pdf-container .mono { font-family: 'JetBrains Mono', monospace; }
      .pdf-container h1, .pdf-container h2, .pdf-container h3 { letter-spacing: -0.02em; }
    </style>
    <div class="pdf-container">
  <!-- ═══════════════════════════════════════════════ -->
  <!-- PAGE 1: COVER PAGE -->
  <!-- ═══════════════════════════════════════════════ -->
  <div class="page" style="background: linear-gradient(160deg, #080c12 60%, #0f1a30 100%); display:flex; flex-direction:column; justify-content:space-between; padding:50px 50px;">

    <!-- Header Bar -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:${COLORS.muted};text-transform:uppercase;margin-bottom:4px;">OFFICIAL DOCUMENT</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;">Gridlock<span style="color:${COLORS.primary};">AI</span></div>
        <div style="font-size:9px;color:${COLORS.muted};margin-top:2px;letter-spacing:0.04em;">Traffic Intelligence Platform · Bengaluru</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;color:${COLORS.muted};font-family:monospace;">REPORT ID</div>
        <div style="font-size:11px;font-weight:600;color:${COLORS.cyan};font-family:monospace;">GLA-${Date.now().toString(36).toUpperCase().slice(-8)}</div>
        <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;font-family:monospace;">${dateStr} · ${timeStr}</div>
      </div>
    </div>

    <!-- Separator -->
    <div style="height:1px;background:linear-gradient(to right, ${COLORS.primary}, ${COLORS.secondary}, transparent);margin:20px 0;"></div>

    <!-- Main Title Section -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:30px 0;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:${sColor};margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        <div style="width:20px;height:1px;background:${sColor};"></div>
        ${hotspot.severity} Priority Zone — Incident Report
        <div style="width:20px;height:1px;background:${sColor};"></div>
      </div>
      <div style="font-size:36px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;color:#f8fafc;">${hotspot.name}</div>
      <div style="font-size:14px;color:${COLORS.muted};margin-top:8px;">${hotspot.station} Police Station Jurisdiction</div>
      ${hotspot.topJunction ? `<div style="margin-top:12px;display:inline-flex;"><span style="font-family:monospace;font-size:10px;color:${COLORS.cyan};background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);padding:3px 10px;border-radius:4px;">${hotspot.topJunction}</span></div>` : ''}

      <!-- Large stats row -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:40px;">
        <div style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:16px;">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.muted};margin-bottom:6px;">Total Violations</div>
          <div style="font-size:28px;font-weight:800;color:${COLORS.danger};font-family:monospace;letter-spacing:-0.03em;">${hotspot.violationCount.toLocaleString('en-IN')}</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:4px;">Jan – May 2024</div>
        </div>
        <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:16px;">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.muted};margin-bottom:6px;">Avg Traffic Delay</div>
          <div style="font-size:28px;font-weight:800;color:${COLORS.warning};font-family:monospace;letter-spacing:-0.03em;">+${hotspot.delayMinutes}m</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:4px;">Per intersection event</div>
        </div>
        <div style="background:rgba(79,142,245,0.06);border:1px solid rgba(79,142,245,0.2);border-radius:12px;padding:16px;">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.muted};margin-bottom:6px;">Conviction Rate</div>
          <div style="font-size:28px;font-weight:800;color:${COLORS.primary};font-family:monospace;letter-spacing:-0.03em;">${hotspot.convictionRate}%</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:4px;">Validated violations</div>
        </div>
        <div style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:16px;">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:${COLORS.muted};margin-bottom:6px;">Risk Score</div>
          <div style="font-size:28px;font-weight:800;color:${COLORS.danger};font-family:monospace;letter-spacing:-0.03em;">${hotspot.riskScore}<span style="font-size:14px;">/100</span></div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:4px;">Gridlock AI threat index</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div>
      <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:16px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:8px;color:${COLORS.muted};">Data Source: Bengaluru Traffic Police Violation Database · ${meta.totalRows.toLocaleString('en-IN')} records processed</div>
        <div style="font-size:8px;color:${COLORS.muted};font-family:monospace;">PAGE 1 of 4</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- PAGE 2: TEMPORAL & VIOLATION ANALYSIS -->
  <!-- ═══════════════════════════════════════════════ -->
  <div class="page" style="padding:40px 50px;">

    <!-- Page Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:16px;font-weight:700;letter-spacing:-0.02em;">Temporal & Violation Analysis</div>
      <div style="font-size:8px;font-family:monospace;color:${COLORS.muted};">${hotspot.name} · ${dateStr}</div>
    </div>

    <!-- Two column layout -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

      <!-- Station Hourly Pattern -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:4px;">Hourly Violation Pattern</div>
        <div style="font-size:8px;color:${COLORS.muted};margin-bottom:10px;">${hotspot.station} Police Station · Peak: <span style="color:${COLORS.danger};font-weight:700;">${peakLabel}</span></div>
        <div style="display:flex;align-items:flex-end;height:80px;gap:2px;background:rgba(0,0,0,0.2);border-radius:6px;padding:6px 6px 0;">
          ${buildHourlyBars(hotspot.hourlyCounts || new Array(24).fill(0))}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:7px;color:${COLORS.muted};margin-top:4px;font-family:monospace;">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
        <div style="margin-top:10px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:6px;padding:8px;">
          <div style="font-size:8px;color:${COLORS.danger};font-weight:700;">⚠ ACTION REQUIRED</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:3px;">Deploy enforcement units at ${(peakHour - 1).toString().padStart(2,'0')}:30 to intercept peak window at ${peakLabel}. This proactive approach can reduce peak violations by an estimated 30–40%.</div>
        </div>
      </div>

      <!-- City-wide Hourly Pattern -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};margin-bottom:4px;">City-wide Hourly Distribution</div>
        <div style="font-size:8px;color:${COLORS.muted};margin-bottom:10px;">Bengaluru Total · Peak: <span style="color:${COLORS.danger};font-weight:700;">${meta.peakHourLabel} (${meta.peakHourCount.toLocaleString('en-IN')} violations)</span></div>
        <div style="display:flex;align-items:flex-end;height:80px;gap:2px;background:rgba(0,0,0,0.2);border-radius:6px;padding:6px 6px 0;">
          ${buildHourlyBars(hourlyTrend.map(h => h.count))}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:7px;color:${COLORS.muted};margin-top:4px;font-family:monospace;">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
        <div style="margin-top:10px;background:rgba(79,142,245,0.06);border:1px solid rgba(79,142,245,0.15);border-radius:6px;padding:8px;">
          <div style="font-size:8px;color:${COLORS.primary};font-weight:700;">📊 KEY INSIGHT</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:3px;">Counterintuitively, the highest violation rate occurs at ${meta.peakHourLabel}, likely driven by commercial vehicle loading near market zones (KR Market, City Market). Standard rush-hour enforcement misses this window entirely.</div>
        </div>
      </div>
    </div>

    <!-- Monthly Trend -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Monthly Violation Trend</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;">City-wide totals · November 2023 – May 2024</div>
        </div>
        <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:4px;padding:3px 8px;">
          <span style="font-size:8px;color:${COLORS.danger};font-weight:700;">JAN PEAK: ${monthlyTrend.find(m => m.label === 'Jan')?.count.toLocaleString('en-IN') || 'N/A'} violations</span>
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;height:90px;gap:6px;">
        ${buildMonthlyBars(monthlyTrend)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;">
        <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:700;color:${COLORS.danger};font-family:monospace;">${(meta.totalRows/6).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}+</div>
          <div style="font-size:7px;color:${COLORS.muted};margin-top:2px;">Avg Monthly Violations</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:700;color:${COLORS.primary};font-family:monospace;">${Math.round(meta.totalRows / 181).toLocaleString('en-IN')}</div>
          <div style="font-size:7px;color:${COLORS.muted};margin-top:2px;">Avg Daily Violations</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;text-align:center;">
          <div style="font-size:16px;font-weight:700;color:${COLORS.warning};font-family:monospace;">${Math.round(meta.totalRows / 181 / 24).toLocaleString('en-IN')}</div>
          <div style="font-size:7px;color:${COLORS.muted};margin-top:2px;">Avg Hourly Violations</div>
        </div>
      </div>
    </div>

    <!-- Violation Types table -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Violation Type Breakdown — ${hotspot.station}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(0,0,0,0.2);">
            <th style="padding:7px 10px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Violation Type</th>
            <th style="padding:7px 10px;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;width:160px;">Distribution</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Share</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Count</th>
          </tr>
        </thead>
        <tbody>${buildViolationRows(hotspot.violationBreakdown || [])}</tbody>
      </table>
    </div>

    <!-- Page footer -->
    <div style="position:absolute;bottom:24px;left:50px;right:50px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:7px;color:${COLORS.muted};">Gridlock AI · Official Incident Report · ${hotspot.name}</div>
      <div style="font-size:7px;font-family:monospace;color:${COLORS.muted};">PAGE 2 of 4</div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- PAGE 3: VEHICLE ANALYSIS + ALL HOTSPOTS TABLE -->
  <!-- ═══════════════════════════════════════════════ -->
  <div class="page" style="padding:40px 50px;">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:16px;font-weight:700;letter-spacing:-0.02em;">Vehicle Analysis & Priority Zones</div>
      <div style="font-size:8px;font-family:monospace;color:${COLORS.muted};">${hotspot.name} · ${dateStr}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

      <!-- Vehicle Distribution for this hotspot -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Vehicle Distribution — ${hotspot.station}</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;">Real per-station breakdown from violation records</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:rgba(0,0,0,0.2);">
              <th style="padding:7px 10px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Vehicle Type</th>
              <th style="padding:7px 10px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Share</th>
              <th style="padding:7px 10px;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;width:100px;">Bar</th>
              <th style="padding:7px 10px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};font-weight:600;">Count</th>
            </tr>
          </thead>
          <tbody>${buildVehicleRows(hotspot.vehicleBreakdown || [])}</tbody>
        </table>
      </div>

      <!-- City-wide vehicle distribution -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
        <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Vehicle Distribution — City-wide</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;">All ${meta.totalRows.toLocaleString('en-IN')} violations · Bengaluru</div>
        </div>
        <div style="padding:12px 16px;">
          ${['SCOOTER', 'CAR', 'MOTOR CYCLE', 'PASSENGER AUTO', 'MAXI-CAB'].map((name, i) => {
            const pcts = [32, 30, 14, 13, 4];
            const counts = [94856, 88870, 40811, 37813, 11372];
            const colors = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.cyan, COLORS.danger];
            return `<div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:9px;color:#cbd5e1;">${name}</span>
                <span style="font-size:9px;font-family:monospace;color:#e8edf5;font-weight:600;">${pcts[i]}% · ${counts[i].toLocaleString('en-IN')}</span>
              </div>
              <div style="height:5px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${pcts[i]*3}%;background:${colors[i]};border-radius:99px;"></div>
              </div>
            </div>`;
          }).join('')}
          <div style="margin-top:10px;background:rgba(79,142,245,0.06);border:1px solid rgba(79,142,245,0.15);border-radius:6px;padding:8px;">
            <div style="font-size:8px;color:${COLORS.primary};font-weight:700;">💡 DISPATCH RECOMMENDATION</div>
            <div style="font-size:8px;color:${COLORS.muted};margin-top:3px;">Two-wheeler violators (Scooters + Motorcycles = 46%) require mobile enforcement officers. Cars (30%) require tow truck assets. Deploy mixed teams for maximum coverage efficiency.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- All Hotspots Intelligence Table -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.muted};">Priority Zone Intelligence Matrix — All Hotspots</div>
          <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;">Top 10 enforcement priority zones ranked by violation count</div>
        </div>
        <div style="font-size:8px;font-family:monospace;color:${COLORS.cyan};">${allHotspots.length} zones tracked</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(0,0,0,0.3);">
            <th style="padding:7px 10px;text-align:center;font-size:8px;color:${COLORS.muted};font-weight:600;">#</th>
            <th style="padding:7px 10px;text-align:left;font-size:8px;color:${COLORS.muted};font-weight:600;">Zone Name</th>
            <th style="padding:7px 10px;text-align:left;font-size:8px;color:${COLORS.muted};font-weight:600;">Severity</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;color:${COLORS.muted};font-weight:600;">Violations</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;color:${COLORS.muted};font-weight:600;">Conv. Rate</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;color:${COLORS.muted};font-weight:600;">Delay</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;color:${COLORS.muted};font-weight:600;">Peak Hour</th>
            <th style="padding:7px 10px;text-align:right;font-size:8px;color:${COLORS.muted};font-weight:600;">Risk</th>
          </tr>
        </thead>
        <tbody>${buildTopHotspotRows(allHotspots)}</tbody>
      </table>
    </div>

    <div style="position:absolute;bottom:24px;left:50px;right:50px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:7px;color:${COLORS.muted};">Gridlock AI · Official Incident Report · ${hotspot.name}</div>
      <div style="font-size:7px;font-family:monospace;color:${COLORS.muted};">PAGE 3 of 4</div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- PAGE 4: AI RECOMMENDATIONS + DATA CERTIFICATION -->
  <!-- ═══════════════════════════════════════════════ -->
  <div class="page" style="padding:40px 50px;">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07);">
      <div style="font-size:16px;font-weight:700;letter-spacing:-0.02em;">AI Recommendations & Data Certification</div>
      <div style="font-size:8px;font-family:monospace;color:${COLORS.muted};">${hotspot.name} · ${dateStr}</div>
    </div>

    <!-- AI Recommendations -->
    <div style="background:rgba(79,142,245,0.04);border:1px solid rgba(79,142,245,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        <div style="font-size:12px;">🤖</div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.primary};">Gridlock AI — Enforcement Recommendations</div>
      </div>
      ${[
        { icon: '⏰', title: 'Deployment Timing', body: `Critical enforcement window identified at ${peakLabel} at ${hotspot.name}. Deploy units at ${(peakHour-1).toString().padStart(2,'0')}:30 for proactive intervention. City-wide peak is ${meta.peakHourLabel} — coordinate all station deployments for this window.` },
        { icon: '🚗', title: 'Asset Allocation', body: `${hotspot.vehicleBreakdown?.[0]?.name || 'Scooters'} account for ${hotspot.vehicleBreakdown?.[0]?.pct || '~30'}% of violations at this station. Prioritize mobile two-wheeler enforcement teams. Allocate towing vehicles for CAR violations which represent significant carriageway blockage.` },
        { icon: '📊', title: 'Conviction Rate Improvement', body: `Current conviction rate of ${hotspot.convictionRate}% indicates ${100-hotspot.convictionRate}% of records are rejected or pending. Implement field verification protocols and real-time SCITA data syncing to improve data quality and prosecution rates.` },
        { icon: '🔄', title: 'Predictive Deployment', body: `Historical data shows January and December are highest-violation months. Pre-position additional enforcement resources during festival and commercial seasons. Implement demand-based deployment model using this dashboard's 12-hour forecast feature.` },
        { icon: '🤝', title: 'Inter-agency Coordination', body: `${hotspot.name} borders multiple jurisdiction boundaries. Recommend establishing a Joint Enforcement Task Force with neighboring station commanders. Share real-time incident data through the Gridlock AI platform for unified city-wide response.` },
      ].map(r => `
        <div style="margin-bottom:12px;padding:12px;background:rgba(0,0,0,0.2);border-radius:8px;border-left:3px solid ${COLORS.primary};">
          <div style="font-size:9px;font-weight:700;color:#e8edf5;margin-bottom:4px;">${r.icon} ${r.title}</div>
          <div style="font-size:8.5px;color:#8fa3bf;line-height:1.6;">${r.body}</div>
        </div>`).join('')}
    </div>

    <!-- Data Certification -->
    <div style="background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.15);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.success};margin-bottom:12px;">✓ Data Certification & Provenance</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${[
          ['Data Source', 'Bengaluru Traffic Police Violation Database'],
          ['Record Count', `${meta.totalRows.toLocaleString('en-IN')} validated violation records`],
          ['Time Coverage', 'November 2023 – May 2024 (6 months)'],
          ['Processing Engine', 'Gridlock AI Node.js Stream Pipeline v2.0'],
          ['Hotspot Algorithm', 'Geographic clustering by police station jurisdiction'],
          ['Risk Score Formula', 'Weighted: violation density (60%) + conviction rate (20%) + delay impact (20%)'],
          ['Data Quality', `${meta.approvedCount.toLocaleString('en-IN')} approved · ${meta.rejectedCount.toLocaleString('en-IN')} rejected`],
          ['Global Conviction Rate', `${meta.globalConvictionRate}% (${meta.approvedCount.toLocaleString('en-IN')} of ${meta.totalRows.toLocaleString('en-IN')} records validated)`],
        ].map(([label, val]) => `
          <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">
            <div style="font-size:7.5px;font-weight:600;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${label}</div>
            <div style="font-size:8.5px;color:#e8edf5;">${val}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Signature Block -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px;">
        <div style="font-size:8px;color:${COLORS.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:20px;">Prepared By</div>
        <div style="border-bottom:1px solid rgba(255,255,255,0.15);margin-bottom:8px;height:20px;"></div>
        <div style="font-size:8px;color:${COLORS.muted};">Gridlock AI Platform · Auto-generated</div>
        <div style="font-size:8px;font-family:monospace;color:${COLORS.muted};margin-top:2px;">${dateStr} at ${timeStr}</div>
      </div>
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px;">
        <div style="font-size:8px;color:${COLORS.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:20px;">Authorised By (Station Commander)</div>
        <div style="border-bottom:1px solid rgba(255,255,255,0.15);margin-bottom:8px;height:20px;"></div>
        <div style="font-size:8px;color:${COLORS.muted};">${hotspot.station} Police Station</div>
        <div style="font-size:8px;color:${COLORS.muted};margin-top:2px;">Bengaluru City Police</div>
      </div>
    </div>

    <!-- Final footer -->
    <div style="position:absolute;bottom:24px;left:50px;right:50px;">
      <div style="height:1px;background:linear-gradient(to right, ${COLORS.primary}, ${COLORS.secondary}, transparent);margin-bottom:10px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:7px;color:${COLORS.muted};">
          This report is auto-generated by Gridlock AI Traffic Intelligence Platform. All data sourced from Bengaluru Traffic Police violation records.
          For official use only. Report ID: GLA-${Date.now().toString(36).toUpperCase().slice(-8)}
        </div>
        <div style="font-size:7px;font-family:monospace;color:${COLORS.muted};">PAGE 4 of 4</div>
    </div>
  </div>
  `;

  // Create container — must be in viewport for html2canvas to capture correctly
  const container = document.createElement('div');
  container.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:794px',         // ≈ 210mm at 96dpi
    'z-index:-9999',       // keep it behind the app but visible to the browser
    'pointer-events:none'  // don't block interaction
  ].join(';');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait two animation frames so the browser fully lays out and paints the HTML
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Extra settle time for any inline reflows
  await new Promise(resolve => setTimeout(resolve, 400));

  const opt = {
    margin: 0,
    filename: `Gridlock_AI_Incident_Report_${hotspot.name.replace(/\s+/g, '_')}_${now.toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#080c12',
      logging: false,
      windowWidth: 794,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}
