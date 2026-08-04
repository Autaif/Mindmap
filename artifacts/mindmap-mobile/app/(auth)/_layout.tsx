import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';

const SPACE_BG = '#070a14';

export default function AuthLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SPACE_BG },
      }}
    />
  );
}
