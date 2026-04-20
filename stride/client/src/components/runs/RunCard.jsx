import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import HrPill from './HrPill.jsx';

export default function RunCard({ run }) {
  const navigate = useNavigate();
  const { coachMode } = useAuth();
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';
  const date = new Date(run.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={styles.card} onClick={() => navigate(`/run/${run.id}`)}>
      <div style={styles.top}>
        <span style={styles.name}>{run.name}<HrPill zone={run.hrZone} /></span>
        <span style={styles.date}>{date}</span>
      </div>
      <div style={styles.stats}>
        <span style={styles.stat}><strong>{run.distanceKm} km</strong></span>
        <span style={styles.stat}><strong>{run.pace}</strong> /km</span>
        {run.avgHr && <span style={styles.stat}><strong>{run.avgHr}</strong> bpm avg</span>}
      </div>
      {run.coachOneliner && (
        <p style={{ ...styles.oneliner, borderLeftColor: accent }}>{run.coachOneliner}</p>
      )}
      <button
        style={{ ...styles.chatBtn, borderColor: accent, color: accent }}
        onClick={e => { e.stopPropagation(); navigate(`/run/${run.id}`); }}
      >
        <ChatIcon /> chat with coach
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

const styles = {
  card: { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 10, cursor: 'pointer' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 13, fontWeight: 500 },
  date: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  stats: { display: 'flex', gap: 14, marginBottom: 8 },
  stat: { fontSize: 12, color: 'var(--color-text-secondary)' },
  oneliner: { fontSize: 12, color: 'var(--color-text-secondary)', borderLeft: '2px solid', borderRadius: 0, paddingLeft: 8, marginBottom: 10, lineHeight: 1.5 },
  chatBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: '0.5px solid', background: 'transparent' },
};