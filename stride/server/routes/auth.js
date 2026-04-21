import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { pool } from '../utils/db.js';

const router = express.Router();
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

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

    // Generate JWT instead of session cookie
    const jwtToken = jwt.sign(
      { userId: result.rows[0].id },
      process.env.SESSION_SECRET,
      { expiresIn: '30d' }
    );

    // Pass token to frontend via URL
    res.redirect(`${process.env.CLIENT_URL}?auth=success&token=${jwtToken}`);
  } catch (err) {
    console.error('Strava OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    const result = await pool.query(
      'SELECT id, name, profile_pic FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  
  res.json({ success: true });
});

export default router;