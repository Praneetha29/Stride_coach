import express from 'express';
import { pool } from '../utils/db.js';
import { chatWithCoach, generateRunOneliner } from '../services/claudeService.js';

const router = express.Router();

async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
  if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
  req.user = result.rows[0];
  next();
}

// POST /coach/chat/:activityId
router.post('/chat/:activityId', requireAuth, async (req, res) => {
  const { message, history = [], coachMode = 'fire' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  try {
    const result = await pool.query(
      'SELECT * FROM activities WHERE strava_id = $1 AND user_id = $2',
      [req.params.activityId, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Activity not found' });

    const run = result.rows[0].raw_data;
    const reply = await chatWithCoach(run, message, history, coachMode);
    res.json({ reply });
  } catch (err) {
    console.error('Coach chat error:', err.message);
    res.status(500).json({ error: 'Coach is on a rest day' });
  }
});

// POST /coach/oneliner/:activityId
router.post('/oneliner/:activityId', requireAuth, async (req, res) => {
  const { coachMode = 'fire' } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM activities WHERE strava_id = $1 AND user_id = $2',
      [req.params.activityId, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Activity not found' });

    const run = result.rows[0].raw_data;
    const oneliner = await generateRunOneliner(run, coachMode);

    await pool.query(
      'UPDATE activities SET coach_oneliner = $1 WHERE strava_id = $2 AND user_id = $3',
      [oneliner, req.params.activityId, req.user.id]
    );

    res.json({ oneliner });
  } catch (err) {
    console.error('Oneliner error:', err.message);
    res.status(500).json({ error: 'Failed to generate oneliner' });
  }
});

export default router;