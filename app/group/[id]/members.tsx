import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Screen, Button, Card, Avatar, Badge, Input, BottomSheet } from '../../../src/components/ui';
import { useGroup, useLeaveGroup, useUpdateGroup } from '../../../src/hooks/use-groups';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useAuthStore } from '../../../src/stores/auth-store';
import { exportGroupPDF } from '../../../src/utils/pdf-export';
import { useGroupExpenses } from '../../../src/hooks/use-expenses';
import { useGroupPayments } from '../../../src/hooks/use-payments';
import { supabase } from '../../../src/lib/supabase';
import { SPACING, TYPOGRAPHY, RADIUS, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import { GroupIcon, GROUP_ICON_NAMES } from '../../../src/components/ui';
import { impact } from '../../../src/utils/haptics';

export default function MembersScreen() {
  const colors = useColors();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroup(groupId!);
  const { data: balanceData } = useGroupBalances(groupId!);
  const { data: expenses } = useGroupExpenses(groupId!);
  const { data: payments } = useGroupPayments(groupId!);
  const leaveGroup = useLeaveGroup();
  const updateGroup = useUpdateGroup();

  const [showQR, setShowQR] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editError, setEditError] = useState('');
  const [error, setError] = useState('');

  if (!group) return null;

  const inviteLink = `splitit://join/${group.invite_code}`;
  const isCreator = group.created_by === userId;
  const currentIcon = group.icon_url ?? 'Users';

  const handleShare = async () => {
    await Share.share({
      message: `Join my group "${group.name}" on Split-It!\n\nInvite code: ${group.invite_code}\n\nOr tap: ${inviteLink}`,
    });
  };

  const handleCopy = () => {
    impact('light');
    Share.share({ message: group.invite_code });
  };

  const handleLeave = () => {
    const myBalance = balanceData?.balances.find((b) => b.userId === userId);
    if (myBalance && Math.abs(myBalance.netBalance) > 0.01) {
      setError(`Your balance is ${formatCurrency(myBalance.netBalance)}. Settle all debts before leaving.`);
      return;
    }
    setError('');
    leaveGroup.mutateAsync(groupId!).then(() => {
      router.replace('/(tabs)/groups');
    }).catch((e: any) => setError(e.message));
  };

  const handleExport = async () => {
    try {
      const { data: auditLogs } = await supabase
        .from('audit_log')
        .select('*, modifier:profiles!modified_by(full_name)')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false })
        .limit(200);

      await exportGroupPDF({
        groupName: group.name,
        expenses: expenses ?? [],
        payments: (payments ?? []) as any,
        members: group.members?.filter((m) => m.status === 'ACTIVE') ?? [],
        auditLogs: (auditLogs as any) ?? [],
      });
    } catch (e: any) {
      setError('Failed to export PDF');
    }
  };

  const openEditGroup = () => {
    setEditName(group.name);
    setEditIcon(currentIcon);
    setEditError('');
    setShowEditGroup(true);
  };

  const handleSaveGroup = async () => {
    setEditError('');
    if (!editName.trim()) { setEditError('Group name is required'); return; }
    try {
      await updateGroup.mutateAsync({
        groupId: groupId!,
        name: editName.trim(),
        iconUrl: editIcon,
      });
      setShowEditGroup(false);
    } catch (e: any) {
      setEditError(e.message);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Button title="Close" onPress={() => router.push(`/group/${groupId}`)} variant="ghost" size="sm" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Group Info</Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Group Info Card */}
      <Card style={{ alignItems: 'center', gap: SPACING.md }}>
        <View style={[styles.groupIconCircle, { backgroundColor: colors.accentDim }]}>
          <GroupIcon name={currentIcon} size={32} color={colors.accent} />
        </View>
        <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
        {isCreator && (
          <Button title="Edit Group" onPress={openEditGroup} variant="outline" size="sm" />
        )}
      </Card>

      {/* Invite Section */}
      <Card style={{ gap: SPACING.lg, marginTop: SPACING.lg }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invite Friends</Text>

        <Pressable
          onPress={handleCopy}
          style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <Text style={[styles.codeBoxLabel, { color: colors.textTertiary }]}>INVITE CODE</Text>
          <Text style={[styles.codeText, { color: colors.accent }]}>{group.invite_code}</Text>
          <Text style={[styles.codeHint, { color: colors.textTertiary }]}>Tap to share code</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Share Link" onPress={handleShare} size="sm" fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={showQR ? 'Hide QR' : 'Show QR'} onPress={() => setShowQR(!showQR)} variant="outline" size="sm" fullWidth />
          </View>
        </View>

        {showQR && (
          <View style={styles.qrContainer}>
            <QRCode value={inviteLink} size={180} backgroundColor={colors.surface} color={colors.textPrimary} />
            <Text style={[styles.qrHint, { color: colors.textTertiary }]}>Scan to join the group</Text>
          </View>
        )}
      </Card>

      {/* Member List */}
      <Card style={{ marginTop: SPACING.lg }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Members ({group.members?.filter((m) => m.status === 'ACTIVE').length})
        </Text>

        <View style={{ marginTop: SPACING.sm }}>
          {group.members?.map((member) => {
            const balance = balanceData?.balances.find((b) => b.userId === member.user_id);
            const isMe = member.user_id === userId;

            return (
              <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                <Avatar
                  name={member.profile?.full_name ?? '?'}
                  uri={member.profile?.avatar_url}
                  size={40}
                  ring={isMe}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.memberName, { color: colors.textPrimary }]}
                  >
                    {member.profile?.full_name ?? 'Unknown'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    {isMe && <Badge label="You" variant="accent" size="sm" />}
                    {member.user_id === group.created_by && <Badge label="Creator" variant="success" size="sm" />}
                    {member.status === 'INACTIVE' && <Badge label="Inactive" variant="neutral" size="sm" />}
                    <Text style={[styles.memberUsername, { color: colors.textTertiary }]}>@{member.profile?.username}</Text>
                  </View>
                </View>
                {balance && (
                  <Text
                    style={[
                      styles.memberBalance,
                      {
                        color: balance.netBalance > 0.01
                          ? colors.success
                          : balance.netBalance < -0.01
                            ? colors.danger
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {balance.netBalance > 0.01
                      ? `+${formatCurrency(balance.netBalance)}`
                      : balance.netBalance < -0.01
                        ? `-${formatCurrency(Math.abs(balance.netBalance))}`
                        : 'Settled'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Actions */}
      <Card style={{ marginTop: SPACING.lg, gap: SPACING.md }}>
        <Button title="Export as PDF" onPress={handleExport} variant="outline" fullWidth />
        <Button title="Leave Group" onPress={handleLeave} variant="danger" fullWidth />
      </Card>

      {/* Edit Group Bottom Sheet */}
      <BottomSheet
        visible={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        title="Edit Group"
      >
        <View style={{ gap: SPACING.lg, paddingTop: 8 }}>
          {editError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{editError}</Text>
            </View>
          ) : null}

          <Input
            label="Group Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter group name"
          />

          <View style={{ gap: 6 }}>
            <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>Group Icon</Text>
            <View style={styles.iconGrid}>
              {GROUP_ICON_NAMES.map((icon) => (
                <Pressable
                  key={icon}
                  style={[
                    styles.iconCell,
                    { backgroundColor: colors.surface },
                    editIcon === icon && { backgroundColor: colors.accentDim, borderColor: colors.accent, borderWidth: 2 },
                  ]}
                  onPress={() => { impact('light'); setEditIcon(icon); }}
                >
                  <GroupIcon name={icon} size={24} color={editIcon === icon ? colors.accent : colors.textPrimary} />
                </Pressable>
              ))}
            </View>
          </View>

          <Button
            title="Save Changes"
            onPress={handleSaveGroup}
            loading={updateGroup.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
  },
  groupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    ...TYPOGRAPHY.h2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '700',
  },
  codeBox: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  codeBoxLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  codeHint: {
    ...TYPOGRAPHY.caption,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.lg,
  },
  qrHint: {
    ...TYPOGRAPHY.caption,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  memberUsername: {
    ...TYPOGRAPHY.caption,
  },
  memberBalance: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  iconLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
