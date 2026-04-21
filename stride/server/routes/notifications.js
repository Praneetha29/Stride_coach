import express from 'express';
import { pool } from '../utils/db.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// PATCH /notifications/read-all
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;