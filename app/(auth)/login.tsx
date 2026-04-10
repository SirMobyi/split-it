import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../src/components/ui';
import { GradientBackground } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY, GRADIENTS } from '../../src/constants/theme';

const authRedirectUrl = Platform.OS === 'web'
  ? window.location.origin
  : Linking.createURL('auth/callback');

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    <GradientBackground variant="ambient">
      <SafeAreaView style={styles.safe}>
        {/* Decorative blurred circle behind logo */}
        <View style={styles.decorCircleOuter}>
          <LinearGradient
            colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
            style={styles.decorCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        <Animated.View style={[styles.hero, logoStyle]}>
          <View style={styles.logoRow}>
            <Text style={[styles.logoLight, { color: colors.textPrimary }]}>Split</Text>
            <Text style={[styles.logoBold, { color: colors.accent }]}>It</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Split expenses effortlessly.{'\n'}Built for India.
          </Text>
        </Animated.View>

        <Animated.ScrollView
          style={formStyle}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              variant="outline"
              fullWidth
            />

            <Button
              title={mode === 'phone' ? 'Use email instead' : 'Use phone instead'}
              onPress={() => setMode(mode === 'phone' ? 'email' : 'phone')}
              variant="ghost"
              fullWidth
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  decorCircleOuter: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    opacity: 0.25,
  },
  decorCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  hero: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
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
  formContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
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
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  messageBox: {
    borderRadius: 12,
    padding: SPACING.lg,
  },
  messageText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
});
