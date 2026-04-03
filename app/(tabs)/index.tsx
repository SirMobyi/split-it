import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Users, Trash2 } from 'lucide-react-native';
import { Screen, Card, Avatar, BalanceText, EmptyState, GroupIcon, SkeletonBalanceCard, SkeletonCard, Button, Input, BottomSheet } from '../../src/components/ui';
import { useJoinGroup, useDeleteGroup } from '../../src/hooks/use-groups';
import { useAuthStore } from '../../src/stores/auth-store';
import { useGroups } from '../../src/hooks/use-groups';
import { useAllGroupBalances } from '../../src/hooks/use-balances';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, SHADOWS, formatCurrency } from '../../src/constants/theme';

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

  return (
    <Card variant="elevated" style={styles.overviewCard}>
      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>You are owed</Text>
          <BalanceText amount={totalOwed} size="lg" showSign={false} />
        </View>
        <View style={styles.balanceItem}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>You owe</Text>
          <BalanceText amount={-totalOwe} size="lg" showSign={false} />
        </View>
      </View>

      <View style={[styles.netRow, { backgroundColor: colors.surface }]}>
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Balance</Text>
        <BalanceText amount={totalOwed - totalOwe} size="md" />
      </View>
    </Card>
  );
}

function GroupCard({ group, onDelete }: { group: any; onDelete: (g: any) => void }) {
  const colors = useColors();
  const userId = useAuthStore((s) => s.session?.user.id);
  const allBalances = useAllGroupBalances([group.id]);
  const balanceData = allBalances[0]?.data;
  const myBalance = balanceData?.balances.find((b: any) => b.userId === userId);
  const activeMembers = group.members?.filter((m: any) => m.status === 'ACTIVE') ?? [];
  const groupIcon = group.icon_url ?? 'Users';

  const isSettled = !myBalance || Math.abs(myBalance.netBalance) <= 0.01;
  const isCreator = group.created_by === userId;
  const isGroupSettled = !!balanceData && Array.isArray(balanceData.simplifiedDebts) && balanceData.simplifiedDebts.length === 0;

  return (
    <Card>
      <View style={styles.groupRow}>
        <TouchableOpacity
          onPress={() => router.push(`/group/${group.id}`)}
          style={{ flex: 1, gap: 8, opacity: isSettled ? 0.5 : 1 }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <GroupIcon name={groupIcon} size={20} color={colors.textPrimary} />
            <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
          </View>
          <View style={styles.avatarRow}>
            {activeMembers.slice(0, 4).map((m: any) => (
              <Avatar
                key={m.user_id}
                name={m.profile?.full_name ?? '?'}
                uri={m.profile?.avatar_url}
                size={28}
              />
            ))}
            {activeMembers.length > 4 && (
              <Text style={[styles.moreText, { color: colors.textTertiary }]}>+{activeMembers.length - 4}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {myBalance && Math.abs(myBalance.netBalance) > 0.01 && (
            <BalanceText amount={myBalance.netBalance} size="sm" />
          )}
          {isCreator && isGroupSettled && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete(group);
              }}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();
  const joinGroup = useJoinGroup();
  const deleteGroupHook = useDeleteGroup();
  const [showJoin, setShowJoin] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  const [groupToDelete, setGroupToDelete] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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

  const handlePerformDelete = async () => {
    if (!groupToDelete) return;
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await deleteGroupHook.mutateAsync(groupToDelete.id);
      setGroupToDelete(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete group. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;

  return (
    <Screen scrollable refreshing={isRefetching} onRefresh={refetch}>
      {/* Large Title */}
      <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>
        Hey, {profile?.full_name?.split(' ')[0] ?? 'there'}
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
                style={[styles.actionPill, { backgroundColor: colors.accentDim }]}
                onPress={() => router.push('/group/create')}
              >
                <Text style={[styles.actionPillText, { color: colors.accent }]}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: colors.accentDim }]}
                onPress={() => setShowJoin((s) => !s)}
              >
                <Text style={[styles.actionPillText, { color: colors.accent }]}>Join</Text>
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
                  onDelete={(g) => setGroupToDelete(g)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <BottomSheet
        visible={!!groupToDelete}
        onClose={() => !isDeleting && setGroupToDelete(null)}
        title="Delete Group"
        showDone={false}
      >
        <View style={{ gap: SPACING.lg, paddingVertical: SPACING.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>
              Are you sure you want to delete "{groupToDelete?.name}"?
            </Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22 }}>
              This action will deactivate the group for all members. This cannot be undone.
            </Text>
          </View>

          {errorMsg && (
            <View style={{ backgroundColor: colors.dangerDim, padding: 12, borderRadius: 8 }}>
              <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '600' }}>
                {errorMsg}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="secondary"
                fullWidth
                onPress={() => setGroupToDelete(null)}
                disabled={isDeleting}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={isDeleting ? "Deleting..." : "Delete Group"}
                variant="danger"
                fullWidth
                onPress={handlePerformDelete}
                loading={isDeleting}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
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
    gap: SPACING.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '600',
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
    gap: SPACING.sm,
  },
  actionPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  actionPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
});
