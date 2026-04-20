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
  const easyRuns = runs.filter(r =>
    r.average_heartrate && r.average_heartrate < 150 &&
    r.average_speed && r.distance > 3000
  );
  if (easyRuns.length < 2) return null;

  const avgEasySpeed = easyRuns.reduce((s, r) => s + r.average_speed, 0) / easyRuns.length;
  const thresholdSpeed = avgEasySpeed * 1.25;
  const predicted10KSecs = 10000 / thresholdSpeed;

  const h = Math.floor(predicted10KSecs / 3600);
  const m = Math.floor((predicted10KSecs % 3600) / 60);
  const s = Math.round(predicted10KSecs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}