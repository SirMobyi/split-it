import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import { Users, Trash2, ChevronRight, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

function FadeInItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
import {
  Screen, Card, Avatar, BalanceText, EmptyState, GroupIcon, AvatarStack,
  SkeletonBalanceCard, SkeletonCard, Button, Input, BottomSheet, AnimatedNumber,
} from '../../src/components/ui';
import { useJoinGroup, useDeleteGroup } from '../../src/hooks/use-groups';
import { useAuthStore } from '../../src/stores/auth-store';
import { useGroups } from '../../src/hooks/use-groups';
import { useAllGroupBalances } from '../../src/hooks/use-balances';
import { useColors, useShadows } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY, GRADIENTS, RADIUS, formatCurrency } from '../../src/constants/theme';
import { impact } from '../../src/utils/haptics';

function BalanceOverview() {
  const colors = useColors();
  const shadows = useShadows();
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

  return (
    <Card variant="glass" glow style={styles.overviewCard}>
      {/* Gradient accent line at top */}
      <LinearGradient
        colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />

      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>You are owed</Text>
          <AnimatedNumber
            value={totalOwed}
            style={{ color: colors.success, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%' }}
            prefix="₹"
          />
        </View>
        <View style={[styles.balanceDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.balanceItem}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>You owe</Text>
          <AnimatedNumber
            value={totalOwe}
            style={{ color: colors.danger, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%' }}
            prefix="₹"
          />
        </View>
      </View>

      <View style={[styles.netRow, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[
            styles.netDot,
            { backgroundColor: isPositive ? colors.success : isNegative ? colors.danger : colors.textTertiary },
          ]} />
          <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Balance</Text>
        </View>
        <BalanceText amount={netBalance} size="xl" />
      </View>
    </Card>
  );
}

function GroupCard({ group, onDelete, index }: { group: any; onDelete: (g: any) => void; index: number }) {
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

  const avatarItems = activeMembers.map((m: any) => ({
    name: m.profile?.full_name ?? '?',
    uri: m.profile?.avatar_url,
  }));

  return (
    <FadeInItem index={index}>
      <Card
        onPress={() => { impact('light'); router.push(`/group/${group.id}`); }}
      >
        <View style={styles.groupRow}>
          <View style={[styles.groupIconCircle, { backgroundColor: colors.accentDim }]}>
            <GroupIcon name={groupIcon} size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.groupName, { color: colors.textPrimary }]} numberOfLines={1}>
                {group.name}
              </Text>
              {isSettled && isGroupSettled && (
                <View style={[styles.settledBadge, { backgroundColor: colors.successDim }]}>
                  <Check size={12} color={colors.success} strokeWidth={3} />
                </View>
              )}
            </View>
            <AvatarStack items={avatarItems} max={3} size={22} />
          </View>
          {myBalance && Math.abs(myBalance.netBalance) > 0.01 && (
            <BalanceText amount={myBalance.netBalance} size="sm" />
          )}
          {isCreator && isGroupSettled ? (
            <Pressable
              onPress={() => { impact('medium'); onDelete(group); }}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={18} color={colors.danger} />
            </Pressable>
          ) : (
            <ChevronRight size={18} color={colors.textTertiary} />
          )}
        </View>
      </Card>
    </FadeInItem>
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

  const now = new Date();
  const dateString = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen scrollable refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.greetingBlock}>
        <Text style={[styles.largeTitle, { color: colors.textPrimary }]}>
          Hey, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </Text>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>{dateString}</Text>
      </View>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Groups</Text>
              {groups && groups.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.accentDim }]}>
                  <Text style={[styles.countBadgeText, { color: colors.accent }]}>{groups.length}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button title="Create" onPress={() => router.push('/group/create')} size="sm" variant="outline" />
              <Button title="Join" onPress={() => setShowJoin((s) => !s)} size="sm" variant="primary" />
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
              {groups.map((group, i) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={i}
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
            <Text style={[{ ...TYPOGRAPHY.bodyLg, fontWeight: '600' }, { color: colors.textPrimary }]}>
              Are you sure you want to delete "{groupToDelete?.name}"?
            </Text>
            <Text style={[{ ...TYPOGRAPHY.bodyMd }, { color: colors.textSecondary, lineHeight: 22 }]}>
              This action will deactivate the group for all members. This cannot be undone.
            </Text>
          </View>

          {errorMsg && (
            <View style={{ backgroundColor: colors.dangerDim, padding: 12, borderRadius: 8 }}>
              <Text style={{ color: colors.danger, ...TYPOGRAPHY.bodyMd, fontWeight: '600' }}>
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
  greetingBlock: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  largeTitle: {
    ...TYPOGRAPHY.displayLg,
  },
  dateText: {
    ...TYPOGRAPHY.bodyMd,
  },
  overviewCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.md,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    ...TYPOGRAPHY.labelMd,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  netDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  netLabel: {
    ...TYPOGRAPHY.labelMd,
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
    ...TYPOGRAPHY.h2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    flexShrink: 1,
  },
  settledBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
});
