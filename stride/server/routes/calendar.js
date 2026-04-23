import express from 'express';
import { pool } from '../utils/db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateCalendarBlock, resyncCalendar } from '../services/claudeService.js';
import { speedToPace, metresToKm } from '../services/stravaService.js';
import { buildCompletedWeeksSummary } from '../services/dataProcessor.js';

const router = express.Router();
const WEEKS_AHEAD = 6;

async function getOrCreateCalendar(userId) {
  let result = await pool.query(
    'SELECT * FROM training_calendar WHERE user_id = $1',
    [userId]
  );
  if (result.rows[0]) return result.rows[0];
  result = await pool.query(
    'INSERT INTO training_calendar (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return result.rows[0];
}

async function getCurrentWeeklyKm(userId) {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const result = await pool.query(
    'SELECT distance FROM activities WHERE user_id = $1 AND start_date > $2',
    [userId, fourWeeksAgo.toISOString()]
  );
  const total = result.rows.reduce((s, r) => s + (r.distance || 0), 0);
  return Math.round((total / 1000) / 4);
}

// GET /calendar
router.get('/', requireAuth, async (req, res) => {
  try {
    const calendar = await getOrCreateCalendar(req.user.id);
    const [weeksResult, pinsResult] = await Promise.all([
      pool.query(
        'SELECT * FROM calendar_weeks WHERE calendar_id = $1 ORDER BY week_number',
        [calendar.id]
      ),
      pool.query(
        'SELECT * FROM race_pins WHERE calendar_id = $1 ORDER BY race_date',
        [calendar.id]
      ),
    ]);
    res.json({
      calendar,
      weeks: weeksResult.rows,
      pins: pinsResult.rows,
    });
  } catch (err) {
    console.error('Calendar fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

// POST /calendar/pins
router.post('/pins', requireAuth, async (req, res) => {
  const { raceName, raceDistance, raceDate, goalTime, runsPerWeek, gymDays, notes } = req.body;

  if (!raceName || !raceDistance || !raceDate) {
    return res.status(400).json({ error: 'raceName, raceDistance and raceDate required' });
  }

  try {
    const calendar = await getOrCreateCalendar(req.user.id);

    // Parse gymDays safely
    const parsedGymDays = Array.isArray(gymDays)
      ? gymDays
      : typeof gymDays === 'string' && gymDays
        ? gymDays.split(',').map(d => d.trim())
        : [];

    // Save the pin
    const pinResult = await pool.query(`
      INSERT INTO race_pins (calendar_id, user_id, race_name, race_distance, race_date, goal_time, runs_per_week, gym_days, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      calendar.id, req.user.id, raceName, raceDistance, raceDate,
      goalTime || null, runsPerWeek || 4,
      JSON.stringify(parsedGymDays), notes || null,
    ]);
    const pin = pinResult.rows[0];

    // Get all upcoming pins for context
    const pinsResult = await pool.query(
      'SELECT * FROM race_pins WHERE calendar_id = $1 AND race_date >= NOW() ORDER BY race_date',
      [calendar.id]
    );
    const upcomingPins = pinsResult.rows;

    // Find where current weeks end
    const existingWeeks = await pool.query(
      'SELECT * FROM calendar_weeks WHERE calendar_id = $1 ORDER BY week_number DESC LIMIT 1',
      [calendar.id]
    );
    const lastWeek = existingWeeks.rows[0];
    const lastWeekNumber = lastWeek ? lastWeek.week_number : 0;

    // Generate from current week to 6 weeks past the new pin
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - fromDate.getDay() + 1);
    const toDate = new Date(raceDate);
    toDate.setDate(toDate.getDate() + WEEKS_AHEAD * 7);

    // Get recent runs
    const runsResult = await pool.query(
      'SELECT raw_data FROM activities WHERE user_id = $1 ORDER BY start_date DESC LIMIT 20',
      [req.user.id]
    );
    const recentRuns = runsResult.rows.map(r => r.raw_data);
    const currentWeeklyKm = await getCurrentWeeklyKm(req.user.id);

    // Generate block
    const blocks = await generateCalendarBlock(
      fromDate, toDate, upcomingPins, currentWeeklyKm, recentRuns,
      req.user.coach_mode || 'fire'
    );

    const startWeekNum = lastWeekNumber + 1;

    // Save weeks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const weekNum = startWeekNum + i;
      await pool.query(`
        INSERT INTO calendar_weeks (calendar_id, user_id, week_number, week_start, planned_days, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (calendar_id, week_number) DO NOTHING
      `, [
        calendar.id, req.user.id, weekNum,
        block.week_start, JSON.stringify(block.days),
        weekNum === startWeekNum ? 'current' : 'upcoming',
      ]);
    }

    // Notify
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.user.id, 'plan_updated', `${raceName} added — your calendar has been updated.`]
    );

    res.json({ pin, weeksAdded: blocks.length });
  } catch (err) {
    console.error('Add pin error:', err.message);
    console.error('Add pin stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /calendar/pins/:id
router.delete('/pins/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM race_pins WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove pin' });
  }
});

// POST /calendar/resync
router.post('/resync', requireAuth, async (req, res) => {
  const { coachMode = 'fire' } = req.body;

  try {
    const calendar = await getOrCreateCalendar(req.user.id);

    const [weeksResult, pinsResult, runsResult] = await Promise.all([
      pool.query('SELECT * FROM calendar_weeks WHERE calendar_id = $1 ORDER BY week_number', [calendar.id]),
      pool.query('SELECT * FROM race_pins WHERE calendar_id = $1 AND race_date >= NOW() ORDER BY race_date', [calendar.id]),
      pool.query('SELECT raw_data FROM activities WHERE user_id = $1 ORDER BY start_date DESC LIMIT 30', [req.user.id]),
    ]);

    const weeks = weeksResult.rows;
    const pins = pinsResult.rows;
    const actualRuns = runsResult.rows.map(r => r.raw_data);

    const currentWeekIdx = weeks.findIndex(w => w.status === 'current');
    if (currentWeekIdx === -1) return res.status(400).json({ error: 'No current week found' });

    const completedWeeks = weeks.slice(0, currentWeekIdx);
    const remainingWeeks = weeks.slice(currentWeekIdx);

    const activitiesByWeek = {};
    for (const run of actualRuns) {
      const weekIdx = weeks.findIndex(w => {
        const ws = new Date(w.week_start);
        const we = new Date(ws);
        we.setDate(we.getDate() + 7);
        const rd = new Date(run.start_date);
        return rd >= ws && rd < we;
      });
      if (weekIdx !== -1) {
        const wn = weeks[weekIdx].week_number;
        if (!activitiesByWeek[wn]) activitiesByWeek[wn] = [];
        activitiesByWeek[wn].push(run);
      }
    }

    const completedSummary = buildCompletedWeeksSummary(completedWeeks, activitiesByWeek);
    const currentWeeklyKm = await getCurrentWeeklyKm(req.user.id);
    const fromDate = new Date(weeks[currentWeekIdx].week_start);

    const resync = await resyncCalendar(
      fromDate, pins, completedSummary, actualRuns,
      currentWeeklyKm, remainingWeeks.length, coachMode
    );

    for (let i = 0; i < resync.weeks.length; i++) {
      const newWeek = resync.weeks[i];
      const dbWeek = remainingWeeks[i];
      if (!dbWeek) continue;
      await pool.query(
        'UPDATE calendar_weeks SET planned_days = $1, adjustment_note = $2 WHERE id = $3',
        [
          JSON.stringify(newWeek.days),
          i === 0 ? resync.assessment : null,
          dbWeek.id,
        ]
      );
    }

    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
      [req.user.id, 'plan_resynced', `Plan resynced: ${resync.assessment}`]
    );

    res.json({
      assessment: resync.assessment,
      adjustment: resync.adjustment,
      weeksUpdated: resync.weeks.length,
    });
  } catch (err) {
    console.error('Resync error:', err.message);
    console.error('Resync stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;