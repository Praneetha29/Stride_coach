import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoals, updateGoalStatus } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const DISTANCE_COLORS = {
  '5K':   { bg: '#EAF3DE', text: '#3B6D11' },
  '10K':  { bg: '#FAEEDA', text: '#854F0B' },
  'HM':   { bg: '#FAECE7', text: '#993C1D' },
  'Full': { bg: '#FBEAF0', text: '#993356' },
};

export default function GoalsPage() {
  const navigate = useNavigate();
  const { coachMode } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  useEffect(() => {
    getGoals()
      .then(setGoals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function abandon(id) {
    await updateGoalStatus(id, 'abandoned');
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: 'abandoned' } : g));
  }

  const active = goals.filter(g => g.status === 'active');
  const past = goals.filter(g => g.status !== 'active');

  if (loading) return <div style={styles.state}>loading goals...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.headerRow}>
        <span style={styles.heading}>my goals</span>
        <button
          style={{ ...styles.newBtn, color: accent, borderColor: accent }}
          onClick={() => navigate('/goals/new')}
        >
          + new goal
        </button>
      </div>

      {!goals.length ? (
        <div style={styles.empty}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 }}>
            no goals yet. set a race target and stride will build you a training plan.
          </p>
          <button
            style={{ ...styles.newBtn, color: accent, borderColor: accent, padding: '10px 24px' }}
            onClick={() => navigate('/goals/new')}
          >
            set your first goal
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div style={styles.sectionLabel}>active</div>
              {active.map(g => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  accent={accent}
                  onView={() => navigate(`/plan/${g.id}`)}
                  onAbandon={() => abandon(g.id)}
                />
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <div style={styles.sectionLabel}>past</div>
              {past.map(g => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  accent={accent}
                  onView={() => navigate(`/plan/${g.id}`)}
                  past
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal, accent, onView, onAbandon, past }) {
  const dc = DISTANCE_COLORS[goal.race_distance] || DISTANCE_COLORS['10K'];
  const daysLeft = Math.max(0, Math.round((new Date(goal.race_date) - new Date()) / (24 * 60 * 60 * 1000)));
  const raceDate = new Date(goal.race_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ ...styles.card, opacity: past ? 0.6 : 1 }}>
      <div style={styles.cardTop}>
        <div>
          <span style={{ ...styles.distPill, background: dc.bg, color: dc.text }}>
            {goal.race_distance}
          </span>
          <span style={styles.raceName}>{goal.race_name}</span>
        </div>
        {!past && (
          <span style={styles.daysLeft}>{daysLeft}d to go</span>
        )}
      </div>
      <div style={styles.cardMid}>
        <span style={styles.metaItem}>{raceDate}</span>
        {goal.goal_time && <span style={styles.metaItem}>target {goal.goal_time}</span>}
      </div>
      <div style={styles.cardActions}>
        <button
          style={{ ...styles.viewBtn, color: accent, borderColor: accent }}
          onClick={onView}
        >
          view plan
        </button>
        {!past && onAbandon && (
          <button style={styles.abandonBtn} onClick={onAbandon}>
            abandon
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  state: { padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 17, fontWeight: 500 },
  newBtn: { fontSize: 12, padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '0.5px solid', background: 'transparent', cursor: 'pointer' },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10, marginTop: 4 },
  empty: { padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  card: { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 10 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  distPill: { fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)', marginRight: 8 },
  raceName: { fontSize: 14, fontWeight: 500 },
  daysLeft: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  cardMid: { display: 'flex', gap: 12, marginBottom: 12 },
  metaItem: { fontSize: 12, color: 'var(--color-text-secondary)' },
  cardActions: { display: 'flex', gap: 8 },
  viewBtn: { fontSize: 11, padding: '5px 14px', borderRadius: 'var(--radius-pill)', border: '0.5px solid', background: 'transparent', cursor: 'pointer' },
  abandonBtn: { fontSize: 11, padding: '5px 14px', borderRadius: 'var(--radius-pill)', border: '0.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-tertiary)', cursor: 'pointer' },
};