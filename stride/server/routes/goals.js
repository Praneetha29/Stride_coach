import express from 'express';
import { pool } from '../utils/db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateTrainingPlan, adaptTrainingWeek } from '../services/claudeService.js';

const router = express.Router();

// GET /goals — list all goals
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM training_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST /goals — create a new goal + generate plan
router.post('/', requireAuth, async (req, res) => {
  const { raceName, raceDistance, goalTime, raceDate } = req.body;

  if (!raceName || !raceDistance || !raceDate) {
    return res.status(400).json({ error: 'raceName, raceDistance and raceDate are required' });
  }

  try {
    // Auto-detect current weekly mileage from last 4 weeks
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const actResult = await pool.query(
      `SELECT distance FROM activities 
       WHERE user_id = $1 AND start_date > $2`,
      [req.user.id, fourWeeksAgo.toISOString()]
    );
    const totalMetres = actResult.rows.reduce((s, r) => s + (r.distance || 0), 0);
    const currentWeeklyKm = Math.round((totalMetres / 1000) / 4);

    // Weeks until race
    const today = new Date();
    const race = new Date(raceDate);
    const weeksUntilRace = Math.min(12, Math.max(4, Math.round((race - today) / (7 * 24 * 60 * 60 * 1000))));

    // Save goal
    const goalResult = await pool.query(`
      INSERT INTO training_goals (user_id, race_name, race_distance, goal_time, race_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, raceName, raceDistance, goalTime || null, raceDate]);

    const goal = goalResult.rows[0];

    // Generate plan via Claude
let plan;
try {
  plan = await generateTrainingPlan(
    goal,
    currentWeeklyKm,
    weeksUntilRace,
    req.user.coach_mode || 'fire'
  );
  console.log('Plan generated, weeks:', plan.length);
  console.log('First week sample:', JSON.stringify(plan[0], null, 2));
} catch (err) {
  console.error('Plan generation error:', err.message);
  await pool.query('DELETE FROM training_goals WHERE id = $1', [goal.id]);
  return res.status(500).json({ error: 'Failed to generate plan — try again' });
}

// Save each week
for (const week of plan) {
  try {
    await pool.query(`
      INSERT INTO training_weeks (goal_id, user_id, week_number, week_start, planned_runs, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (goal_id, week_number) DO NOTHING
    `, [
      goal.id,
      req.user.id,
      week.week_number,
      week.week_start,
      JSON.stringify(week.days),
      week.week_number === 1 ? 'current' : 'upcoming',
    ]);
    console.log(`Saved week ${week.week_number}`);
  } catch (err) {
    console.error(`Failed to save week ${week.week_number}:`, err.message);
  }
}

    // Return goal + weeks
    const weeksResult = await pool.query(
      'SELECT * FROM training_weeks WHERE goal_id = $1 ORDER BY week_number',
      [goal.id]
    );

    res.json({ goal, weeks: weeksResult.rows });
  } catch (err) {
    console.error('Goal creation error:', err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// GET /goals/:id/plan — get full plan for a goal
router.get('/:id/plan', requireAuth, async (req, res) => {
  try {
    const goalResult = await pool.query(
      'SELECT * FROM training_goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!goalResult.rows[0]) return res.status(404).json({ error: 'Goal not found' });

    const weeksResult = await pool.query(
      'SELECT * FROM training_weeks WHERE goal_id = $1 ORDER BY week_number',
      [req.params.id]
    );

    res.json({ goal: goalResult.rows[0], weeks: weeksResult.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// PATCH /goals/:id — update status
router.patch('/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE training_goals SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

export default router;