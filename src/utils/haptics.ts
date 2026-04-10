import { Platform } from 'react-native';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

let Haptics: typeof import('expo-haptics') | null = null;

// Lazy-load expo-haptics (no-op on web)
async function getHaptics() {
  if (Platform.OS === 'web') return null;
  if (!Haptics) {
    try {
      Haptics = await import('expo-haptics');
    } catch {
      return null;
    }
  }
  return Haptics;
}

const IMPACT_MAP = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
} as const;

export async function impact(style: ImpactStyle = 'light') {
  const h = await getHaptics();
  if (!h) return;
  await h.impactAsync(h.ImpactFeedbackStyle[IMPACT_MAP[style]]);
}

export async function notification(type: NotificationType = 'success') {
  const h = await getHaptics();
  if (!h) return;
  const map = { success: 'Success', warning: 'Warning', error: 'Error' } as const;
  await h.notificationAsync(h.NotificationFeedbackType[map[type]]);
}

export async function selection() {
  const h = await getHaptics();
  if (!h) return;
  await h.selectionAsync();
}
