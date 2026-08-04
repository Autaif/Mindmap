import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth, useSignUp, useSSO } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { StarField } from '@/components/StarField';
import { useWarmUpBrowser } from './sign-in';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(error.message ?? 'Sign-up failed. Please try again.');
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    setFormError(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: navigateHome });
    } else {
      setFormError('Verification incomplete — double-check the code and try again.');
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
      setFormError('Google sign-up was interrupted. Please try again.');
    }
  }, [startSSOFlow, navigateHome]);

  const busy = fetchStatus === 'fetching';

  if (signUp.status === 'complete' || isSignedIn) return null;

  const inputStyle = [
    styles.input,
    {
      color: colors.foreground,
      backgroundColor: colors.card,
      borderColor: colors.input,
      borderRadius: colors.radius,
    },
  ];

  const awaitingCode =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;

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
        {awaitingCode ? (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Check your email
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                We sent a verification code to {emailAddress}
              </Text>
            </View>
            <TextInput
              testID="sign-up-code"
              value={code}
              onChangeText={setCode}
              placeholder="Verification code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={inputStyle}
            />
            {(errors.fields.code?.message || formError) ? (
              <Text style={[styles.error, { color: '#f87171' }]}>
                {errors.fields.code?.message || formError}
              </Text>
            ) : null}
            <Pressable
              testID="sign-up-verify"
              onPress={handleVerify}
              disabled={!code || busy}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: !code || busy ? 0.4 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                {busy ? 'Verifying…' : 'Verify'}
              </Text>
            </Pressable>
            <Pressable onPress={() => signUp.verifications.sendEmailCode()}>
              <Text style={[styles.resend, { color: colors.mutedForeground }]}>
                I need a new code
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <View style={[styles.orb, { backgroundColor: colors.primary }]} />
              <Text style={[styles.title, { color: colors.foreground }]}>
                Create your account
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Your map syncs across all your devices
              </Text>
            </View>

            <TextInput
              testID="sign-up-email"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={inputStyle}
            />
            <TextInput
              testID="sign-up-password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoComplete="new-password"
              style={inputStyle}
            />
            {(errors.fields.emailAddress?.message ||
              errors.fields.password?.message ||
              formError) ? (
              <Text style={[styles.error, { color: '#f87171' }]}>
                {errors.fields.emailAddress?.message ||
                  errors.fields.password?.message ||
                  formError}
              </Text>
            ) : null}
            <Pressable
              testID="sign-up-submit"
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
                {busy ? 'Creating account…' : 'Sign up'}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.input }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.input }]} />
            </View>

            <Pressable
              testID="sign-up-google"
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
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/sign-in">
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                  Sign in
                </Text>
              </Link>
            </View>
          </>
        )}

        {/* Required for sign-up flows: Clerk's bot protection is enabled by default */}
        <View nativeID="clerk-captcha" />
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
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
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
  resend: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    paddingVertical: 8,
  },
});
