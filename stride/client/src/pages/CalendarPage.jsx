import { useState, useEffect } from 'react';
import { getCalendar, addRacePin, removeRacePin, resyncCalendar } from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DISTANCES = ['5K', '10K', 'HM', 'Full', 'Other'];
const RUNS_OPTIONS = [2, 3, 4, 5];
const GYM_DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const TYPE_STYLES = {
  easy:      { bg: '#EAF3DE', text: '#3B6D11' },
  tempo:     { bg: '#FAEEDA', text: '#854F0B' },
  intervals: { bg: '#FAECE7', text: '#993C1D' },
  long:      { bg: '#E6F1FB', text: '#185FA5' },
  gym:       { bg: '#EEEDFE', text: '#3C3489' },
  rest:      { bg: '#F1EFE8', text: '#888780' },
  race:      { bg: '#FBEAF0', text: '#993356' },
};

const DISTANCE_COLORS = {
  '5K':    { bg: '#EAF3DE', text: '#3B6D11' },
  '10K':   { bg: '#FAEEDA', text: '#854F0B' },
  'HM':    { bg: '#FAECE7', text: '#993C1D' },
  'Full':  { bg: '#FBEAF0', text: '#993356' },
  'Other': { bg: '#EEEDFE', text: '#3C3489' },
};

