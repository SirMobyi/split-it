import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Configure how notifications display when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and store the token in the user's profile.
 * Call this once after login / on app start.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const token = tokenData;

  // Store in profile
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

/**
 * Send push notifications to specific users via Expo's push service.
 * Called after creating an expense — only notifies involved members (not the creator).
 */
export async function sendExpenseNotifications({
  creatorName,
  expenseTitle,
  amount,
  involvedUserIds,
  creatorId,
}: {
  creatorName: string;
  expenseTitle: string;
  amount: string;
  involvedUserIds: string[];
  creatorId: string;
}) {
  // Filter out the creator — they don't need to be notified about their own expense
  const recipientIds = involvedUserIds.filter((id) => id !== creatorId);
  if (recipientIds.length === 0) return;

  // Fetch push tokens for recipients
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('push_token')
    .in('id', recipientIds)
    .not('push_token', 'is', null);

  if (error || !profiles) return;

  const tokens = profiles
    .map((p) => p.push_token)
    .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) return;

  // Send via Expo push API
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title: 'New Expense',
    body: `${creatorName} added "${expenseTitle}" (${amount})`,
    data: { type: 'expense' },
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error('Failed to send push notifications:', e);
  }
}
