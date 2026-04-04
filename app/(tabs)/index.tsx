import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Users, Plus, CircleCheck } from 'lucide-react-native';
import { Screen, Card, Avatar, BalanceText, EmptyState, GroupIcon, SkeletonBalanceCard, SkeletonCard, Button, Input, BottomSheet, Badge } from '../../src/components/ui';
import { useJoinGroup } from '../../src/hooks/use-groups';
import { useAuthStore } from '../../src/stores/auth-store';
import { useGroups } from '../../src/hooks/use-groups';
import { useAllGroupBalances } from '../../src/hooks/use-balances';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, SHADOWS, formatCurrency } from '../../src/constants/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function BalanceOverview() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: groups } = useGroups();
  const groupIds = useMemo(() => (groups ?? []).map((g) => g.id), [groups]);
  const allBalances = useAllGroupBalances(groupIds);

  const { totalOwed, totalOwe } = useMemo(() => {
    let owed = 0;
    let owe = 0;

    for (const query of allBalances) {
      const balanceData = query.data;
      if (!balanceData) continue;
      const myBalance = balanceData.balances.find((b) => b.userId === userId);
      if (!myBalance) continue;

      if (myBalance.netBalance > 0.01) {
        owed += myBalance.netBalance;
      } else if (myBalance.netBalance < -0.01) {
        owe += Math.abs(myBalance.netBalance);
      }
    }

    return {
      totalOwed: Math.round(owed * 100) / 100,
      totalOwe: Math.round(owe * 100) / 100,
    };
  }, [allBalances, userId]);

  const netBalance = totalOwed - totalOwe;
  const isPositive = netBalance > 0.01;
  const isNegative = netBalance < -0.01;

  const heroLabel = isPositive
    ? 'You are owed'
    : isNegative
    ? 'You owe'
    : 'All settled up';

  return (
    <Card variant="elevated" style={styles.overviewCard}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>{heroLabel}</Text>
        <BalanceText amount={netBalance} size="xl" />
      </View>

      {(totalOwed > 0 || totalOwe > 0) && (
        <View style={[styles.balanceRow, { marginTop: SPACING.md }]}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>Owed to you</Text>
            <Text style={[styles.balanceSubValue, { color: colors.success }]}>
              {formatCurrency(totalOwed)}
            </Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>You owe</Text>
            <Text style={[styles.balanceSubValue, { color: totalOwe > 0 ? colors.danger : colors.textTertiary }]}>
              {formatCurrency(totalOwe)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

function GroupCard({ group }: { group: any }) {
  const colors = useColors();
  const userId = useAuthStore((s) => s.session?.user.id);
  const allBalances = useAllGroupBalances([group.id]);
  const balanceData = allBalances[0]?.data;
  const myBalance = balanceData?.balances.find((b: any) => b.userId === userId);
  const activeMembers = group.members?.filter((m: any) => m.status === 'ACTIVE') ?? [];
  const groupIcon = group.icon_url ?? 'Users';

  const isSettled = !myBalance || Math.abs(myBalance.netBalance) <= 0.01;

  return (
    <Card>
      <TouchableOpacity
        onPress={() => router.push(`/group/${group.id}`)}
        style={styles.groupRow}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.groupIconWrap, { backgroundColor: colors.surface3 }]}>
              <GroupIcon name={groupIcon} size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
              <View style={[styles.avatarRow, { marginTop: 6 }]}>
                {activeMembers.slice(0, 4).map((m: any) => (
                  <Avatar
                    key={m.user_id}
                    name={m.profile?.full_name ?? '?'}
                    uri={m.profile?.avatar_url}
                    size={24}
                  />
                ))}
                {activeMembers.length > 4 && (
                  <Text style={[styles.moreText, { color: colors.textTertiary }]}>+{activeMembers.length - 4}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          {isSettled ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CircleCheck size={14} color={colors.success} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.success }}>Settled</Text>
            </View>
          ) : (
            <BalanceText amount={myBalance!.netBalance} size="sm" />
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();
  const joinGroup = useJoinGroup();
  const [showJoin, setShowJoin] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');

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

  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;

  return (
    <Screen scrollable refreshing={isRefetching} onRefresh={refetch}>
      {/* Large Title */}
      <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>
        {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
      </Text>

      {isLoading ? (
        <View style={{ gap: SPACING.lg }}>
          <SkeletonBalanceCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : null}

      {!isLoading && <BalanceOverview />}

      {!isLoading && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Groups</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.headerTextButton]}
                onPress={() => setShowJoin((s) => !s)}
              >
                <Text style={[styles.headerTextButtonLabel, { color: colors.accent }]}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/group/create')}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {showJoin && (
            <Card style={{ marginBottom: SPACING.lg }}>
              <Text style={[styles.joinTitle, { color: colors.textSecondary }]}>Join with invite code</Text>
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="none"
                  />
                </View>
                <Button title="Join" onPress={handleJoin} loading={joinGroup.isPending} />
              </View>
            </Card>
          )}

          {!groups || groups.length === 0 ? (
            <EmptyState
              IconComponent={Users}
              title="No groups yet"
              description="Create a group to start splitting expenses with friends"
              actionLabel="Create Group"
              onAction={() => router.push('/group/create')}
            />
          ) : (
            <View style={{ gap: SPACING.md }}>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                />
              ))}
            </View>
          )}
        </View>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  overviewCard: {
    paddingVertical: SPACING.xl,
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  balanceSubValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceDivider: {
    width: 1,
    height: 28,
  },
  section: {
    marginTop: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerTextButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: -4,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 13,
    marginLeft: 6,
  },
  joinTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
});
