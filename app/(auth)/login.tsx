import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Button, Input } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING } from '../../src/constants/theme';

// Dismiss any lingering auth browser sessions on native (no-op on web/iOS)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const authRedirectUrl = Linking.createURL('auth/callback');

export default function LoginScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePhoneLogin = async () => {
    setError('');
    setMessage('');
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    const { error: authErr } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    setLoading(false);
    if (authErr) {
      setError(authErr.message);
    } else {
      router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        // Web: standard redirect-based OAuth
        const { error: authErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: authRedirectUrl },
        });
        if (authErr) setError(authErr.message);
      } else {
        // Native: get OAuth URL, open in-app browser, capture redirect
        const { data, error: authErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: authRedirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (authErr) {
          setError(authErr.message);
          return;
        }

        if (!data?.url) {
          setError('Failed to get Google login URL');
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          authRedirectUrl,
          { showInRecents: true },
        );

        if (result.type === 'success' && result.url) {
          const fragmentIndex = result.url.indexOf('#');
          if (fragmentIndex !== -1) {
            const params = new URLSearchParams(result.url.substring(fragmentIndex + 1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionError) setError(sessionError.message);
            } else {
              setError('Login failed — please try again');
            }
          } else {
            setError('Login failed — please try again');
          }
        }
        // User cancelled/dismissed → do nothing (no error shown)
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (authErr) {
      setError(authErr.message);
    } else {
      router.push({ pathname: '/(auth)/otp', params: { email } });
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>Split It</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Split expenses effortlessly.{'\n'}Built for India.
        </Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={[styles.messageBox, { backgroundColor: colors.dangerDim }]}>
            <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View style={[styles.messageBox, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.messageText, { color: colors.accent }]}>{message}</Text>
          </View>
        ) : null}

        {mode === 'phone' ? (
          <>
            <Input
              label="Phone Number"
              prefix="+91"
              placeholder="9876543210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Button
              title="Send OTP"
              onPress={handlePhoneLogin}
              loading={loading}
              fullWidth
            />
          </>
        ) : (
          <>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title="Send OTP"
              onPress={handleEmailLogin}
              loading={loading}
              fullWidth
            />
          </>
        )}

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.borderLight }]} />
          <Text style={[styles.orText, { color: colors.textTertiary }]}>or</Text>
          <View style={[styles.line, { backgroundColor: colors.borderLight }]} />
        </View>

        <Button
          title="Continue with Google"
          onPress={handleGoogleLogin}
          variant="secondary"
          fullWidth
          loading={loading}
        />

        <Button
          title={mode === 'phone' ? 'Use email instead' : 'Use phone instead'}
          onPress={() => setMode(mode === 'phone' ? 'email' : 'phone')}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 100,
    paddingBottom: 48,
    alignItems: 'center',
  },
  logo: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  form: {
    gap: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontSize: 15,
  },
  messageBox: {
    borderRadius: 12,
    padding: SPACING.lg,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
