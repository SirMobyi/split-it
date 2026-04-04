import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Copy, Pencil, MoreHorizontal, UserPlus } from 'lucide-react-native';
import { Screen, Button, Card, Avatar, Badge, Input, BottomSheet } from '../../../src/components/ui';
import { useGroup, useLeaveGroup, useUpdateGroup, useDeleteGroup } from '../../../src/hooks/use-groups';
import { useGroupBalances } from '../../../src/hooks/use-balances';
import { useAuthStore } from '../../../src/stores/auth-store';
import { exportGroupPDF } from '../../../src/utils/pdf-export';
import { useGroupExpenses } from '../../../src/hooks/use-expenses';
import { useGroupPayments } from '../../../src/hooks/use-payments';
import { SPACING, formatCurrency } from '../../../src/constants/theme';
import { useColors } from '../../../src/hooks/use-colors';
import { GroupIcon, GROUP_ICON_NAMES } from '../../../src/components/ui';

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

  const [showMore, setShowMore] = useState(false);
  const deleteGroupHook = useDeleteGroup();
  const isGroupSettled = !!balanceData && Array.isArray(balanceData.simplifiedDebts) && balanceData.simplifiedDebts.length === 0;

  const handleCopyCode = async () => {
    await Share.share({ message: group.invite_code });
  };

  const handleDeleteGroup = async () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroupHook.mutateAsync(groupId!);
              router.replace('/(tabs)');
            } catch (e: any) {
              setError(e.message);
            }
          },
        },
      ]
    );
  };

  const activeMembers = group.members?.filter((m) => m.status === 'ACTIVE') ?? [];

  return (
    <Screen scrollable>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/group/${groupId}`)}>
          <Text style={[styles.headerCloseText, { color: colors.accent }]}>Close</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{group.name}</Text>
        {isCreator ? (
          <TouchableOpacity onPress={openEditGroup} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Pencil size={20} color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerDim }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Invite Section -- Share is primary, code is secondary */}
      <Card style={{ gap: SPACING.lg, marginTop: SPACING.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UserPlus size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invite People</Text>
        </View>

        <Button title="Share Invite Link" onPress={handleShare} fullWidth />

        <View style={styles.codeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.codeLabel, { color: colors.textTertiary }]}>Invite code</Text>
            <Text style={[styles.code, { color: colors.textPrimary }]}>{group.invite_code}</Text>
          </View>
          <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Copy size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Inline QR -- always visible, small, tappable to enlarge */}
        <TouchableOpacity onPress={() => setShowQR(!showQR)} style={styles.qrRow} activeOpacity={0.7}>
          <View style={[styles.qrSmall, { backgroundColor: colors.background }]}>
            <QRCode value={inviteLink} size={showQR ? 180 : 60} backgroundColor="transparent" color={colors.textPrimary} />
          </View>
          {!showQR && (
            <Text style={{ fontSize: 13, color: colors.textTertiary, flex: 1 }}>Tap to enlarge QR code</Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Member List -- flat, no card wrapper */}
      <View style={{ marginTop: SPACING.xl }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
          Members ({activeMembers.length})
        </Text>

        {group.members?.map((member) => {
          const balance = balanceData?.balances.find((b) => b.userId === member.user_id);
          const isMe = member.user_id === userId;
          const isMemberCreator = member.user_id === group.created_by;

          return (
            <View key={member.id} style={[styles.memberRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <Avatar
                name={member.profile?.full_name ?? '?'}
                uri={member.profile?.avatar_url}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {member.profile?.full_name ?? 'Unknown'}
                  </Text>
                  {isMe && isMemberCreator && <Badge label="You · Admin" variant="info" size="sm" />}
                  {isMe && !isMemberCreator && <Badge label="You" variant="info" size="sm" />}
                  {!isMe && isMemberCreator && <Badge label="Admin" variant="success" size="sm" />}
                  {member.status === 'INACTIVE' && <Badge label="Left" variant="neutral" size="sm" />}
                </View>
                <Text style={[styles.memberUsername, { color: colors.textTertiary }]}>@{member.profile?.username}</Text>
              </View>
              {balance && (
                <View style={{ alignItems: 'flex-end' }}>
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
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Overflow actions -- Export, Leave, Delete tucked away */}
      <View style={{ marginTop: SPACING.xxl, gap: SPACING.sm, marginBottom: SPACING.xxl }}>
        <TouchableOpacity
          onPress={() => setShowMore(!showMore)}
          style={[styles.moreButton, { borderColor: colors.border }]}
        >
          <MoreHorizontal size={18} color={colors.textSecondary} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textSecondary }}>More Options</Text>
        </TouchableOpacity>

        {showMore && (
          <View style={{ gap: SPACING.sm }}>
            <Button title="Export as PDF" onPress={handleExport} variant="ghost" fullWidth />
            <Button title="Leave Group" onPress={handleLeave} variant="ghost" fullWidth />
            {isCreator && isGroupSettled && (
              <Button title="Delete Group" onPress={handleDeleteGroup} variant="danger" fullWidth />
            )}
          </View>
        )}
      </View>

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
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconCell,
                    { backgroundColor: colors.surface },
                    editIcon === icon && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => setEditIcon(icon)}
                >
                  <GroupIcon name={icon} size={24} color={editIcon === icon ? colors.accent : colors.textPrimary} />
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
  headerCloseText: {
    fontSize: 17,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  copyButton: {
    padding: SPACING.sm,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  qrSmall: {
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberUsername: {
    fontSize: 13,
    marginTop: 1,
  },
  memberBalance: {
    fontSize: 15,
    fontWeight: '600',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconLabel: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
