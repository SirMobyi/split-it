import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent,
  NativeScrollEvent, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, PieChart, Zap } from 'lucide-react-native';
import { useColors } from '../../src/hooks/use-colors';
import { SPACING } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';

async function markOnboardingSeen() {
  await AsyncStorage.setItem('hasSeenOnboarding', 'true');
}

const { width } = Dimensions.get('window');

const PAGES = [
  {
    Icon: Users,
    title: 'Split expenses,\nnot friendships',
    body: 'Track shared expenses with friends, roommates, and travel groups — all in one place.',
  },
  {
    Icon: PieChart,
    title: 'Everyone pays\ntheir fair share',
    body: 'Split equally, by percentage, or custom amounts. You decide what works best.',
  },
  {
    Icon: Zap,
    title: 'Settle up\nin seconds',
    body: 'See who owes what at a glance. Pay directly through UPI — no awkward reminders.',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const isLastPage = currentPage === PAGES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.skipRow}>
        {!isLastPage ? (
          <TouchableOpacity onPress={async () => {
            await markOnboardingSeen();
            router.replace('/(auth)/login');
          }}>
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
      >
        {PAGES.map((page, i) => (
          <View key={i} style={styles.page}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentDim }]}>
              <page.Icon size={48} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{page.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{page.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentPage ? colors.accent : colors.borderLight,
                  width: i === currentPage ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
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
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  skipText: {
    fontSize: 17,
    fontWeight: '500',
  },
  page: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    flex: 1,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.37,
    marginBottom: SPACING.lg,
    lineHeight: 42,
  },
  body: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    width: '100%',
  },
});
