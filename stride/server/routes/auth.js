import express from 'express';
import axios from 'axios';
import { pool } from '../utils/db.js';

const router = express.Router();

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// Step 1: redirect to Strava
router.get('/strava', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  res.redirect(`${STRAVA_AUTH_URL}?${params}`);
});

// Step 2: Strava redirects back with a code
router.get('/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${process.env.CLIENT_URL}?error=strava_auth_denied`);
  }

  try {
    const tokenRes = await axios.post(STRAVA_TOKEN_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenRes.data;

    const result = await pool.query(`
      INSERT INTO users (strava_id, name, profile_pic, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (strava_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at
      RETURNING *
    `, [
      athlete.id,
      `${athlete.firstname} ${athlete.lastname}`,
      athlete.profile_medium,
      access_token,
      refresh_token,
      expires_at,
    ]);

    req.session.userId = result.rows[0].id;

    // Save session explicitly before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${process.env.CLIENT_URL}?error=session_failed`);
      }
      res.redirect(`${process.env.CLIENT_URL}?auth=success&uid=${result.rows[0].id}`);
    });

  } catch (err) {
    console.error('Strava OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

// Check who's logged in
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const result = await pool.query('SELECT id, name, profile_pic FROM users WHERE id = $1', [req.session.userId]);
  if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

export default router;