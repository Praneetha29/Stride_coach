import express from 'express';
import { fetchActivities, fetchActivity, filterRuns, speedToPace, metresToKm, formatDuration } from '../services/stravaService.js';
import { pool } from '../utils/db.js';
import { classifyRun } from '../services/dataProcessor.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { refresh } = req.query;

    if (!refresh) {
      const cached = await pool.query(
        'SELECT * FROM activities WHERE user_id = $1 ORDER BY start_date DESC LIMIT 30',
        [req.user.id]
      );
      if (cached.rows.length > 0) {
        return res.json(cached.rows.map(formatActivity));
      }
    }

    const raw = await fetchActivities(req.user.access_token);
    const runs = filterRuns(raw);

    for (const run of runs) {
      await pool.query(`
        INSERT INTO activities (user_id, strava_id, name, type, start_date, distance, moving_time,
          average_speed, average_heartrate, max_heartrate, total_elevation_gain, average_cadence,
          map_polyline, raw_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (strava_id) DO NOTHING
      `, [
        req.user.id, run.id, run.name, run.type, run.start_date,
        run.distance, run.moving_time, run.average_speed,
        run.average_heartrate, run.max_heartrate, run.total_elevation_gain,
        run.average_cadence, run.map?.summary_polyline, run,
      ]);
    }

    res.json(runs.map(formatActivity));
  } catch (err) {
    console.error('Activities error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const activity = await fetchActivity(req.user.access_token, req.params.id);
    res.json(formatActivity(activity));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

function formatActivity(a) {
  const raw = a.raw_data || a;
  return {
    id: a.strava_id || a.id,
    name: raw.name,
    date: raw.start_date,
    distanceKm: metresToKm(raw.distance),
    pace: speedToPace(raw.average_speed),
    duration: formatDuration(raw.moving_time),
    avgHr: raw.average_heartrate ? Math.round(raw.average_heartrate) : null,
    maxHr: raw.max_heartrate ? Math.round(raw.max_heartrate) : null,
    elevGain: Math.round(raw.total_elevation_gain || 0),
    cadence: raw.average_cadence ? Math.round(raw.average_cadence * 2) : null,
    mapPolyline: raw.map?.summary_polyline || a.map_polyline || null,
    coachOneliner: a.coach_oneliner || null,
    hrZone: classifyRun(raw.average_heartrate),
  };
}

export default router;