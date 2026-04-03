import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Screen, Button, Card, Avatar, Badge, Input, BottomSheet } from '../../../src/components/ui';
import { useGroup, useLeaveGroup, useUpdateGroup } from '../../../src/hooks/use-groups';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useAuthStore } from '../../../src/stores/auth-store';
import { exportGroupPDF } from '../../../src/utils/pdf-export';
import { useGroupExpenses } from '../../../src/hooks/use-expenses';
import { useGroupPayments } from '../../../src/hooks/use-payments';
import { COLORS, SPACING, formatCurrency } from '../../../src/constants/theme';
import { GroupIcon, GROUP_ICON_NAMES } from '../../../src/components/ui';

export default function MembersScreen() {
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
  const currentIcon = group.icon_url ?? 'Users'; // Default template icon

  const handleShare = async () => {
    await Share.share({
      message: `Join my group "${group.name}" on Split-It!\n\nInvite code: ${group.invite_code}\n\nOr tap: ${inviteLink}`,
    });
  };

  const handleLeave = () => {
    const myBalance = balanceData?.balances.find((b) => b.userId === userId);
    if (myBalance && Math.abs(myBalance.netBalance) > 0.01) {
      setError(`Your balance is ${formatCurrency(myBalance.netBalance)}. Settle all debts before leaving.`);
      return;
    }

    // Double confirm
    setError('');
    leaveGroup.mutateAsync(groupId!).then(() => {
      router.replace('/(tabs)/groups');
    }).catch((e: any) => setError(e.message));
  };

  const handleExport = async () => {
    try {
      await exportGroupPDF({
        groupName: group.name,
        expenses: expenses ?? [],
        payments: (payments ?? []) as any,
        members: group.members?.filter((m) => m.status === 'ACTIVE') ?? [],
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
        <Text style={styles.headerTitle}>Members</Text>
        <View style={{ width: 60 }} />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Group Info Card */}
      <Card style={{ alignItems: 'center', gap: SPACING.md }}>
        <GroupIcon name={currentIcon} size={40} color={COLORS.accent} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>{group.name}</Text>
        {isCreator && (
          <Button title="Edit Group" onPress={openEditGroup} variant="secondary" size="sm" />
        )}
      </Card>

      {/* Invite Section */}
      <Card style={{ gap: SPACING.md, marginTop: SPACING.lg }}>
        <Text style={styles.sectionTitle}>Invite Friends</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Invite Code</Text>
          <Text style={styles.code}>{group.invite_code}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <Button title="Share Link" onPress={handleShare} size="sm" />
          <Button title={showQR ? 'Hide QR' : 'Show QR'} onPress={() => setShowQR(!showQR)} variant="secondary" size="sm" />
        </View>

        {showQR && (
          <View style={styles.qrContainer}>
            <QRCode value={inviteLink} size={180} backgroundColor={COLORS.surface} color={COLORS.textPrimary} />
            <Text style={styles.qrHint}>Scan to join the group</Text>
          </View>
        )}
      </Card>

      {/* Member List */}
      <View style={{ marginTop: SPACING.xl }}>
        <Text style={styles.sectionTitle}>
          Members ({group.members?.filter((m) => m.status === 'ACTIVE').length})
        </Text>

        <View style={{ gap: 1, marginTop: SPACING.md }}>
          {group.members?.map((member) => {
            const balance = balanceData?.balances.find((b) => b.userId === member.user_id);
            const isMe = member.user_id === userId;

            return (
              <View key={member.id} style={styles.memberRow}>
                <Avatar
                  name={member.profile?.full_name ?? '?'}
                  uri={member.profile?.avatar_url}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.memberName}>
                      {member.profile?.full_name ?? 'Unknown'}
                    </Text>
                    {isMe && <Badge label="You" variant="info" size="sm" />}
                    {member.user_id === group.created_by && <Badge label="Creator" variant="success" size="sm" />}
                    {member.status === 'INACTIVE' && <Badge label="Inactive" variant="neutral" size="sm" />}
                  </View>
                  <Text style={styles.memberUsername}>@{member.profile?.username}</Text>
                </View>
                {balance && (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: balance.netBalance > 0.01
                        ? COLORS.accent
                        : balance.netBalance < -0.01
                          ? COLORS.danger
                          : COLORS.textTertiary,
                    }}
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
      </View>

      {/* Actions */}
      <View style={{ marginTop: SPACING.xxl, gap: SPACING.md }}>
        <Button title="Export as PDF" onPress={handleExport} variant="secondary" fullWidth />
        <Button title="Leave Group" onPress={handleLeave} variant="danger" fullWidth />
      </View>

      {/* Edit Group Bottom Sheet */}
      <BottomSheet
        visible={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        title="Edit Group"
      >
        <View style={{ gap: SPACING.lg, paddingTop: 8 }}>
          {editError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{editError}</Text>
            </View>
          ) : null}

          <Input
            label="Group Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter group name"
          />

          <View style={{ gap: 6 }}>
            <Text style={styles.iconLabel}>Group Icon</Text>
            <View style={styles.iconGrid}>
              {GROUP_ICON_NAMES.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconCell, editIcon === icon && styles.iconCellActive]}
                  onPress={() => setEditIcon(icon)}
                >
                  <GroupIcon name={icon} size={24} color={editIcon === icon ? COLORS.accent : COLORS.textPrimary} />
                </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  errorBox: {
    backgroundColor: COLORS.dangerDim,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 2,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.lg,
  },
  qrHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberUsername: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  iconLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
});
