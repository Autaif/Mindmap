import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { StarField } from '../components/StarField';

export function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'hsl(228,35%,8%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StarField />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: 24, maxWidth: 480 }}
      >
        <div
          className="hub-pulse"
          style={{
            width: 84,
            height: 84,
            margin: '0 auto 26px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 38%, hsl(262,55%,40%), hsl(228,40%,18%))',
            border: '1.5px solid rgba(139,92,246,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="rgba(167,139,250,0.9)" />
            <circle cx="10" cy="3" r="1.5" fill="rgba(167,139,250,0.5)" />
            <circle cx="10" cy="17" r="1.5" fill="rgba(167,139,250,0.5)" />
            <circle cx="3" cy="10" r="1.5" fill="rgba(167,139,250,0.5)" />
            <circle cx="17" cy="10" r="1.5" fill="rgba(167,139,250,0.5)" />
          </svg>
        </div>

        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'hsl(220,20%,94%)',
          }}
        >
          AZM Mindmap
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, lineHeight: 1.7, color: 'hsl(220,15%,58%)' }}>
          A private orbit for the concerns, ideas, and tasks you can't put in a shared inbox.
          Sign in and your map follows you — phone, tablet, laptop — visible to no one else.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => setLocation('/sign-in')}
            style={{
              padding: '11px 26px',
              borderRadius: 10,
              border: 'none',
              background: 'hsl(262,60%,52%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(139,92,246,0.35)',
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => setLocation('/sign-up')}
            style={{
              padding: '11px 26px',
              borderRadius: 10,
              border: '1px solid hsl(228,25%,22%)',
              background: 'rgba(13,15,33,0.7)',
              color: 'hsl(220,15%,70%)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create account
          </button>
        </div>

        <p style={{ marginTop: 26, fontSize: 12, color: 'hsl(220,15%,42%)' }}>
          End-to-end private — only your account can see your entries. Works offline and syncs
          when you're back.
        </p>
      </motion.div>
    </div>
  );
}
