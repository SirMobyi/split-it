import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { Screen, Button, Card } from '../../src/components/ui';
import { useJoinGroup } from '../../src/hooks/use-groups';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const joinGroup = useJoinGroup();
  const [groupInfo, setGroupInfo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    supabase
      .rpc('get_group_by_invite_code', { code })
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data || data.length === 0) {
          setError('Invalid or expired invite code');
        } else {
          setGroupInfo(data[0]);
        }
      });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    try {
      const group = await joinGroup.mutateAsync(code);
      router.replace(`/group/${group.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Looking up group...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={styles.errorTitle}>Invite not found</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <Button title="Go Home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <Card style={{ width: '100%', alignItems: 'center', gap: SPACING.lg }}>
          <Users size={48} color={COLORS.accent} />
          <Text style={styles.joinTitle}>Join Group</Text>
          <Text style={styles.groupName}>{groupInfo?.name}</Text>
          <View style={{ width: '100%', gap: SPACING.sm }}>
            <Button
              title="Join Group"
              onPress={handleJoin}
              loading={joinGroup.isPending}
              fullWidth
              size="lg"
            />
            <Button
              title="Cancel"
              onPress={() => router.push('/(tabs)')}
              variant="ghost"
              fullWidth
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  errorDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  joinTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
