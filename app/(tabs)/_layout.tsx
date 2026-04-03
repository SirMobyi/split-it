import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LayoutDashboard, Zap, CircleUser } from 'lucide-react-native';
import { useColors } from '../../src/hooks/use-colors';
import { useUnreadCount } from '../../src/hooks/use-notifications';

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Dashboard: LayoutDashboard,
  Activity: Zap,
  Profile: CircleUser,
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const colors = useColors();
  const IconComponent = TAB_ICONS[name];
  const color = focused ? colors.accent : colors.textTertiary;

  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.iconWrapper}>
        {IconComponent ? <IconComponent size={24} color={color} /> : null}
        {badge && badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, { color }]}>
        {name}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const { data: unreadCount } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface2,
          borderTopColor: colors.borderLight,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 84,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 6,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Activity" focused={focused} badge={unreadCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    gap: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
