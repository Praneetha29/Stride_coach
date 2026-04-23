import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { initDb, pool } from './utils/db.js';
import authRoutes from './routes/auth.js';
import activitiesRoutes from './routes/activities.js';
import coachRoutes from './routes/coach.js';
import reportsRoutes from './routes/reports.js';
import { startReportScheduler } from './services/reportScheduler.js';
import notificationsRoutes from './routes/notifications.js';
import calendarRoutes from './routes/calendar.js';

const app = express();
const PORT = process.env.PORT || 3001;
const PgSession = connectPgSimple(session);

app.use(express.json());
app.use(cors({
  origin: 'https://stride-coach-alpha.vercel.app',
  credentials: true,
}));
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/activities', activitiesRoutes);
app.use('/coach', coachRoutes);
app.use('/reports', reportsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/calendar', calendarRoutes);

initDb()
  .then(() => {
    startReportScheduler();
    app.listen(PORT, () => {
      console.log(`Stride server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });