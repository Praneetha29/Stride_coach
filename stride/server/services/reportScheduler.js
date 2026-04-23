import cron from 'node-cron';
import { pool } from '../utils/db.js';
import { generateReportForUser } from '../routes/reports.js';

export function startReportScheduler() {
  // Every Sunday 7pm IST = 13:30 UTC
  cron.schedule('30 13 * * 0', async () => {
    console.log('[Scheduler] Running Sunday jobs...');
    try {
      const result = await pool.query('SELECT * FROM users');
      for (const user of result.rows) {
        try {
          await generateReportForUser(user, user.coach_mode || 'fire');
          console.log(`[Scheduler] Report done for user ${user.id}`);
        } catch (err) {
          console.error(`[Scheduler] Report failed for user ${user.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error fetching users:', err.message);
    }
  });

  console.log('[Scheduler] Weekly reports scheduled for Sundays 7pm IST');
}