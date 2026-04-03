import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Sparkles, Pencil, Trash2, ClipboardList, Zap } from 'lucide-react-native';
import { View as RNView } from 'react-native';
import { Screen, Card, Badge, EmptyState, Button, BottomSheet, SkeletonActivityRow, Avatar } from '../../src/components/ui';
import { useActivityFeed, useMarkNotificationRead, useMarkAllRead } from '../../src/hooks/use-notifications';
import { COLORS, SPACING, formatCurrency } from '../../src/constants/theme';
import { formatDistanceToNow, format } from 'date-fns';

const ACTION_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  CREATE: Sparkles,
  UPDATE: Pencil,
  DELETE: Trash2,
};

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  expense_id: string | null;
  payment_id: string | null;
  group_id: string;
  created_at: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  modifier?: { id?: string; full_name?: string; avatar_url?: string | null } | null;
  group?: { name: string } | null;
}


/** Extract human-readable change details from audit log entry */
function getAuditChanges(
  action: string,
  entityType: string,
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null
): string[] {
  if (action === 'CREATE' && next) {
    const details: string[] = [];
    if (next.title || next.name) details.push(`"${next.title || next.name}"`);
    if (next.amount) details.push(`Amount: ${formatCurrency(Number(next.amount))}`);
    if (entityType === 'payment' && next.note) details.push(`Note: ${next.note}`);
    return details;
  }

  if (action === 'DELETE' && prev) {
    const details: string[] = [];
    const nameOrTitle = prev.title || prev.name;
    if (nameOrTitle) details.push(`Deleted "${nameOrTitle}"`);
    if (prev.amount) details.push(`Was ${formatCurrency(Number(prev.amount))}`);
    return details;
  }

  if (action === 'UPDATE' && prev && next) {
    const changes: string[] = [];
    const fields: Record<string, string> = {
      title: 'Title',
      amount: 'Amount',
      description: 'Description',
      transaction_date: 'Date',
      split_type: 'Split type',
      status: 'Status',
      note: 'Note',
    };

    for (const [key, label] of Object.entries(fields)) {
      const oldVal = prev[key];
      const newVal = next[key];
      if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
        if (key === 'amount') {
          changes.push(`${label}: ${formatCurrency(Number(oldVal))} → ${formatCurrency(Number(newVal))}`);
        } else {
          changes.push(`${label}: "${oldVal ?? '(empty)'}" → "${newVal ?? '(empty)'}"`);
        }
      }
    }
    return changes;
  }

  return [];
}

function getActivityTitle(item: ActivityItem): string {
  const entityMap: Record<string, string> = {
    expense: 'expense',
    payment: 'payment',
    group: 'group',
  };
  const entity = entityMap[item.entity_type] || 'item';
  const who = item.modifier?.full_name ?? 'Someone';

  switch (item.action) {
    case 'CREATE':
      return `${who} added a ${entity.toLowerCase()}`;
    case 'UPDATE':
      return `${who} edited a ${entity.toLowerCase()}`;
    case 'DELETE':
      return `${who} deleted a ${entity.toLowerCase()}`;
    default:
      return `${who} modified a ${entity.toLowerCase()}`;
  }
}

function getActivitySubtitle(item: ActivityItem): string {
  const state = item.new_state ?? item.previous_state;
  if (!state) return '';

  const parts: string[] = [];
  const nameOrTitle = state.title || state.name;
  if (nameOrTitle) parts.push(String(nameOrTitle));
  if (state.amount) parts.push(formatCurrency(Number(state.amount)));
  return parts.join(' · ');
}

