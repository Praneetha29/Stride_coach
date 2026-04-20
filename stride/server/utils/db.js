import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      strava_id BIGINT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      profile_pic TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at BIGINT NOT NULL,
      coach_mode TEXT DEFAULT 'fire',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      strava_id BIGINT UNIQUE NOT NULL,
      name TEXT,
      type TEXT,
      start_date TIMESTAMPTZ,
      distance FLOAT,
      moving_time INTEGER,
      average_speed FLOAT,
      average_heartrate FLOAT,
      max_heartrate FLOAT,
      total_elevation_gain FLOAT,
      average_cadence FLOAT,
      map_polyline TEXT,
      coach_oneliner TEXT,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      total_km FLOAT,
      total_runs INTEGER,
      avg_hr FLOAT,
      easy_run_pct FLOAT,
      load_score FLOAT,
      load_change_pct FLOAT,
      status TEXT,
      narrative TEXT,
      race_prediction TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, week_start)
    );
  `);
  console.log('Database tables ready');
}

export { pool };