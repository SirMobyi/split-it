import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions, NativeSyntheticEvent,
  NativeScrollEvent, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, PieChart, Zap } from 'lucide-react-native';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING, LIGHT_COLORS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { useThemeStore } from '../../src/stores/theme-store';

const PAGES = [
  {
    Icon: Users,
    title: 'Split expenses, not friendships',
    body: 'Track shared expenses with friends and roommates in one clean place.',
  },
  {
    Icon: PieChart,
    title: 'Fair shares, simplified',
    body: 'Split equally, by percentage, or assign custom amounts — quick and reliable.',
  },
  {
    Icon: Zap,
    title: 'Settle up instantly',
    body: 'Quick summaries and UPI payments make settling a breeze.',
  },
];

async function markOnboardingSeen() {
  await AsyncStorage.setItem('hasSeenOnboarding', 'true');
}

export default function OnboardingScreen() {
  const globalColors = useColors();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Force light theme for onboarding experience so the screens demonstrate the
  // requested light + lavender design. User can change theme later in settings.
  useEffect(() => {
    setTheme('light').catch(() => {});
  }, [setTheme]);

  // We prefer the explicit light palette for onboarding visuals.
  const colors = LIGHT_COLORS;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const isLastPage = currentPage === PAGES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.topRow}>
        {!isLastPage ? (
          <TouchableOpacity onPress={async () => { await markOnboardingSeen(); router.replace('/(auth)/login'); }}>
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {PAGES.map((page, i) => (
          <View key={i} style={[styles.page, { width }]}> 
            <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}> 
              <page.Icon size={40} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{page.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{page.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface2 }]}> 
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.indicator,
                {
                  backgroundColor: i === currentPage ? colors.accent : colors.borderLight,
                  width: i === currentPage ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.ctaRow}>
          <Button
            title={isLastPage ? 'Get Started' : 'Next'}
            onPress={async () => {
              if (isLastPage) {
                await markOnboardingSeen();
                router.replace('/(auth)/login');
              } else {
                scrollRef.current?.scrollTo({ x: (currentPage + 1) * width, animated: true });
              }
            }}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    flex: 1,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 44,
  },
  body: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  ctaRow: {
    width: '100%',
  },
});
