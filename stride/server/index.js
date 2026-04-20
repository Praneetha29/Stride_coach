import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { initDb } from './utils/db.js';
import authRoutes from './routes/auth.js'; 
import activitiesRoutes from './routes/activities.js';
import { fetchActivities, fetchActivity, filterRuns, speedToPace, metresToKm, formatDuration } from './services/stravaService.js';
import coachRoutes from './routes/coach.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);  
app.use('/activities', activitiesRoutes);
app.use('/coach', coachRoutes); 


// Boot
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Stride server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });