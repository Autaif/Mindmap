import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthActions } from '../hooks/useAuth';
import { glassSurface } from '../lib/glass';
import {
  RADIUS_SM, RADIUS_LG, BORDER_W, BORDER_W_EMPHASIS, BORDER_SUBTLE, SHADOW_FLOAT,
  ACCENT_BG, ACCENT_BORDER_STRONG, GLOW_ACCENT, DANGER_BG, DANGER_BORDER,
} from '../lib/tokens';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

/**
 * Email and password, in the app's own material rather than a hosted widget.
 * Deliberately plain: the demo needs two accounts to sign in reliably in a
 * meeting room, and magic links depend on an inbox arriving on time.
 */
export function AuthPanel({ mode, onDone, onSwitch }: {
  mode: 'sign-in' | 'sign-up';
  onDone: () => void;
  onSwitch: (next: 'sign-in' | 'sign-up') => void;
}) {
  const prefs = useMotionPrefs();
  const { signIn, signUp, busy } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (isSignUp) {
      // With email confirmation switched off the session starts immediately;
      // with it on, nothing happens until the link is followed. Say so rather
      // than leaving a blank screen either way.
      setNotice('Account created. If sign-in does not continue, check your email for a confirmation link.');
      return;
    }
    onDone();
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    color: 'hsl(220,20%,92%)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    ...glassSurface('inset', { radius: RADIUS_SM, blur: prefs.blurInset }),
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefs.panelSpring}
      style={{
        width: 'min(400px, calc(100vw - 32px))',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        ...glassSurface('panel', { radius: RADIUS_LG, shadow: SHADOW_FLOAT, blur: prefs.blurPanel }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, hsl(262,60%,65%), hsl(228,40%,25%))',
            boxShadow: GLOW_ACCENT,
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'hsl(220,20%,90%)', letterSpacing: '-0.01em' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'hsl(220,15%,55%)', fontWeight: 500 }}>
            {isSignUp ? 'Your map, private and synced' : 'Sign in to open your private map'}
          </p>
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          autoFocus
          style={field}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(220,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          minLength={6}
          style={field}
        />
      </label>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '9px 12px',
            borderRadius: RADIUS_SM,
            background: DANGER_BG,
            border: `${BORDER_W}px solid ${DANGER_BORDER}`,
            fontSize: 12.5,
            color: 'hsl(0,80%,74%)',
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}

      {notice && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'hsl(220,15%,62%)', fontWeight: 500, lineHeight: 1.5 }}>
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '11px',
          borderRadius: RADIUS_SM,
          border: `${BORDER_W_EMPHASIS}px solid ${ACCENT_BORDER_STRONG}`,
          background: busy ? ACCENT_BG : 'hsl(262,60%,55%)',
          color: busy ? 'hsl(262,65%,76%)' : 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: busy ? 'progress' : 'pointer',
          boxShadow: busy ? 'none' : GLOW_ACCENT,
          letterSpacing: '-0.01em',
        }}
      >
        {busy ? 'One moment…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setNotice(null);
          onSwitch(isSignUp ? 'sign-in' : 'sign-up');
        }}
        style={{
          padding: '8px',
          borderRadius: RADIUS_SM,
          border: `${BORDER_W}px solid ${BORDER_SUBTLE}`,
          background: 'transparent',
          color: 'hsl(220,15%,58%)',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isSignUp ? 'I already have an account' : 'Create an account instead'}
      </button>
    </motion.form>
  );
}
