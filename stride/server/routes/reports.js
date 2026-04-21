import express from 'express';
import { pool } from '../utils/db.js';
import { buildWeeklySummary, groupByWeek, predictRaceTime } from '../services/dataProcessor.js';
import { generateWeeklyReport } from '../services/claudeService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /reports
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM weekly_reports WHERE user_id = $1 ORDER BY week_start DESC LIMIT 8',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /reports/generate
router.post('/generate', requireAuth, async (req, res) => {
  const { coachMode = 'fire' } = req.body;
  try {
    const report = await generateReportForUser(req.user, coachMode);
    res.json(report);
  } catch (err) {
    console.error('Report generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /reports/predictor
router.get('/predictor', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT raw_data FROM activities WHERE user_id = $1 ORDER BY start_date DESC LIMIT 30',
      [req.user.id]
    );
    const runs = result.rows.map(r => r.raw_data);
    const prediction = predictRaceTime(runs);
    res.json({ prediction });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute prediction' });
  }
});

export async function generateReportForUser(user, coachMode = 'fire') {
  const result = await pool.query(
    'SELECT raw_data FROM activities WHERE user_id = $1 ORDER BY start_date DESC LIMIT 60',
    [user.id]
  );
  const runs = result.rows.map(r => r.raw_data);

  const weeks = groupByWeek(runs);
  const weekKeys = Object.keys(weeks).sort().reverse();
  if (!weekKeys.length) return null;

  const thisWeek = weeks[weekKeys[0]].runs;
  const lastWeek = weeks[weekKeys[1]]?.runs || [];

  const summary = buildWeeklySummary(thisWeek, lastWeek);
  const narrative = await generateWeeklyReport(summary, thisWeek, coachMode);
  const racePrediction = predictRaceTime(runs);

  const weekStart = weeks[weekKeys[0]].weekStart;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const saved = await pool.query(`
    INSERT INTO weekly_reports (
      user_id, week_start, week_end, total_km, total_runs, avg_hr,
      easy_run_pct, load_score, load_change_pct, status, narrative, race_prediction
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (user_id, week_start) DO UPDATE SET
      narrative = EXCLUDED.narrative,
      status = EXCLUDED.status,
      race_prediction = EXCLUDED.race_prediction
    RETURNING *
  `, [
    user.id,
    weekStart.toISOString().split('T')[0],
    weekEnd.toISOString().split('T')[0],
    summary.totalKm, summary.totalRuns, summary.avgHr,
    summary.easyRunPct, summary.loadScore, summary.loadChangePct,
    summary.status, narrative, racePrediction,
  ]);

  return saved.rows[0];
}

export default router;