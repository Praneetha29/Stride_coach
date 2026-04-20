import { useState, useRef, useEffect } from 'react';
import { chatWithCoach } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function CoachChat({ run, initialMessage }) {
  const { coachMode } = useAuth();
  const [messages, setMessages] = useState([{ role: 'assistant', content: initialMessage }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fire = coachMode === 'fire';
  const accent = fire ? 'var(--color-accent)' : 'var(--color-cheer)';
  const accentSoft = fire ? 'var(--color-accent-soft)' : 'var(--color-cheer-soft)';
  const accentText = fire ? 'var(--color-accent-text)' : 'var(--color-cheer-text)';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
    try {
      const { reply } = await chatWithCoach(run.id, msg, history, coachMode);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: fire ? 'Server error. Rest day.' : 'Oops! Try again babe!' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>chat with coach</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: accentSoft, color: accentText }}>
          {fire ? 'tough love' : 'hype girl'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'user' ? { alignSelf: 'flex-end', maxWidth: '85%' } : {}}>
            <div style={m.role === 'user'
              ? { background: accent, color: '#fff', borderRadius: 'var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)', padding: '10px 12px', fontSize: 13, lineHeight: 1.6 }
              : { background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)', padding: '10px 12px', fontSize: 13, lineHeight: 1.6 }
            }>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)', padding: '10px 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>···</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          style={{ flex: 1, fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '0.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', outline: 'none' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="ask your coach..."
        />
        <button
          style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={send}
        >
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}