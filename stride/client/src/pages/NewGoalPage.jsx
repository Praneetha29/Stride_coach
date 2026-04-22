import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGoal } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const DISTANCES = ['5K', '10K', 'HM', 'Full'];

export default function NewGoalPage() {
  const navigate = useNavigate();
  const { coachMode } = useAuth();
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  const [form, setForm] = useState({
    raceName: '',
    raceDistance: '10K',
    goalTime: '',
    raceDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function submit() {
    if (!form.raceName || !form.raceDate) {
      setError('race name and date are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { goal } = await createGoal(form);
      navigate(`/plan/${goal.id}`);
    } catch (err) {
      setError('failed to generate plan — try again');
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <button style={styles.back} onClick={() => navigate('/goals')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        back
      </button>

      <h1 style={styles.title}>set a new goal</h1>
      <p style={styles.sub}>stride will build a personalised training plan based on your current fitness from Strava.</p>

      <div style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>race name</label>
          <input
            style={styles.input}
            placeholder="e.g. Chennai 10K 2025"
            value={form.raceName}
            onChange={e => set('raceName', e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>distance</label>
          <div style={styles.distRow}>
            {DISTANCES.map(d => (
              <button
                key={d}
                style={{
                  ...styles.distBtn,
                  background: form.raceDistance === d ? accent : 'transparent',
                  color: form.raceDistance === d ? '#fff' : 'var(--color-text-secondary)',
                  borderColor: form.raceDistance === d ? accent : 'var(--color-border)',
                }}
                onClick={() => set('raceDistance', d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>race date</label>
          <input
            style={styles.input}
            type="date"
            value={form.raceDate}
            onChange={e => set('raceDate', e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            target time <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            style={styles.input}
            placeholder="e.g. 1:05:00"
            value={form.goalTime}
            onChange={e => set('goalTime', e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{
            ...styles.submit,
            background: loading ? 'var(--color-border)' : accent,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'generating your plan...' : 'generate training plan'}
        </button>

        {loading && (
          <p style={styles.loadingNote}>
            claude is building your personalised plan — this takes about 15 seconds
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' },
  input: { fontSize: 14, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', outline: 'none', width: '100%' },
  distRow: { display: 'flex', gap: 8 },
  distBtn: { flex: 1, fontSize: 13, fontWeight: 500, padding: '8px 0', borderRadius: 'var(--radius-md)', border: '0.5px solid', cursor: 'pointer', transition: 'all 0.15s' },
  submit: { color: '#fff', fontSize: 14, fontWeight: 500, padding: '13px 0', borderRadius: 'var(--radius-md)', border: 'none', transition: 'opacity 0.15s' },
  error: { fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 'var(--radius-md)' },
  loadingNote: { fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.5 },
};