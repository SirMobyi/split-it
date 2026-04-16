import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { GradientBackground } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY } from '../../src/constants/theme';

const authRedirectUrl = Platform.OS === 'web'
  ? window.location.origin
  : Linking.createURL('auth/callback');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const colors = useColors();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Entrance animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(logoTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, []);

  const logoStyle = { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] };
  const formStyle = { opacity: formOpacity, transform: [{ translateY: formTranslateY }] };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
      });
      if (authErr) { setError(authErr.message); return; }
      if (!data?.url) { setError('Failed to get Google login URL'); return; }

      if (Platform.OS === 'web') {
        window.location.href = data.url;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
      if (result.type !== 'success' || !result.url) return;

      const fragment = result.url.substring(result.url.indexOf('#') + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) setError(sessionErr.message);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="ambient">
      <SafeAreaView style={styles.safe}>
        {/* Hero */}
        <Animated.View style={[styles.hero, logoStyle]}>
          <View style={styles.logoRow}>
            <Text style={[styles.logoLight, { color: colors.textPrimary }]}>Split</Text>
            <Text style={[styles.logoBold, { color: colors.accent }]}>It</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Split expenses effortlessly.{'\n'}Built for India.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.cta, formStyle]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            loading={loading}
            fullWidth
          />

          <Text style={[styles.legal, { color: colors.textTertiary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoLight: {
    ...TYPOGRAPHY.displayLg,
    fontWeight: '400',
    letterSpacing: -1,
  },
  logoBold: {
    ...TYPOGRAPHY.displayLg,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    ...TYPOGRAPHY.bodyLg,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  cta: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  legal: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
