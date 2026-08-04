import { ClerkProvider, SignIn, SignUp, Show } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { MindmapPage } from './pages/MindmapPage';
import { LandingPage } from './pages/LandingPage';
import { REQUIRE_SIGN_IN } from './config';

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits dev FAPI directly), auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(262, 60%, 58%)',
    colorForeground: 'hsl(220, 20%, 92%)',
    colorMutedForeground: 'hsl(220, 15%, 58%)',
    colorDanger: 'hsl(0, 70%, 60%)',
    colorBackground: 'hsl(228, 32%, 10%)',
    colorInput: 'hsl(228, 30%, 14%)',
    colorInputForeground: 'hsl(220, 20%, 92%)',
    colorNeutral: 'hsl(220, 20%, 85%)',
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'rounded-2xl w-[420px] max-w-full overflow-hidden border border-[hsl(228,25%,20%)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[hsl(220,20%,92%)]',
    headerSubtitle: 'text-[hsl(220,15%,58%)]',
    socialButtonsBlockButtonText: 'text-[hsl(220,20%,88%)]',
    formFieldLabel: 'text-[hsl(220,15%,70%)]',
    footerActionLink: 'text-[hsl(262,65%,72%)]',
    footerActionText: 'text-[hsl(220,15%,55%)]',
    dividerText: 'text-[hsl(220,15%,50%)]',
    identityPreviewEditButton: 'text-[hsl(262,65%,72%)]',
    formFieldSuccessText: 'text-[hsl(160,60%,55%)]',
    alertText: 'text-[hsl(220,20%,88%)]',
    logoBox: 'justify-center',
    logoImage: 'h-9',
    socialButtonsBlockButton: 'border border-[hsl(228,25%,22%)] bg-[hsl(228,30%,13%)]',
    formButtonPrimary: 'bg-[hsl(262,60%,52%)] hover:bg-[hsl(262,60%,58%)] text-white',
    formFieldInput: 'bg-[hsl(228,30%,14%)] border border-[hsl(228,25%,22%)]',
    footerAction: '',
    dividerLine: 'bg-[hsl(228,25%,20%)]',
    alert: 'border border-[hsl(228,25%,22%)]',
    otpCodeFieldInput: 'bg-[hsl(228,30%,14%)] border border-[hsl(228,25%,22%)] text-[hsl(220,20%,92%)]',
    formFieldRow: '',
    main: '',
  },
};

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

function SignInPage() {
  return (
    <AuthPageShell>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageShell>
  );
}

function SignUpPage() {
  return (
    <AuthPageShell>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPageShell>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/map" />
      </Show>
      <Show when="signed-out">{REQUIRE_SIGN_IN ? <LandingPage /> : <Redirect to="/map" />}</Show>
    </>
  );
}

function MapRoute() {
  // With sign-in optional, anonymous visitors get the map immediately and
  // their entries live only in their own browser.
  if (!REQUIRE_SIGN_IN) return <MindmapPage />;

  return (
    <>
      <Show when="signed-in">
        <MindmapPage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

/** Reachable at /welcome even when the sign-in wall is off. */
function LandingRoute() {
  return <LandingPage />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to open your private map',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Your map, private and synced across devices',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/welcome" component={LandingRoute} />
        <Route path="/map" component={MapRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
