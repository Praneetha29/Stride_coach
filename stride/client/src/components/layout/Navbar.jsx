import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function Navbar() {
  const { coachMode, toggleCoach } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isRuns = pathname === '/' || pathname.startsWith('/run/');
  const isReports = pathname === '/reports';
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  return (
    <nav style={styles.nav}>
      <div style={styles.top}>
        <span style={styles.logo}>
          stride<span style={{ color: accent }}>.</span>
        </span>
        <button onClick={toggleCoach} style={styles.toggleWrap}>
          <span style={styles.toggleLabel}>coach</span>
          <div style={styles.pill}>
            <span style={{
              ...styles.pillOpt,
              background: fire ? 'var(--color-accent)' : 'transparent',
              color: fire ? '#fff' : 'var(--color-text-tertiary)',
            }}>fire</span>
            <span style={{
              ...styles.pillOpt,
              background: !fire ? 'var(--color-cheer)' : 'transparent',
              color: !fire ? '#fff' : 'var(--color-text-tertiary)',
            }}>hype</span>
          </div>
        </button>
      </div>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(isRuns ? { color: accent, borderBottom: `2px solid ${accent}`, fontWeight: 500 } : {}) }}
          onClick={() => navigate('/')}
        >my runs</button>
        <button
          style={{ ...styles.tab, ...(isReports ? { color: accent, borderBottom: `2px solid ${accent}`, fontWeight: 500 } : {}) }}
          onClick={() => navigate('/reports')}
        >weekly report</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { background: 'var(--color-surface)', borderBottom: '0.5px solid var(--color-border)', padding: '14px 16px 0', position: 'sticky', top: 0, zIndex: 10 },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logo: { fontSize: 17, fontWeight: 500, letterSpacing: '-0.5px' },
  toggleWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '4px 6px 4px 10px' },
  toggleLabel: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  pill: { display: 'flex', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' },
  pillOpt: { fontSize: 11, padding: '3px 9px', borderRadius: 'var(--radius-pill)', transition: 'all 0.18s' },
  tabs: { display: 'flex' },
  tab: { flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 0', borderBottom: '2px solid transparent', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' },
};