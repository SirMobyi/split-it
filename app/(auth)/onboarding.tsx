import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions, NativeSyntheticEvent,
  NativeScrollEvent, Pressable, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, PieChart, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, TYPOGRAPHY, GRADIENTS, LIGHT_COLORS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { impact } from '../../src/utils/haptics';

const PAGES = [
  {
    Icon: Users,
    title: 'Split expenses,\nnot friendships',
    body: 'Track shared expenses with friends and roommates in one clean place.',
    gradient: ['#F3E8FF', '#E8DAEF', '#F6F3FF'] as const,
  },
  {
    Icon: PieChart,
    title: 'Fair shares,\nsimplified',
    body: 'Split equally, by percentage, or assign custom amounts — quick and reliable.',
    gradient: ['#EDE8FF', '#D5C8F0', '#F3F0FF'] as const,
  },
  {
    Icon: Zap,
    title: 'Settle up\ninstantly',
    body: 'Quick summaries and UPI payments make settling a breeze.',
    gradient: ['#E8E2F8', '#C4B5FD', '#FAFAFF'] as const,
  },
];

// Use LIGHT_COLORS directly — no global theme mutation.
const colors = LIGHT_COLORS;

async function markOnboardingSeen() {
  await AsyncStorage.setItem('hasSeenOnboarding', 'true');
}

function AnimatedIcon({ Icon, index }: { Icon: typeof Users; index: number }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance pop
    setTimeout(() => {
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 150, useNativeDriver: true }).start(() => {
        // Gentle idle animation per icon type
        if (index === 0) {
          // Pulse
          Animated.loop(
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
          ).start();
        } else if (index === 1) {
          // Slow rotate
          Animated.loop(
            Animated.sequence([
              Animated.timing(rotate, { toValue: 6, duration: 2000, useNativeDriver: true }),
              Animated.timing(rotate, { toValue: -6, duration: 2000, useNativeDriver: true }),
            ])
          ).start();
        } else {
          // Bounce
          Animated.loop(
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.1, duration: 600, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 0.95, duration: 400, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
            ])
          ).start();
        }
      });
    }, index * 100);
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateStr }] }}>
      <LinearGradient
        colors={[...GRADIENTS.lavender] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Icon size={40} color="#FFFFFF" strokeWidth={1.8} />
      </LinearGradient>
    </Animated.View>
  );
}

function DotIndicator({ active }: { active: boolean }) {
  const width = useRef(new Animated.Value(active ? 28 : 8)).current;
  const bgOpacity = useRef(new Animated.Value(active ? 1 : 0.3)).current;

  useEffect(() => {
    Animated.spring(width, { toValue: active ? 28 : 8, damping: 15, stiffness: 200, useNativeDriver: false }).start();
    Animated.timing(bgOpacity, { toValue: active ? 1 : 0.3, duration: 250, useNativeDriver: true }).start();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.indicator,
        { backgroundColor: colors.accent },
        { width, opacity: bgOpacity },
      ]}
    />
  );
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== currentPage) {
      setCurrentPage(page);
      impact('light');
    }
  };

  const isLastPage = currentPage === PAGES.length - 1;

  return (
    <LinearGradient
      colors={[...(PAGES[currentPage]?.gradient ?? PAGES[0].gradient)] as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          {!isLastPage ? (
            <Pressable onPress={async () => { await markOnboardingSeen(); router.replace('/(auth)/login'); }}>
              <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
            </Pressable>
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
              <AnimatedIcon Icon={page.Icon} index={i} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>{page.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{page.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {PAGES.map((_, i) => (
              <DotIndicator key={i} active={i === currentPage} />
            ))}
          </View>

          <View style={styles.ctaRow}>
            <Button
              title={isLastPage ? 'Get Started' : 'Next'}
              onPress={async () => {
                impact('medium');
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    alignItems: 'flex-end',
  },
  skipText: {
    ...TYPOGRAPHY.labelLg,
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    ...TYPOGRAPHY.displayMd,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  body: {
    ...TYPOGRAPHY.bodyLg,
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
    marginBottom: SPACING.lg,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  ctaRow: {
    width: '100%',
  },
});
