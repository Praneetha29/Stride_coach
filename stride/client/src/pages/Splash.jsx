export default function Splash() {
  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        <div style={styles.logo}>
          stride<span style={{ color: 'var(--color-accent)' }}>.</span>
        </div>
        <p style={styles.tagline}>your AI running coach. real data, real talk — no fluff.</p>

        <div style={styles.features}>
          {[
            { title: 'weekly report cards', desc: 'narrative coach analysis every sunday' },
            { title: 'chat with your coach', desc: 'tough love or hype girl, you pick' },
            { title: 'race predictor', desc: 'updated every run from your real HR + pace' },
            { title: 'overtraining flags', desc: 'surfaced before you blow up your race' },
          ].map(f => (
            <div key={f.title} style={styles.feature}>
              <div style={styles.dot} />
              <p style={styles.featureText}>
                <strong style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{f.title}</strong>
                {' '}— {f.desc}
              </p>
            </div>
          ))}
        </div>

        <a href={`${import.meta.env.VITE_API_URL}/auth/strava`} style={styles.stravaBtn}>
         <StravaIcon />
        connect with strava
        </a>
        <p style={styles.fine}>we only read your activity data. we never post on your behalf.</p>
      </div>
    </div>
  );
}

function StravaIcon() {
  return (
    <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' },
  inner: { width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  logo: { fontSize: 32, fontWeight: 500, letterSpacing: '-1px', marginBottom: 10 },
  tagline: { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 36, maxWidth: 260 },
  features: { width: '100%', marginBottom: 36, textAlign: 'left' },
  feature: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', marginTop: 6, flexShrink: 0 },
  featureText: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  stravaBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#FC4C02', color: '#fff', fontSize: 14, fontWeight: 500, padding: '13px 0', borderRadius: 'var(--radius-md)', textDecoration: 'none', width: '100%', marginBottom: 12 },
  fine: { fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.5 },
};