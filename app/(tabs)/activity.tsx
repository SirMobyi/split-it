import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Sparkles, Pencil, Trash2, ClipboardList, Zap } from 'lucide-react-native';

function FadeInItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}
import { Screen, Card, Badge, EmptyState, Button, BottomSheet, SkeletonActivityRow, Avatar } from '../../src/components/ui';
import { useActivityFeed } from '../../src/hooks/use-notifications';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, TYPOGRAPHY, RADIUS, formatCurrency } from '../../src/constants/theme';
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
      title: 'Title', amount: 'Amount', description: 'Description',
      transaction_date: 'Date', split_type: 'Split type', status: 'Status', note: 'Note',
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
  const entityMap: Record<string, string> = { expense: 'expense', payment: 'payment', group: 'group' };
  const entity = entityMap[item.entity_type] || 'item';
  const who = item.modifier?.full_name ?? 'Someone';

  switch (item.action) {
    case 'CREATE': return `${who} added a ${entity}`;
    case 'UPDATE': return `${who} edited a ${entity}`;
    case 'DELETE': return `${who} deleted a ${entity}`;
    default: return `${who} modified a ${entity}`;
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

function ActivityRow({ item, index, onPress }: { item: ActivityItem; index: number; onPress: () => void }) {
  const colors = useColors();
  const changes = getAuditChanges(item.action, item.entity_type, item.previous_state, item.new_state);
  const badgeVariant = item.action === 'CREATE' ? 'success' : item.action === 'DELETE' ? 'danger' : 'warning';
  const iconColor = item.action === 'CREATE' ? colors.accent : item.action === 'DELETE' ? colors.danger : colors.warning;

  return (
    <FadeInItem index={index}>
      <Pressable
        onPress={onPress}
        style={[styles.notifRow, { backgroundColor: colors.surface2 }]}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.actorRow}>
            <Avatar
              name={item.modifier?.full_name ?? 'Someone'}
              uri={(item as any).modifier?.avatar_url ?? undefined}
              size={36}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{getActivityTitle(item)}</Text>
              <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{getActivitySubtitle(item)}</Text>
            </View>
          </View>

          {item.group?.name && item.entity_type !== 'group' && (
            <View style={[styles.groupPill, { backgroundColor: colors.accentDim }]}>
              <Text style={[styles.groupPillText, { color: colors.accent }]}>{item.group.name}</Text>
            </View>
          )}

          {item.action === 'UPDATE' && changes.length > 0 && (
            <View style={[styles.changePreview, { backgroundColor: colors.surface, borderLeftColor: colors.warning }]}>
              {changes.slice(0, 2).map((detail, i) => (
                <Text key={i} style={[styles.changePreviewText, { color: colors.warning }]}>{detail}</Text>
              ))}
              {changes.length > 2 && (
                <Text style={[styles.moreChanges, { color: colors.textTertiary }]}>+{changes.length - 2} more</Text>
              )}
            </View>
          )}

          <Text style={[styles.time, { color: colors.textTertiary }]}>
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
      </Pressable>
    </FadeInItem>
  );
}

export default function ActivityScreen() {
  const colors = useColors();
  const { data: activities, isLoading, isRefetching, refetch } = useActivityFeed();
  const [selectedItem, setSelectedItem] = React.useState<ActivityItem | null>(null);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
      </View>

      <FlatList
        data={activities ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginLeft: 56 }} />
        )}
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
        renderItem={({ item, index }) => (
          <ActivityRow
            item={item}
            index={index}
            onPress={() => setSelectedItem(item)}
          />
        )}
      />

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
                <Text style={[{ ...TYPOGRAPHY.bodyLg, fontWeight: '600' }, { color: colors.textPrimary }]}>
                  {getActivityTitle(selectedItem)}
                </Text>
                {selectedItem.group?.name && (
                  <Text style={[{ ...TYPOGRAPHY.caption }, { color: colors.textTertiary }]}>
                    in {selectedItem.group.name}
                  </Text>
                )}
              </View>
              <Badge
                label={selectedItem.action}
                variant={selectedItem.action === 'CREATE' ? 'success' : selectedItem.action === 'DELETE' ? 'danger' : 'warning'}
                size="md"
                icon={React.createElement(ACTION_ICONS[selectedItem.action] ?? ClipboardList, { size: 16, color: selectedItem.action === 'CREATE' ? colors.accent : selectedItem.action === 'DELETE' ? colors.danger : colors.warning })}
              />
            </View>

            <Text style={[{ ...TYPOGRAPHY.bodyMd }, { color: colors.textSecondary, lineHeight: 22 }]}>
              {getActivitySubtitle(selectedItem)}
            </Text>

            <Text style={[{ ...TYPOGRAPHY.caption }, { color: colors.textTertiary }]}>
              {format(new Date(selectedItem.created_at), "EEEE, dd MMMM yyyy 'at' hh:mm:ss a")}
            </Text>

            <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Changes</Text>
              {getAuditChanges(selectedItem.action, selectedItem.entity_type, selectedItem.previous_state, selectedItem.new_state).map((detail, i) => (
                <Text key={i} style={[styles.detailText, { color: colors.textSecondary }]}>{detail}</Text>
              ))}
              {getAuditChanges(selectedItem.action, selectedItem.entity_type, selectedItem.previous_state, selectedItem.new_state).length === 0 && (
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
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
    ...TYPOGRAPHY.displayMd,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  notifBody: {
    ...TYPOGRAPHY.bodyMd,
    lineHeight: 20,
  },
  groupPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  groupPillText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  changePreview: {
    marginTop: 4,
    paddingLeft: 10,
    paddingVertical: 6,
    paddingRight: 8,
    borderLeftWidth: 2,
    borderRadius: 6,
    gap: 2,
  },
  changePreviewText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  moreChanges: {
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
  },
  time: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  detailSection: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 6,
  },
  detailLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: 4,
  },
  detailText: {
    ...TYPOGRAPHY.bodyMd,
    lineHeight: 20,
  },
});
