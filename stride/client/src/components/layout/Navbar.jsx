import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useState, useEffect } from 'react';
import { getUnreadCount, getNotifications, markAllRead } from '../../utils/api.js';

export default function Navbar() {
  const { coachMode, toggleCoach } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);

  const isRuns = pathname === '/' || pathname.startsWith('/run/');
  const isReports = pathname === '/reports';
  const isGoals = pathname === '/goals' || pathname.startsWith('/plan/');
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  useEffect(() => {
    getUnreadCount().then(d => setUnread(d.count)).catch(() => {});
  }, []);

  async function openNotifs() {
    if (showNotifs) { setShowNotifs(false); return; }
    try {
      const data = await getNotifications();
      setNotifs(data);
      setShowNotifs(true);
      if (unread > 0) {
        await markAllRead();
        setUnread(0);
      }
    } catch {}
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.top}>
        <span style={styles.logo}>
          stride<span style={{ color: accent }}>.</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={openNotifs} style={styles.bellBtn}>
              <BellIcon />
              {unread > 0 && (
                <span style={styles.badge}>{unread}</span>
              )}
            </button>
            {showNotifs && (
              <div style={styles.notifDrawer}>
                <div style={styles.notifHeader}>notifications</div>
                {notifs.length === 0 ? (
                  <div style={styles.notifEmpty}>no notifications yet</div>
                ) : (
                  notifs.map(n => (
                    <div key={n.id} style={styles.notifItem}>
                      <div style={styles.notifMsg}>{n.message}</div>
                      <div style={styles.notifTime}>
                        {new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Coach toggle */}
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
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(isRuns ? { color: accent, borderBottom: `2px solid ${accent}`, fontWeight: 500 } : {}) }}
          onClick={() => navigate('/')}
        >my runs</button>
        <button
          style={{ ...styles.tab, ...(isReports ? { color: accent, borderBottom: `2px solid ${accent}`, fontWeight: 500 } : {}) }}
          onClick={() => navigate('/reports')}
        >report</button>
        <button
          style={{ ...styles.tab, ...(isGoals ? { color: accent, borderBottom: `2px solid ${accent}`, fontWeight: 500 } : {}) }}
          onClick={() => navigate('/goals')}
        >goals</button>
      </div>
    </nav>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

const styles = {
  nav: { background: 'var(--color-surface)', borderBottom: '0.5px solid var(--color-border)', padding: '14px 16px 0', position: 'sticky', top: 0, zIndex: 10 },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logo: { fontSize: 17, fontWeight: 500, letterSpacing: '-0.5px' },
  bellBtn: { position: 'relative', background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' },
  badge: { position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#E24B4A', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 },
  notifDrawer: { position: 'absolute', top: 36, right: 0, width: 280, background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', zIndex: 100, overflow: 'hidden' },
  notifHeader: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)', padding: '10px 14px', borderBottom: '0.5px solid var(--color-border)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  notifEmpty: { fontSize: 13, color: 'var(--color-text-tertiary)', padding: '16px 14px', textAlign: 'center' },
  notifItem: { padding: '10px 14px', borderBottom: '0.5px solid var(--color-border)' },
  notifMsg: { fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: 4 },
  notifTime: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  toggleWrap: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '4px 6px 4px 10px' },
  toggleLabel: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  pill: { display: 'flex', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' },
  pillOpt: { fontSize: 11, padding: '3px 9px', borderRadius: 'var(--radius-pill)', transition: 'all 0.18s' },
  tabs: { display: 'flex' },
  tab: { flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 0', borderBottom: '2px solid transparent', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' },
};