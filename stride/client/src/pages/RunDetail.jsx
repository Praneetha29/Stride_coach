import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActivity } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import HrPill from '../components/runs/HrPill.jsx';
import CoachChat from '../components/coach/CoachChat.jsx';

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coachMode } = useAuth();
  const [run, setRun] = useState(null);
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  useEffect(() => {
    getActivity(id).then(setRun).catch(() => navigate('/'));
  }, [id]);

  if (!run) return <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>loading run...</div>;

  const openers = {
    fire: [
      `${run.distanceKm}km done. Let's talk about what actually happened out there.`,
      `HR averaged ${run.avgHr}bpm. I've seen the data. What's your take?`,
      `You finished. Now let's figure out if you did it right.`,
    ],
    cheer: [
      `YOU DID IT!! ${run.distanceKm}km and I am so proud!! Tell me everything!!`,
      `${run.pace}/km pace?? That's actually incredible!! How are you feeling??`,
      `You showed up and that's everything!! Let's talk about this run bestie!!`,
    ],
  };
  const opener = openers[coachMode][Math.floor(Math.random() * 3)];

  const date = new Date(run.date);
  const stats = [
    { label: 'distance', value: run.distanceKm, unit: 'km' },
    { label: 'pace',     value: run.pace,        unit: '/km' },
    { label: 'avg HR',   value: run.avgHr ?? '--', unit: 'bpm' },
    { label: 'time',     value: run.duration,    unit: '' },
    { label: 'elev',     value: run.elevGain ?? '--', unit: 'm' },
    { label: 'cadence',  value: run.cadence ?? '--', unit: 'spm' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <button style={styles.back} onClick={() => navigate('/')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        back to runs
      </button>
      <h1 style={styles.title}>{run.name}<HrPill zone={run.hrZone} /></h1>
      <p style={styles.date}>
        {date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })} · {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div style={styles.grid}>
        {stats.map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={styles.statVal}>{s.value}{s.unit && <span style={styles.statUnit}> {s.unit}</span>}</div>
          </div>
        ))}
      </div>
      <div style={styles.mapBox}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {run.mapPolyline ? 'route map' : 'no route data'}
        </span>
      </div>
      {run.coachOneliner && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', borderLeft: `2px solid ${accent}`, borderRadius: 0, paddingLeft: 8, marginBottom: 16, lineHeight: 1.5 }}>
          {run.coachOneliner}
        </p>
      )}
      <CoachChat run={run} initialMessage={opener} />
    </div>
  );
}

const styles = {
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 4 },
  date: { fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 },
  statCard: { background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '10px 10px 8px' },
  statLabel: { fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: 500 },
  statUnit: { fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 400 },
  mapBox: { background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, border: '0.5px solid var(--color-border)' },
};