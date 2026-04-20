import axios from 'axios';

const STRAVA_API = 'https://www.strava.com/api/v3';

export async function fetchActivities(accessToken, page = 1, perPage = 30) {
  const res = await axios.get(`${STRAVA_API}/athlete/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { page, per_page: perPage },
  });
  return res.data;
}

export async function fetchActivity(accessToken, activityId) {
  const res = await axios.get(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

export function filterRuns(activities) {
  return activities.filter(a => a.type === 'Run' || a.sport_type === 'Run');
}

export function speedToPace(metersPerSecond) {
  if (!metersPerSecond) return '--:--';
  const secsPerKm = 1000 / metersPerSecond;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function metresToKm(metres) {
  return Math.round((metres / 1000) * 10) / 10;
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}