const ZONES = {
  easy:     { bg: 'var(--color-easy)',  text: 'var(--color-easy-text)',  label: 'easy HR' },
  moderate: { bg: 'var(--color-tempo)', text: 'var(--color-tempo-text)', label: 'mod HR' },
  tempo:    { bg: 'var(--color-tempo)', text: 'var(--color-tempo-text)', label: 'tempo HR' },
  hard:     { bg: 'var(--color-hard)',  text: 'var(--color-hard-text)',  label: 'hard HR' },
};

export default function HrPill({ zone }) {
  if (!zone || zone === 'unknown') return null;
  const s = ZONES[zone] || ZONES.moderate;
  return (
    <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: s.bg, color: s.text, marginLeft: 6 }}>
      {s.label}
    </span>
  );
}