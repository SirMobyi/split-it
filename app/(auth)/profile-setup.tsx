import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen, Button, Input, GradientBackground } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { restSelect, restUpsert } from '../../src/lib/supabase-rest';
import { useAuthStore } from '../../src/stores/auth-store';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY } from '../../src/constants/theme';

export default function ProfileSetupScreen() {
  const colors = useColors();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(formTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 100);
  }, []);

  const formStyle = { opacity: formOpacity, transform: [{ translateY: formTranslateY }] };

  const handleSave = async () => {
    setError('');

    if (!fullName.trim() || !username.trim()) {
      setError('Name and username are required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!session?.user?.id) {
      setError('No active session. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      const usernameLC = username.toLowerCase().trim();

      const { data: existing } = Platform.OS === 'web'
        ? await restSelect('profiles', { select: 'id', eq: { username: usernameLC }, single: true })
        : await supabase.from('profiles').select('id').eq('username', usernameLC).maybeSingle();

      if (existing && existing.id !== session.user.id) {
        setError('Username is already taken');
        return;
      }

      const profileData = {
        id: session.user.id,
        full_name: fullName.trim(),
        username: usernameLC,
        upi_vpa: upiVpa.trim() || null,
        phone_number: session.user.phone ?? null,
      };

      let data: any = null;
      let dbError: any = null;

      if (Platform.OS === 'web') {
        const result = await restUpsert('profiles', profileData, { select: '*', single: true });
        data = result.data;
        dbError = result.error;
      } else {
        const result = await supabase.from('profiles').upsert(profileData).select('*').single();
        data = result.data;
        dbError = result.error;
      }

      if (dbError) {
        setError(dbError.message);
      } else {
        setProfile(data);
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="ambient">
      <SafeAreaView style={{ flex: 1 }}>
        <Screen scrollable>
          <Animated.View style={[styles.container, formStyle]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Set up your profile</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              This is how your friends will see you in Split It
            </Text>

            {session?.user?.email && (
              <Text style={[styles.loggedInAs, { color: colors.textTertiary }]}>
                Logged in as: {session.user.email}
              </Text>
            )}

            <Button
              title="Sign out (use a different account)"
              onPress={async () => {
                await supabase.auth.signOut();
              }}
              variant="ghost"
              size="sm"
              fullWidth
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Input
                label="Full Name"
                placeholder="Rahul Sharma"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <Input
                label="Username"
                placeholder="rahul_sharma"
                value={username}
                onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
                autoCapitalize="none"
              />
              <Input
                label="UPI ID (optional)"
                placeholder="rahul@upi"
                value={upiVpa}
                onChangeText={setUpiVpa}
                autoCapitalize="none"
              />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                Your UPI ID is used to receive payments from friends. You can add it later.
              </Text>

              <Button
                title="Get Started"
                onPress={handleSave}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          </Animated.View>
        </Screen>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
  },
  title: {
    ...TYPOGRAPHY.displayMd,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyLg,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  form: {
    gap: SPACING.lg,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    marginTop: -8,
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  loggedInAs: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
});