export default function CalendarPage() {
  const { coachMode } = useAuth();
  const [calendar, setCalendar] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPin, setShowAddPin] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState(null);
  const [adding, setAdding] = useState(false);

  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';

  const [form, setForm] = useState({
    raceName: '',
    raceDistance: '10K',
    raceDate: '',
    goalTime: '',
    runsPerWeek: 4,
    gymDays: [],
    notes: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getCalendar();
      setCalendar(data.calendar);
      setWeeks(data.weeks);
      setPins(data.pins);
    } catch {}
    setLoading(false);
  }

  async function handleAddPin() {
    if (!form.raceName || !form.raceDate) return;
    setAdding(true);
    try {
      await addRacePin({
        raceName: form.raceName,
        raceDistance: form.raceDistance,
        raceDate: form.raceDate,
        goalTime: form.goalTime || null,
        runsPerWeek: form.runsPerWeek,
        gymDays: form.gymDays,
        notes: form.notes || null,
      });
      setShowAddPin(false);
      setForm({ raceName: '', raceDistance: '10K', raceDate: '', goalTime: '', runsPerWeek: 4, gymDays: [], notes: '' });
      await load();
    } catch {}
    setAdding(false);
  }

  async function handleRemovePin(pinId) {
    await removeRacePin(pinId);
    setPins(prev => prev.filter(p => p.id !== pinId));
  }

  async function handleResync() {
    setResyncing(true);
    setResyncResult(null);
    try {
      const result = await resyncCalendar(coachMode);
      setResyncResult(result);
      await load();
    } catch {
      setResyncResult({ error: 'Resync failed — try again' });
    }
    setResyncing(false);
  }

  function toggleGymDay(day) {
    setForm(prev => ({
      ...prev,
      gymDays: prev.gymDays.includes(day)
        ? prev.gymDays.filter(d => d !== day)
        : [...prev.gymDays, day],
    }));
  }

  // Insert race pins into the week list as markers
  function buildCalendarRows() {
    const rows = [];
    const sortedPins = [...pins].sort((a, b) => new Date(a.race_date) - new Date(b.race_date));

    for (const week of weeks) {
      const weekEnd = new Date(week.week_start);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Insert any pins that fall in this week
      for (const pin of sortedPins) {
        const pinDate = new Date(pin.race_date);
        if (pinDate >= new Date(week.week_start) && pinDate < weekEnd) {
          rows.push({ type: 'pin', pin });
        }
      }

      rows.push({ type: 'week', week });
    }

    return rows;
  }

  if (loading) return <div style={styles.state}>loading your calendar...</div>;

  const rows = buildCalendarRows();

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={styles.headerRow}>
        <span style={styles.heading}>training calendar</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...styles.iconBtn, color: accent, borderColor: accent }}
            onClick={handleResync}
            disabled={resyncing}
          >
            {resyncing ? '...' : '↻ resync'}
          </button>
          <button
            style={{ ...styles.iconBtn, background: accent, color: '#fff', borderColor: accent }}
            onClick={() => setShowAddPin(true)}
          >
            + race
          </button>
        </div>
      </div>

      {/* Resync result */}
      {resyncResult && !resyncResult.error && (
        <div style={styles.resyncCard}>
          <span style={{
            ...styles.adjBadge,
            background: resyncResult.adjustment === 'ahead' ? '#EAF3DE'
              : resyncResult.adjustment === 'behind' ? '#FCEBEB' : '#FAEEDA',
            color: resyncResult.adjustment === 'ahead' ? '#3B6D11'
              : resyncResult.adjustment === 'behind' ? '#A32D2D' : '#854F0B',
          }}>
            {resyncResult.adjustment === 'ahead' ? 'ahead of plan'
              : resyncResult.adjustment === 'behind' ? 'behind plan' : 'on track'}
          </span>
          <p style={styles.resyncAssessment}>{resyncResult.assessment}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {resyncResult.weeksUpdated} weeks updated
          </p>
        </div>
      )}

      {/* Empty state */}
      {weeks.length === 0 && (
        <div style={styles.empty}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 16 }}>
            no races pinned yet. add your first race and stride will build your training calendar.
          </p>
          <button
            style={{ ...styles.iconBtn, background: accent, color: '#fff', borderColor: accent, padding: '10px 24px' }}
            onClick={() => setShowAddPin(true)}
          >
            + add your first race
          </button>
        </div>
      )}

      {/* Legend */}
      {weeks.length > 0 && (
        <div style={styles.legend}>
          {Object.entries(TYPE_STYLES).map(([type, s]) => (
            <span key={type} style={{ ...styles.legendItem, background: s.bg, color: s.text }}>
              {type}
            </span>
          ))}
        </div>
      )}

      {/* Calendar */}
      {weeks.length > 0 && (
        <div style={styles.calendar}>
          {/* Day headers */}
          <div style={styles.calHeader}>
            <div style={styles.weekCol} />
            {DAY_LABELS.map(d => (
              <div key={d} style={styles.dayHeader}>{d}</div>
            ))}
          </div>

          {rows.map((row, i) => {
            if (row.type === 'pin') {
              const pin = row.pin;
              const dc = DISTANCE_COLORS[pin.race_distance] || DISTANCE_COLORS['Other'];
              const raceDate = new Date(pin.race_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              return (
                <div key={`pin-${pin.id}`} style={styles.pinRow}>
                  <div style={{ ...styles.pinBadge, background: dc.bg, color: dc.text }}>
                    {pin.race_distance}
                  </div>
                  <div style={styles.pinLine} />
                  <div style={styles.pinInfo}>
                    <span style={{ ...styles.pinName, color: dc.text }}>{pin.race_name}</span>
                    <span style={styles.pinDate}>{raceDate}</span>
                  </div>
                  <div style={styles.pinLine} />
                  <button
                    style={styles.pinRemove}
                    onClick={() => handleRemovePin(pin.id)}
                  >✕</button>
                </div>
              );
            }

            const week = row.week;
            const days = Array.isArray(week.planned_days)
              ? week.planned_days
              : typeof week.planned_days === 'string'
                ? JSON.parse(week.planned_days)
                : [];

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
                    {isCurrentWeek && <div style={{ fontSize: 9, color: accent, fontWeight: 500, textTransform: 'uppercase' }}>now</div>}
                    {isCompleted && <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase' }}>done</div>}
                  </div>

                  {DAYS.map(dayName => {
                    const dayData = days.find(d => d.day?.toLowerCase() === dayName);
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
                          <div style={{ fontSize: 9, fontWeight: 500, color: s.text }}>
                            {dayData.distance}k
                          </div>
                        )}
                        {dayData?.type === 'gym' && (
                          <div style={{ fontSize: 9, fontWeight: 500, color: s.text }}>gym</div>
                        )}
                        {(!dayData || dayData?.type === 'rest') && (
                          <div style={{ fontSize: 8, color: s.text }}>—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {week.adjustment_note && (
                  <div style={styles.adjustNote}>{week.adjustment_note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Day detail drawer */}
      {selectedDay && (
        <div style={styles.overlay} onClick={() => setSelectedDay(null)}>
          <div style={styles.drawer} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                  background: TYPE_STYLES[selectedDay.type]?.bg,
                  color: TYPE_STYLES[selectedDay.type]?.text,
                }}>
                  {selectedDay.type}
                </span>
                {selectedDay.distance > 0 && (
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{selectedDay.distance} km</span>
                )}
              </div>
              <button
                style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
                onClick={() => setSelectedDay(null)}
              >✕</button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-text-primary)' }}>
              {selectedDay.detail}
            </p>
          </div>
        </div>
      )}

      {/* Add race pin drawer */}
      {showAddPin && (
        <div style={styles.overlay} onClick={() => setShowAddPin(false)}>
          <div style={{ ...styles.drawer, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>add a race</span>
              <button
                style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
                onClick={() => setShowAddPin(false)}
              >✕</button>
            </div>

            <div style={styles.formFields}>
              {/* Race name */}
              <div style={styles.field}>
                <label style={styles.label}>race name</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Ladakh HM"
                  value={form.raceName}
                  onChange={e => setForm(p => ({ ...p, raceName: e.target.value }))}
                />
              </div>

              {/* Distance */}
              <div style={styles.field}>
                <label style={styles.label}>distance</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DISTANCES.map(d => (
                    <button
                      key={d}
                      style={{
                        flex: 1, fontSize: 12, fontWeight: 500, padding: '7px 0',
                        borderRadius: 'var(--radius-md)',
                        border: '0.5px solid',
                        borderColor: form.raceDistance === d ? accent : 'var(--color-border)',
                        background: form.raceDistance === d ? accent : 'transparent',
                        color: form.raceDistance === d ? '#fff' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setForm(p => ({ ...p, raceDistance: d }))}
                    >{d}</button>
                  ))}
                </div>
              </div>

              {/* Race date */}
              <div style={styles.field}>
                <label style={styles.label}>race date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.raceDate}
                  onChange={e => setForm(p => ({ ...p, raceDate: e.target.value }))}
                />
              </div>

              {/* Target time */}
              <div style={styles.field}>
                <label style={styles.label}>
                  target time <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  style={styles.input}
                  placeholder="e.g. 2:15:00"
                  value={form.goalTime}
                  onChange={e => setForm(p => ({ ...p, goalTime: e.target.value }))}
                />
              </div>

              {/* Runs per week */}
              <div style={styles.field}>
                <label style={styles.label}>runs per week</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {RUNS_OPTIONS.map(n => (
                    <button
                      key={n}
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 500, padding: '7px 0',
                        borderRadius: 'var(--radius-md)',
                        border: '0.5px solid',
                        borderColor: form.runsPerWeek === n ? accent : 'var(--color-border)',
                        background: form.runsPerWeek === n ? accent : 'transparent',
                        color: form.runsPerWeek === n ? '#fff' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setForm(p => ({ ...p, runsPerWeek: n }))}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Gym days */}
              <div style={styles.field}>
                <label style={styles.label}>
                  gym days <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {GYM_DAY_OPTIONS.map(day => (
                    <button
                      key={day}
                      style={{
                        fontSize: 11, padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        border: '0.5px solid',
                        borderColor: form.gymDays.includes(day) ? '#3C3489' : 'var(--color-border)',
                        background: form.gymDays.includes(day) ? '#EEEDFE' : 'transparent',
                        color: form.gymDays.includes(day) ? '#3C3489' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleGymDay(day)}
                    >{day.slice(0, 3)}</button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={styles.field}>
                <label style={styles.label}>
                  notes for coach <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  style={{ ...styles.input, height: 80, resize: 'none', lineHeight: 1.5 }}
                  placeholder="e.g. I want 3 runs a week with gym on off days. My knee has been a bit sore."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <button
                style={{
                  width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 500,
                  borderRadius: 'var(--radius-md)', border: 'none',
                  background: adding ? 'var(--color-border)' : accent,
                  color: '#fff', cursor: adding ? 'not-allowed' : 'pointer',
                }}
                onClick={handleAddPin}
                disabled={adding}
              >
                {adding ? 'generating your plan...' : 'add race + generate plan'}
              </button>

              {adding && (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                  claude is building your calendar — this takes about 15 seconds
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  state: { padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 17, fontWeight: 500 },
  iconBtn: { fontSize: 12, padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '0.5px solid', background: 'transparent', cursor: 'pointer', transition: 'all 0.15s' },
  empty: { padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  legend: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 },
  legendItem: { fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)' },
  calendar: { display: 'flex', flexDirection: 'column', gap: 3 },
  calHeader: { display: 'flex', alignItems: 'center', marginBottom: 4 },
  weekCol: { width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  calRow: { display: 'flex', alignItems: 'center', padding: '4px 6px', gap: 3 },
  weekNum: { fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 },
  dayCell: { flex: 1, height: 36, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pinRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', margin: '4px 0' },
  pinBadge: { fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)', flexShrink: 0, fontWeight: 500 },
  pinLine: { flex: 1, height: '0.5px', background: 'var(--color-border)' },
  pinInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  pinName: { fontSize: 12, fontWeight: 500 },
  pinDate: { fontSize: 10, color: 'var(--color-text-tertiary)' },
  pinRemove: { background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '0 4px' },
  adjustNote: { fontSize: 11, color: 'var(--color-amber-text)', background: 'var(--color-amber-soft)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', margin: '2px 0 4px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'flex-end' },
  drawer: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: 20, width: '100%', maxHeight: '80vh', overflowY: 'auto' },
  resyncCard: { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 14, marginBottom: 14 },
  adjBadge: { display: 'inline-block', fontSize: 11, padding: '2px 10px', borderRadius: 'var(--radius-pill)', marginBottom: 8 },
  resyncAssessment: { fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-primary)', marginBottom: 4 },
  formFields: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' },
  input: { fontSize: 13, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', outline: 'none', width: '100%' },
};