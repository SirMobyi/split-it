import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LayoutDashboard, Users, Zap, CircleUser } from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';
import { useUnreadCount } from '../../src/hooks/use-notifications';

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Dashboard: LayoutDashboard,
  Activity: Zap,
  Profile: CircleUser,
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const IconComponent = TAB_ICONS[name];
  const color = focused ? COLORS.accent : COLORS.textTertiary;

  return (
    <View style={{ alignItems: 'center', gap: 2, width: '100%', paddingHorizontal: 0 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {IconComponent ? <IconComponent size={22} color={color} /> : null}
        {badge && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 10, color, fontWeight: '600' }}>
        {name}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data: unreadCount } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 80,
          paddingTop: 8,
          paddingHorizontal: 0,
          justifyContent: 'space-around',
          alignItems: 'center',
          flexDirection: 'row',
        },
        tabBarItemStyle: {
          width: '33.3333%',
          marginHorizontal: 0,
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
      {/* groups path is handled outside of the bottom tabs (app/groups) */}
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
