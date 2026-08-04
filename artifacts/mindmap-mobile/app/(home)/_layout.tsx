import React, { useMemo } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { NodesProvider } from '@/lib/NodesContext';

const SPACE_BG = '#070a14';
const SPACE_FG = '#e2e8f0';

export default function HomeLayout() {
  const { isSignedIn, getToken } = useAuth();

  // Register the token getter during render (before children mount) so the
  // very first API call from NodesProvider already carries the bearer token.
  useMemo(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <NodesProvider>
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: SPACE_BG },
          headerTintColor: SPACE_FG,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: SPACE_BG },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="capture"
          options={{ presentation: 'modal', title: 'New entry' }}
        />
        <Stack.Screen name="entry/[id]" options={{ title: '' }} />
      </Stack>
    </NodesProvider>
  );
}
