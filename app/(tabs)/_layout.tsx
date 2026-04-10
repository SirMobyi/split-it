import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LayoutDashboard, Zap, CircleUser, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useColors, useIsDark } from '../../src/hooks/use-colors';
import { useUnreadCount } from '../../src/hooks/use-notifications';
import { useUIStore } from '../../src/stores/ui-store';
import { GRADIENTS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { impact } from '../../src/utils/haptics';

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Dashboard: LayoutDashboard,
  Activity: Zap,
  Profile: CircleUser,
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const colors = useColors();
  const color = focused ? colors.accent : colors.textTertiary;
  const IconComponent = TAB_ICONS[name];

  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.iconWrapper}>
        {IconComponent ? <IconComponent size={24} color={color} /> : null}
        {badge && badge > 0 ? (
          <LinearGradient
            colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </LinearGradient>
        ) : null}
      </View>
      {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />}
    </View>
  );
}

function FABButton() {
  const activeGroupId = useUIStore((s) => s.activeGroupId);

  const handlePress = () => {
    impact('medium');
    if (activeGroupId) {
      router.push(`/group/${activeGroupId}/add-expense`);
    } else {
      router.push('/group/create');
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.fabContainer}>
      <LinearGradient
        colors={[...GRADIENTS.primary] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fab}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </LinearGradient>
    </Pressable>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const isDark = useIsDark();
  const { data: unreadCount } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(24, 20, 48, 0.92)' : 'rgba(250, 250, 255, 0.92)',
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.15 : 0.06,
          shadowRadius: 12,
          elevation: 8,
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
        listeners={{
          tabPress: () => impact('light'),
        }}
      />
      <Tabs.Screen
        name="fab-placeholder"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Activity" focused={focused} badge={unreadCount} />
          ),
        }}
        listeners={{
          tabPress: () => impact('light'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
        }}
        listeners={{
          tabPress: () => impact('light'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    gap: 3,
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
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  fabContainer: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
