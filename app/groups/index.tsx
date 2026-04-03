import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { Screen, Card, Button, Input, EmptyState, Avatar } from '../../src/components/ui';
import { useGroups, useJoinGroup } from '../../src/hooks/use-groups';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function GroupsScreen() {
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();
  const joinGroup = useJoinGroup();
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    try {
      await joinGroup.mutateAsync(inviteCode.trim());
      setShowJoin(false);
      setInviteCode('');
      Alert.alert('Joined!', 'You have joined the group');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <View style={styles.actions}>
          <Button
            title="Join"
            onPress={() => setShowJoin(!showJoin)}
            variant="secondary"
            size="sm"
          />
          <Button
            title="+ Create"
            onPress={() => router.push('/group/create')}
            size="sm"
          />
        </View>
      </View>

      {showJoin && (
        <Card style={{ marginBottom: SPACING.lg }}>
          <Text style={styles.joinTitle}>Join with invite code</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Enter invite code"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
              />
            </View>
            <Button
              title="Join"
              onPress={handleJoin}
              loading={joinGroup.isPending}
            />
          </View>
        </Card>
      )}

      <FlatList
        data={groups ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            IconComponent={Users}
            title="No groups yet"
            description="Create or join a group to start splitting"
            actionLabel="Create Group"
            onAction={() => router.push('/group/create')}
          />
        }
        renderItem={({ item }) => {
          const activeMembers = item.members?.filter((m) => m.status === 'ACTIVE') ?? [];
          return (
            <Card onPress={() => router.push(`/group/${item.id}`)}>
              <View style={styles.groupRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <View style={styles.avatarRow}>
                    {activeMembers.slice(0, 4).map((m) => (
                      <Avatar
                        key={m.user_id}
                        name={m.profile?.full_name ?? '?'}
                        uri={m.profile?.avatar_url}
                        size={24}
                      />
                    ))}
                    {activeMembers.length > 4 && (
                      <Text style={styles.moreText}>+{activeMembers.length - 4}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  joinTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: -4,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 6,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textTertiary,
  },
});
