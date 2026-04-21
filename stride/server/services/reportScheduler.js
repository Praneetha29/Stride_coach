import cron from 'node-cron';
import { pool } from '../utils/db.js';
import { generateReportForUser } from '../routes/reports.js';
import { adaptTrainingWeek } from './claudeService.js';

async function adaptPlansForUser(user) {
  const goalsResult = await pool.query(
    'SELECT * FROM training_goals WHERE user_id = $1 AND status = $2',
    [user.id, 'active']
  );

  for (const goal of goalsResult.rows) {
    const weeksResult = await pool.query(
      'SELECT * FROM training_weeks WHERE goal_id = $1 ORDER BY week_number',
      [goal.id]
    );
    const weeks = weeksResult.rows;
    const currentWeek = weeks.find(w => w.status === 'current');
    const nextWeek = weeks.find(w => w.status === 'upcoming');

    if (!currentWeek || !nextWeek) continue;

    const weekStart = new Date(currentWeek.week_start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const runsResult = await pool.query(
      'SELECT raw_data FROM activities WHERE user_id = $1 AND start_date BETWEEN $2 AND $3',
      [user.id, weekStart.toISOString(), weekEnd.toISOString()]
    );
    const actualRuns = runsResult.rows.map(r => r.raw_data);

    try {
      const adaptation = await adaptTrainingWeek(
        currentWeek,
        actualRuns,
        nextWeek,
        user.coach_mode || 'fire'
      );

      if (adaptation.adjustment_needed) {
        await pool.query(
          'UPDATE training_weeks SET planned_runs = $1, adjustment_note = $2, status = $3 WHERE id = $4',
          [
            JSON.stringify(adaptation.updated_days),
            adaptation.adjustment_note,
            'adjusted',
            nextWeek.id,
          ]
        );

        await pool.query(
          'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
          [
            user.id,
            'plan_adjusted',
            `Your training plan was updated: ${adaptation.adjustment_note}`,
          ]
        );
      }

      // Mark current week done, promote next week
      await pool.query(
        'UPDATE training_weeks SET status = $1 WHERE id = $2',
        ['completed', currentWeek.id]
      );
      await pool.query(
        'UPDATE training_weeks SET status = $1 WHERE id = $2',
        ['current', nextWeek.id]
      );
    } catch (err) {
      console.error(`Plan adaptation error for goal ${goal.id}:`, err.message);
    }
  }
}

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
        try {
          await adaptPlansForUser(user);
          console.log(`[Scheduler] Plan adaptation done for user ${user.id}`);
        } catch (err) {
          console.error(`[Scheduler] Plan adaptation failed for user ${user.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error fetching users:', err.message);
    }
  });

  console.log('[Scheduler] Weekly jobs scheduled for Sundays 7pm IST');
}