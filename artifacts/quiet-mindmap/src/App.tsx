import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { MindmapPage } from './pages/MindmapPage';
import { LandingPage } from './pages/LandingPage';
import { AuthPanel } from './components/AuthPanel';
import { useUser } from './hooks/useAuth';
import { REQUIRE_SIGN_IN } from './config';

/**
 * Accounts run on Supabase. It replaced Clerk because it also provides the
 * database and the file storage, all reachable straight from the browser — so
 * this app needs no server of its own, which is what lets it live on a static
 * host. The old Clerk wiring (a hosted widget, a publishable key resolved from
 * the hostname, a proxy URL) is gone with it.
 *
 * Missing configuration is deliberately NOT fatal here: without it the app
 * still runs as a single local map. That path is what the demo falls back to,
 * so it must never be blocked by a missing key.
 */

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'hsl(228,35%,8%)',
      }}
    >
      {children}
    </div>
  );
}

function AuthRoute({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useUser();

  // Already signed in: nothing to do on this page.
  if (isLoaded && isSignedIn) return <Redirect to="/map" />;

  return (
    <AuthPageShell>
      <AuthPanel
        mode={mode}
        onDone={() => setLocation('/map')}
        onSwitch={(next) => setLocation(next === 'sign-up' ? '/sign-up' : '/sign-in')}
      />
    </AuthPageShell>
  );
}

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/map" />;
  return REQUIRE_SIGN_IN ? <LandingPage /> : <Redirect to="/map" />;
}

function MapRoute() {
  const { isSignedIn, isLoaded } = useUser();

  // With sign-in optional, anonymous visitors get the map immediately and
  // their entries live only in their own browser.
  if (!REQUIRE_SIGN_IN) return <MindmapPage />;

  if (!isLoaded) return null;
  return isSignedIn ? <MindmapPage /> : <Redirect to="/" />;
}

/** Reachable at /welcome even when the sign-in wall is off. */
function LandingRoute() {
  return <LandingPage />;
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/welcome" component={LandingRoute} />
        <Route path="/map" component={MapRoute} />
        <Route path="/sign-in" component={() => <AuthRoute mode="sign-in" />} />
        <Route path="/sign-up" component={() => <AuthRoute mode="sign-up" />} />
      </Switch>
    </WouterRouter>
  );
}
