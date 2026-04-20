import { useMemo } from 'react';
import { useActivities } from '../hooks/useActivities.js';
import RunCard from '../components/runs/RunCard.jsx';

export default function RunsPage() {
  const { activities, loading, error, refresh } = useActivities();

  const grouped = useMemo(() => {
    const weeks = {};
    for (const run of activities) {
      const d = new Date(run.date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = { monday: new Date(d), runs: [] };
      weeks[key].runs.push(run);
    }
    return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
  }, [activities]);

  function weekLabel(monday) {
    const now = new Date();
    const thisMonday = new Date(now);
    const day = now.getDay();
    thisMonday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
    thisMonday.setHours(0, 0, 0, 0);
    const diff = (thisMonday - monday) / (7 * 24 * 60 * 60 * 1000);
    if (diff < 1) return 'this week';
    if (diff < 2) return 'last week';
    return monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' week';
  }

  if (loading) return <div style={styles.state}>loading your runs...</div>;
  if (error) return <div style={styles.state}>{error}</div>;
  if (!activities.length) return (
    <div style={styles.state}>
      no runs yet!
      <button style={styles.btn} onClick={refresh}>sync strava</button>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={styles.syncBtn} onClick={refresh}>sync strava</button>
      </div>
      {grouped.map(([key, { monday, runs }]) => (
        <div key={key}>
          <div style={styles.weekLabel}>
            {weekLabel(monday)} · {runs.length} run{runs.length !== 1 ? 's' : ''}
          </div>
          {runs.map(run => <RunCard key={run.id} run={run} />)}
        </div>
      ))}
    </div>
  );
}

const styles = {
  state: { padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  weekLabel: { fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10, marginTop: 4 },
  syncBtn: { fontSize: 11, padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)' },
  btn: { fontSize: 12, padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' },
};