import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGoalPlan } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TYPE_STYLES = {
  easy:      { bg: '#EAF3DE', text: '#3B6D11', label: 'easy' },
  tempo:     { bg: '#FAEEDA', text: '#854F0B', label: 'tempo' },
  intervals: { bg: '#FAECE7', text: '#993C1D', label: 'intervals' },
  long:      { bg: '#E6F1FB', text: '#185FA5', label: 'long' },
  rest:      { bg: '#F1EFE8', text: '#888780', label: 'rest' },
  race:      { bg: '#FBEAF0', text: '#993356', label: 'race' },
};

export default function PlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coachMode } = useAuth();
  const [goal, setGoal] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  useEffect(() => {
    getGoalPlan(id)
      .then(({ goal, weeks }) => {
        setGoal(goal);
        setWeeks(weeks);
      })
      .catch(() => navigate('/goals'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.state}>loading your plan...</div>;
  if (!goal) return null;

  const raceDate = new Date(goal.race_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  const daysLeft = Math.max(0, Math.round((new Date(goal.race_date) - new Date()) / (24 * 60 * 60 * 1000)));

  return (
    <div style={{ padding: 16 }}>
      <button style={styles.back} onClick={() => navigate('/goals')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        back to goals
      </button>

      {/* Goal header */}
      <div style={styles.goalHeader}>
        <div>
          <h1 style={styles.goalName}>{goal.race_name}</h1>
          <p style={styles.goalMeta}>
            {goal.race_distance} · {raceDate}
            {goal.goal_time && ` · target ${goal.goal_time}`}
          </p>
        </div>
        <div style={styles.daysChip}>{daysLeft}d</div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(TYPE_STYLES).map(([type, s]) => (
          <span key={type} style={{ ...styles.legendItem, background: s.bg, color: s.text }}>
            {s.label}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div style={styles.calendar}>
        {/* Day headers */}
        <div style={styles.calHeader}>
          <div style={styles.weekCol} />
          {DAYS.map(d => (
            <div key={d} style={styles.dayHeader}>{d}</div>
          ))}
        </div>

        {weeks.map(week => {
  const days = typeof week.planned_runs === 'string'
    ? JSON.parse(week.planned_runs)
    : (week.planned_runs || []);

  const isCurrentWeek = week.status === 'current';
  const isCompleted = week.status === 'completed';

  return (
    <div key={week.id}>
      <div style={{
        ...styles.calRow,
        background: isCurrentWeek ? 'var(--color-surface)' : 'transparent',
        border: isCurrentWeek ? `0.5px solid ${accent}` : '0.5px solid transparent',
        borderRadius: isCurrentWeek ? 'var(--radius-md)' : 0,
      }}>
        <div style={styles.weekCol}>
          <div style={styles.weekNum}>w{week.week_number}</div>
          {isCurrentWeek && <div style={{ ...styles.weekBadge, color: accent }}>now</div>}
          {isCompleted && <div style={{ ...styles.weekBadge, color: 'var(--color-text-tertiary)' }}>done</div>}
        </div>

        {DAYS.map(dayName => {
          const dayData = days.find(d => d.day === dayName);
          const s = TYPE_STYLES[dayData?.type] || TYPE_STYLES.rest;

          return (
            <div
              key={dayName}
              style={{
                ...styles.dayCell,
                background: s.bg,
                opacity: isCompleted ? 0.5 : 1,
                cursor: dayData?.detail ? 'pointer' : 'default',
              }}
              onClick={() => dayData?.detail && setSelectedDay(dayData)}
            >
              {dayData?.type !== 'rest' && dayData?.distance > 0 && (
                <div style={{ ...styles.dayCellKm, color: s.text }}>
                  {dayData.distance}k
                </div>
              )}
              {(!dayData || dayData?.type === 'rest') && (
                <div style={{ ...styles.dayCellKm, color: s.text, fontSize: 8 }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      {week.adjustment_note && (
        <div style={styles.adjustNote}>
          plan adjusted: {week.adjustment_note}
        </div>
      )}
    </div>
  );
})}
      </div>

      {/* Day detail drawer */}
      {selectedDay && (
        <div style={styles.overlay} onClick={() => setSelectedDay(null)}>
          <div style={styles.drawer} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <div style={styles.drawerTop}>
                <span style={{
                  ...styles.typePill,
                  background: TYPE_STYLES[selectedDay.type]?.bg,
                  color: TYPE_STYLES[selectedDay.type]?.text,
                }}>
                  {selectedDay.type}
                </span>
                {selectedDay.distance > 0 && (
                  <span style={styles.drawerDist}>{selectedDay.distance} km</span>
                )}
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            <p style={styles.drawerDetail}>{selectedDay.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  state: { padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' },
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14 },
  goalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  goalName: { fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px', marginBottom: 4 },
  goalMeta: { fontSize: 12, color: 'var(--color-text-secondary)' },
  daysChip: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-tertiary)', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '4px 10px' },
  legend: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  legendItem: { fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)' },
  calendar: { display: 'flex', flexDirection: 'column', gap: 4 },
  calHeader: { display: 'flex', alignItems: 'center', marginBottom: 4 },
  weekCol: { width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  calRow: { display: 'flex', alignItems: 'center', padding: '4px 6px', gap: 3 },
  weekNum: { fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 },
  weekBadge: { fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' },
  dayCell: { flex: 1, height: 36, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' },
  dayCellKm: { fontSize: 9, fontWeight: 500 },
  adjustNote: { fontSize: 11, color: 'var(--color-amber-text)', background: 'var(--color-amber-soft)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', margin: '2px 0 4px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'flex-end' },
  drawer: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: 20, width: '100%', maxHeight: '60vh', overflowY: 'auto' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  drawerTop: { display: 'flex', alignItems: 'center', gap: 10 },
  typePill: { fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-pill)' },
  drawerDist: { fontSize: 15, fontWeight: 500 },
  closeBtn: { background: 'none', border: 'none', fontSize: 14, color: 'var(--color-text-tertiary)', cursor: 'pointer' },
  drawerDetail: { fontSize: 14, lineHeight: 1.75, color: 'var(--color-text-primary)' },
};