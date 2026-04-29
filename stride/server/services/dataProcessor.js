export function classifyRun(avgHr) {
  if (!avgHr) return 'unknown';
  if (avgHr < 140) return 'easy';
  if (avgHr < 160) return 'moderate';
  if (avgHr < 175) return 'tempo';
  return 'hard';
}

export function computeLoad(runs) {
  return runs.reduce((total, run) => {
    const durationMins = (run.moving_time || 0) / 60;
    const hrRatio = (run.average_heartrate || 140) / 185;
    return total + durationMins * Math.pow(hrRatio, 2);
  }, 0);
}

export function easyRunCompliance(runs) {
  if (!runs.length) return 0;
  const easy = runs.filter(r => r.average_heartrate && r.average_heartrate < 145);
  return Math.round((easy.length / runs.length) * 100);
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function groupByWeek(runs) {
  const weeks = {};
  for (const run of runs) {
    const date = new Date(run.start_date || run.date);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = { weekStart, runs: [] };
    weeks[key].runs.push(run);
  }
  return weeks;
}

export function buildWeeklySummary(runs, prevWeekRuns = []) {
  const totalKm = runs.reduce((s, r) => s + (r.distance || 0) / 1000, 0);
  const totalRuns = runs.length;
  const hRuns = runs.filter(r => r.average_heartrate);
  const avgHr = hRuns.length
    ? hRuns.reduce((s, r) => s + r.average_heartrate, 0) / hRuns.length
    : null;
  const loadScore = computeLoad(runs);
  const prevLoad = computeLoad(prevWeekRuns);
  const loadChangePct = prevLoad > 0
    ? Math.round(((loadScore - prevLoad) / prevLoad) * 100)
    : 0;
  const easyRunPct = easyRunCompliance(runs);

  let status = 'green';
  if (loadChangePct > 15 || easyRunPct < 60) status = 'amber';
  if (loadChangePct > 25 || easyRunPct < 40) status = 'red';

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalRuns,
    avgHr: avgHr ? Math.round(avgHr) : null,
    loadScore: Math.round(loadScore),
    loadChangePct,
    easyRunPct,
    status,
  };
}

export function predictRaceTime(runs) {
  if (!runs.length) return null;

  const raceEfforts = runs
    .filter(r => r.distance >= 8000 && r.distance <= 13000 && r.average_speed)
    .sort((a, b) => b.average_speed - a.average_speed);

  if (raceEfforts.length > 0) {
    const best = raceEfforts[0];
    // Use Riegel's formula: T2 = T1 * (D2/D1)^1.06
    const actualTime = best.moving_time;
    const actualDist = best.distance;
    const targetDist = 10000;
    const predicted = actualTime * Math.pow(targetDist / actualDist, 1.06);
    return formatRaceTime(predicted);
  }

  // Fallback — use recent fast runs (not just easy runs)
  // Take top 30% of runs by speed to get a realistic pace
  const recentRuns = runs
    .filter(r => r.average_speed && r.distance > 3000)
    .sort((a, b) => b.average_speed - a.average_speed);

  if (recentRuns.length < 2) return null;

  // Use top 3 fastest runs average as threshold estimate
  const topRuns = recentRuns.slice(0, Math.max(3, Math.ceil(recentRuns.length * 0.3)));
  const avgFastSpeed = topRuns.reduce((s, r) => s + r.average_speed, 0) / topRuns.length;

  // Apply a conservative race factor (race pace ≈ 90% of best training pace)
  const racePaceSpeed = avgFastSpeed * 0.90;
  const predicted10KSecs = 10000 / racePaceSpeed;

  return formatRaceTime(predicted10KSecs);
}

function formatRaceTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60).toString().padStart(2, '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

export function buildCompletedWeeksSummary(weeks, activitiesByWeek) {
  return weeks
    .filter(w => w.status === 'completed')
    .map(w => {
      const days = Array.isArray(w.planned_days)
        ? w.planned_days
        : typeof w.planned_days === 'string'
          ? JSON.parse(w.planned_days || '[]')
          : [];
      const plannedKm = days.reduce((s, d) => s + (d.distance || 0), 0);
      const actualKm = (activitiesByWeek[w.week_number] || [])
        .reduce((s, r) => s + (r.distance || 0) / 1000, 0);
      return {
        week_number: w.week_number,
        planned_km: Math.round(plannedKm * 10) / 10,
        actual_km: Math.round(actualKm * 10) / 10,
        compliance: plannedKm > 0 ? Math.round((actualKm / plannedKm) * 100) : 0,
      };
    });
}