import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Users, Trash2 } from 'lucide-react-native';
import { Screen, Card, Avatar, BalanceText, EmptyState, GroupIcon, SkeletonBalanceCard, SkeletonCard, Button, Input, BottomSheet } from '../../src/components/ui';
import { useJoinGroup, useDeleteGroup } from '../../src/hooks/use-groups';
import { useAuthStore } from '../../src/stores/auth-store';
import { useGroups } from '../../src/hooks/use-groups';
import { useAllGroupBalances } from '../../src/hooks/use-balances';
import { COLORS, SPACING, formatCurrency } from '../../src/constants/theme';

function BalanceOverview() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: groups } = useGroups();
  const groupIds = useMemo(() => (groups ?? []).map((g) => g.id), [groups]);
  const allBalances = useAllGroupBalances(groupIds);

  // Aggregate balances across all groups
  const { totalOwed, totalOwe } = useMemo(() => {
    let owed = 0; // others owe you (positive)
    let owe = 0;  // you owe others (positive number representing your debt)

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
    <Card style={styles.overviewCard}>
      <Text style={styles.greeting}>
        Hey, {profile?.full_name?.split(' ')[0] ?? 'there'}
      </Text>

      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>You are owed</Text>
          <BalanceText amount={totalOwed} size="lg" showSign={false} />
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>You owe</Text>
          <BalanceText amount={-totalOwe} size="lg" showSign={false} />
        </View>
      </View>

      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Net Balance</Text>
        <BalanceText amount={totalOwed - totalOwe} size="md" />
      </View>
    </Card>
  );
}

function GroupCard({ group, onDelete }: { group: any; onDelete: (g: any) => void }) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const allBalances = useAllGroupBalances([group.id]);
  const balanceData = allBalances[0]?.data;
  const myBalance = balanceData?.balances.find((b: any) => b.userId === userId);
  const activeMembers = group.members?.filter((m: any) => m.status === 'ACTIVE') ?? [];
  const groupIcon = group.icon_url ?? 'Users';

  const isSettled = !myBalance || Math.abs(myBalance.netBalance) <= 0.01;
  const isCreator = group.created_by === userId;

  // Determine group-level settled status (no simplified debts)
  const isGroupSettled = !!balanceData && Array.isArray(balanceData.simplifiedDebts) && balanceData.simplifiedDebts.length === 0;

  return (
    <Card>
      <View style={styles.groupRow}>
        <TouchableOpacity 
          onPress={() => router.push(`/group/${group.id}`)} 
          style={{ flex: 1, gap: 6, opacity: isSettled ? 0.5 : 1 }} 
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <GroupIcon name={groupIcon} size={20} color={COLORS.textPrimary} />
            <Text style={styles.groupName}>{group.name}</Text>
          </View>
          <View style={styles.avatarRow}>
            {activeMembers.slice(0, 4).map((m: any) => (
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
              <Trash2 size={20} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>

      </View>
    </Card>
  );
}

export default function DashboardScreen() {
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();
  const joinGroup = useJoinGroup();
  const deleteGroupHook = useDeleteGroup();
  const [showJoin, setShowJoin] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  
  // Deletion state
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
      // Small delay or notification could go here
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete group. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const profile = useAuthStore((s) => s.profile);

  if (!profile) {
    return null;
  }

  return (
    <Screen scrollable refreshing={isRefetching} onRefresh={refetch}>
      {isLoading ? (
        <View style={{ gap: SPACING.lg, marginTop: SPACING.lg }}>
          <SkeletonBalanceCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : null}

      {!isLoading && <BalanceOverview />}

      {!isLoading && <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Groups</Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/group/create')}>
              <Text style={styles.actionButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowJoin((s) => !s)}>
              <Text style={styles.actionButtonText}>Join</Text>
            </TouchableOpacity>
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
      </View>}

      <BottomSheet
        visible={!!groupToDelete}
        onClose={() => !isDeleting && setGroupToDelete(null)}
        title="Delete Group"
        showDone={false}
      >
        <View style={{ gap: SPACING.lg, paddingVertical: SPACING.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
              Are you sure you want to delete "{groupToDelete?.name}"?
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
              This action will deactivate the group for all members. This cannot be undone.
            </Text>
          </View>

          {errorMsg && (
            <View style={{ backgroundColor: COLORS.danger + '20', padding: 12, borderRadius: 8 }}>
              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>
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
  overviewCard: {
    marginTop: SPACING.lg,
    gap: SPACING.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  netLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  addButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  joinTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
});