export default function ActivityScreen() {
  const { data: activities, isLoading, isRefetching, refetch } = useActivityFeed();
  const [selectedItem, setSelectedItem] = React.useState<ActivityItem | null>(null);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      <FlatList
        data={activities ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <>
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
            </>
          ) : (
            <EmptyState
              IconComponent={Zap}
              title="No activity yet"
              description="Add expenses or payments in your groups — all changes will appear here"
            />
          )
        }
        renderItem={({ item }) => {
          const changes = getAuditChanges(item.action, item.entity_type, item.previous_state, item.new_state);

          const badgeVariant = item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'danger' : 'warning';
          const iconColor = item.action === 'CREATE' ? COLORS.accent : item.action === 'DELETE' ? COLORS.danger : COLORS.warning;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedItem(item)}
              style={styles.notifRow}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.actorRow}>
                  <Avatar
                    name={item.modifier?.full_name ?? 'Someone'}
                    uri={(item as any).modifier?.avatar_url ?? undefined}
                    size={32}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{getActivityTitle(item)}</Text>
                    <Text style={styles.notifBody}>{getActivitySubtitle(item)}</Text>
                  </View>
                </View>

                {item.group?.name && item.entity_type !== 'group' && (
                  <Text style={styles.groupLabel}>in {item.group.name}</Text>
                )}

                {/* Show inline change summary for edits */}
                {item.action === 'UPDATE' && changes.length > 0 && (
                  <View style={styles.changePreview}>
                    {changes.slice(0, 2).map((detail, i) => (
                      <Text key={i} style={styles.changePreviewText}>{detail}</Text>
                    ))}
                    {changes.length > 2 && (
                      <Text style={styles.moreChanges}>+{changes.length - 2} more changes</Text>
                    )}
                  </View>
                )}

                <Text style={styles.time}>
                  {format(new Date(item.created_at), 'dd MMM, hh:mm a')}
                  {' · '}
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Text>
              </View>
              <Badge
                label={item.action}
                variant={badgeVariant}
                size="sm"
                icon={React.createElement(ACTION_ICONS[item.action] ?? ClipboardList, { size: 12, color: iconColor })}
              />
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Bottom Sheet */}
      <BottomSheet
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Activity Detail"
      >
        {selectedItem && (
          <View style={{ gap: SPACING.md, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar
                name={selectedItem.modifier?.full_name ?? 'Someone'}
                uri={(selectedItem as any).modifier?.avatar_url ?? undefined}
                size={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
                  {getActivityTitle(selectedItem)}
                </Text>
                {selectedItem.group?.name && (
                  <Text style={{ fontSize: 13, color: COLORS.textTertiary }}>
                    in {selectedItem.group.name}
                  </Text>
                )}
              </View>
              <Badge
                label={selectedItem.action}
                variant={selectedItem.action === 'CREATE' ? 'success' : selectedItem.action === 'DELETE' ? 'danger' : 'warning'}
                size="md"
                icon={React.createElement(ACTION_ICONS[selectedItem.action] ?? ClipboardList, { size: 16, color: selectedItem.action === 'CREATE' ? COLORS.accent : selectedItem.action === 'DELETE' ? COLORS.danger : COLORS.warning })}
              />
            </View>

            <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>
              {getActivitySubtitle(selectedItem)}
            </Text>

            <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>
              {format(new Date(selectedItem.created_at), "EEEE, dd MMMM yyyy 'at' hh:mm:ss a")}
            </Text>

            {/* Change details */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Changes</Text>
              {getAuditChanges(selectedItem.action, selectedItem.entity_type, selectedItem.previous_state, selectedItem.new_state).map((detail, i) => (
                <Text key={i} style={styles.detailText}>{detail}</Text>
              ))}
              {getAuditChanges(selectedItem.action, selectedItem.entity_type, selectedItem.previous_state, selectedItem.new_state).length === 0 && (
                <Text style={styles.detailText}>
                  {selectedItem.action === 'CREATE' ? 'New entry created' : 'No field changes recorded'}
                </Text>
              )}
            </View>
          </View>
        )}
      </BottomSheet>
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
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconWrap: {
    marginTop: 2,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notifBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  groupLabel: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
    marginTop: 1,
  },
  changePreview: {
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.warning,
    gap: 1,
  },
  changePreviewText: {
    fontSize: 12,
    color: COLORS.warning,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  moreChanges: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: SPACING.lg,
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
