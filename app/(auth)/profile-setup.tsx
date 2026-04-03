import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, Input } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { restSelect, restUpsert } from '../../src/lib/supabase-rest';
import { useAuthStore } from '../../src/stores/auth-store';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function ProfileSetupScreen() {
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      console.error('Profile setup: No session found');
      return;
    }

    setLoading(true);

    try {
      console.log('Step 1: Checking username...');
      const usernameLC = username.toLowerCase().trim();

      // Check if username is taken (use appropriate client per platform)
      const { data: existing } = Platform.OS === 'web'
        ? await restSelect('profiles', { select: 'id', eq: { username: usernameLC }, single: true })
        : await supabase.from('profiles').select('id').eq('username', usernameLC).maybeSingle();

      console.log('Step 1 done:', existing);

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

      console.log('Step 2: Saving profile...', profileData);

      // Use Supabase JS client on native (has auth token), REST on web
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

      console.log('Step 2 done:', data, dbError);

      if (dbError) {
        console.error('Profile save error:', dbError);
        setError(dbError.message);
      } else {
        console.log('Profile saved:', data);
        setProfile(data);
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('Profile setup exception:', e);
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          This is how your friends will see you in Split-It
        </Text>

        {session?.user?.email && (
          <Text style={styles.loggedInAs}>
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
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
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
          <Text style={styles.hint}>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  form: {
    gap: SPACING.lg,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: -8,
  },
  errorBox: {
    backgroundColor: COLORS.dangerDim,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  loggedInAs: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
});
