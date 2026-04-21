import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getActivities } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function PaceTrendChart() {
  const { coachMode } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fire = coachMode === 'fire';
  const accent = fire ? '#D85A30' : '#D4537E';

  useEffect(() => {
    getActivities()
      .then(activities => {
        // Filter easy runs only (HR < 150)
        const easyRuns = activities
          .filter(a => a.avgHr && a.avgHr < 150 && a.distanceKm > 3)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-12); 

        const chartData = easyRuns.map(a => ({
          date: new Date(a.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          pace: paceToSeconds(a.pace),
          paceLabel: a.pace,
          hr: a.avgHr,
        }));

        setData(chartData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.state}>loading trends...</div>;
  if (data.length < 2) return (
    <div style={styles.state}>need more easy runs to show trends</div>
  );

  const minPace = Math.min(...data.map(d => d.pace)) - 10;
  const maxPace = Math.max(...data.map(d => d.pace)) + 10;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>easy pace trend</span>
        <span style={styles.sub}>last {data.length} easy runs (HR &lt; 150bpm)</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#a8a5a0' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minPace, maxPace]}
            tick={{ fontSize: 10, fill: '#a8a5a0' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={secondsToPace}
            reversed
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={styles.tooltip}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{secondsToPace(payload[0].value)}/km</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{payload[0].payload.hr}bpm avg</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{payload[0].payload.date}</div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="pace"
            stroke={accent}
            strokeWidth={2}
            dot={{ fill: accent, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {data.length >= 2 && (
        <div style={styles.insight}>
          {paceInsight(data, accent)}
        </div>
      )}
    </div>
  );
}

function paceToSeconds(pace) {
  if (!pace || pace === '--:--') return 0;
  const [m, s] = pace.split(':').map(Number);
  return m * 60 + s;
}

function secondsToPace(seconds) {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function paceInsight(data, accent) {
  const first = data[0].pace;
  const last = data[data.length - 1].pace;
  const diffSecs = first - last; 

  if (Math.abs(diffSecs) < 5) {
    return <span style={{ fontSize: 12, color: '#888' }}>pace holding steady at easy effort</span>;
  }

  const abs = Math.abs(Math.round(diffSecs));
  const direction = diffSecs > 0 ? 'faster' : 'slower';
  const color = diffSecs > 0 ? '#3B6D11' : '#993C1D';
  const bg = diffSecs > 0 ? '#EAF3DE' : '#FAECE7';

  return (
    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: bg, color }}>
      {abs}s/km {direction} at easy HR vs {data.length} runs ago
    </span>
  );
}

const styles = {
  wrap: {
    background: 'var(--color-surface)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 14,
    marginTop: 12,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontSize: 13, fontWeight: 500 },
  sub: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  state: { fontSize: 12, color: 'var(--color-text-tertiary)', padding: '16px 0', textAlign: 'center' },
  tooltip: { background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '8px 12px' },
  insight: { marginTop: 10, display: 'flex', justifyContent: 'center' },
};