import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, generateReport } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const STATUS = {
  green: { bg: 'var(--color-green-soft)', text: 'var(--color-green-text)', label: 'green — solid week' },
  amber: { bg: 'var(--color-amber-soft)', text: 'var(--color-amber-text)', label: 'amber — watch it' },
  red:   { bg: 'var(--color-red-soft)',   text: 'var(--color-red-text)',   label: 'red — overreaching' },
};

export default function ReportsPage() {
  const { coachMode } = useAuth();
  const [reports, setReports] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  useEffect(() => {
    getReports().then(setReports).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await generateReport(coachMode);
      setReports(prev => [r, ...prev]);
      setIdx(0);
    } catch {}
    setGenerating(false);
  }

  function weekLabel(r) {
    if (!r) return '';
    const s = new Date(r.week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const e = new Date(r.week_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  }

  const report = reports[idx];

  if (loading) return <div style={styles.state}>loading report...</div>;

  return (
    <div style={{ padding: 16 }}>
      {!reports.length ? (
        <div style={styles.state}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, textAlign: 'center' }}>
            no report yet — generates every sunday at 7pm automatically.
          </p>
          <button style={{ ...styles.genBtn, color: accent, borderColor: accent }} onClick={generate} disabled={generating}>
            {generating ? 'generating...' : 'generate now'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
            week of {weekLabel(report)}
          </div>
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>this week</span>
              {report?.status && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: STATUS[report.status]?.bg, color: STATUS[report.status]?.text }}>
                  {STATUS[report.status]?.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[
                { val: report?.total_km?.toFixed(1), label: 'total km' },
                { val: report?.total_runs, label: 'runs' },
                { val: report?.load_change_pct != null ? `${report.load_change_pct > 0 ? '+' : ''}${report.load_change_pct}%` : '--', label: 'vs last wk' },
                { val: report?.easy_run_pct != null ? `${report.easy_run_pct}%` : '--', label: 'easy HR %' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 500 }}>{s.val ?? '--'}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {report?.load_score != null && (
              <div style={{ margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 5 }}>
                  <span>weekly load</span><span>{report.load_score} / 100</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(report.load_score, 100)}%`, background: report.status === 'red' ? '#E24B4A' : report.status === 'amber' ? '#EF9F27' : '#639922' }} />
                </div>
              </div>
            )}
            <div style={styles.divider} />
            <p style={{ fontSize: 13, lineHeight: 1.75 }}>{report?.narrative}</p>
            <div style={styles.divider} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>10K predictor</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: accent }}>{report?.race_prediction ?? '--'}</span>
            </div>
          </div>

          {idx < reports.length - 1 && (
            <button style={styles.navBtn} onClick={() => setIdx(i => i + 1)}>
              ← previous week ({weekLabel(reports[idx + 1])})
            </button>
          )}
          {idx > 0 && (
            <button style={styles.navBtn} onClick={() => setIdx(i => i - 1)}>
              next week ({weekLabel(reports[idx - 1])}) →
            </button>
          )}
          <button style={{ ...styles.genBtn, color: accent, borderColor: accent, marginTop: 8 }} onClick={generate} disabled={generating}>
            {generating ? 'generating...' : 'regenerate report'}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  state: { padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  card: { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 14, marginBottom: 12 },
  divider: { height: '0.5px', background: 'var(--color-border)', margin: '10px 0' },
  navBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontSize: 12, color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 8, background: 'transparent', cursor: 'pointer', marginBottom: 8 },
  genBtn: { display: 'block', width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 500, border: '0.5px solid', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer' },
};