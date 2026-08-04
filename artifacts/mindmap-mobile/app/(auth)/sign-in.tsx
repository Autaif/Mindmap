import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSignIn, useSSO } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { StarField } from '@/components/StarField';

// Preloads the browser on Android to reduce authentication load time.
export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

// Handle any pending authentication sessions.
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const navigateHome = useCallback(
    ({ session, decorateUrl }: any) => {
      if (session?.currentTask) return;
      const url = decorateUrl('/');
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        router.push(url as Href);
      }
    },
    [router],
  );

  const handleSubmit = async () => {
    setFormError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setFormError(error.message ?? 'Sign-in failed. Please try again.');
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: navigateHome });
    } else {
      setFormError('Additional verification is required for this account.');
    }
  };

  const handleGoogle = useCallback(async () => {
    setFormError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId, navigate: navigateHome });
      }
    } catch {
      setFormError('Google sign-in was interrupted. Please try again.');
    }
  }, [startSSOFlow, navigateHome]);

  const busy = fetchStatus === 'fetching';
  const fieldError =
    errors.fields.identifier?.message || errors.fields.password?.message || formError;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StarField />
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 40) + 48, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.orb, { backgroundColor: colors.primary }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>AZM Mindmap</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to see your synced map
          </Text>
        </View>

        <TextInput
          testID="sign-in-email"
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Email address"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.input,
              borderRadius: colors.radius,
            },
          ]}
        />
        <TextInput
          testID="sign-in-password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.input,
              borderRadius: colors.radius,
            },
          ]}
        />

        {fieldError ? (
          <Text style={[styles.error, { color: '#f87171' }]}>{fieldError}</Text>
        ) : null}

        <Pressable
          testID="sign-in-submit"
          onPress={handleSubmit}
          disabled={!emailAddress || !password || busy}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: !emailAddress || !password || busy ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.input }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.input }]} />
        </View>

        <Pressable
          testID="sign-in-google"
          onPress={handleGoogle}
          style={({ pressed }) => [
            styles.button,
            styles.googleButton,
            {
              borderColor: colors.input,
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="chrome" size={18} color={colors.foreground} />
          <Text style={[styles.buttonText, { color: colors.foreground }]}>
            Continue with Google
          </Text>
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/sign-up">
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
              Sign up
            </Text>
          </Link>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 14 },
  header: { alignItems: 'center', gap: 8, marginBottom: 18 },
  orb: { width: 44, height: 44, borderRadius: 22, opacity: 0.9, marginBottom: 6 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  googleButton: { borderWidth: 1 },
  buttonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
});
