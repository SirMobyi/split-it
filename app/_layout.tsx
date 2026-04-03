import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { supabase } from '../src/lib/supabase';
import { restSelect } from '../src/lib/supabase-rest';
import { useAuthStore } from '../src/stores/auth-store';
import { useColors } from '../src/hooks/use-colors';
import { registerForPushNotifications } from '../src/utils/push-notifications';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

// In-memory persister for TanStack Query cache (avoids AsyncStorage native module issues in Expo Go)
function createPersister(): Persister {
  let cache: string | undefined;
  return {
    persistClient: async (client: PersistedClient) => {
      cache = JSON.stringify(client);
    },
    restoreClient: async () => {
      return cache ? (JSON.parse(cache) as PersistedClient) : undefined;
    },
    removeClient: async () => {
      cache = undefined;
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,       // 1 min before considered stale
      gcTime: 1000 * 60 * 60 * 24, // 24h before garbage collected (offline support)
      retry: 2,
      networkMode: 'offlineFirst',  // serve from cache, then revalidate
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createPersister();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, isLoading, setSession, setProfile, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 1) Listen for auth state changes — ONLY update session, no DB queries here
  //    (DB queries inside onAuthStateChange can deadlock the Supabase JS client)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[authChange]', event, session?.user?.id ?? 'none');
        setSession(session);
        if (!session) {
          setProfile(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // 2) Fetch profile OUTSIDE the auth callback, triggered by session changes
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log('[loadProfile] fetching for', userId);

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (cancelled) return;
        try {
          const { data, error } = Platform.OS === 'web'
            ? await restSelect('profiles', { eq: { id: userId }, single: true })
            : await supabase.from('profiles').select('*').eq('id', userId).single();
          console.log(`[loadProfile] attempt ${attempt}: data=${data?.username ?? 'null'}, error=${error?.message ?? 'none'}`);
          if (data) {
            if (!cancelled) {
              setProfile(data);
              setLoading(false);
            }
            return;
          }
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        } catch (e: any) {
          console.error(`[loadProfile] attempt ${attempt} threw:`, e.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }

      // After 3 failed attempts — no profile found
      if (!cancelled) {
        console.log('[loadProfile] no profile found after 3 attempts');
        setProfile(null);
        setLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Register push notifications once authenticated
  useEffect(() => {
    if (session?.user && profile) {
      registerForPushNotifications(session.user.id).catch(() => {});
    }
  }, [session?.user?.id, profile?.id]);

  // Handle deep link auth redirects (magic link, OAuth)
  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      const fragmentIndex = url.indexOf('#');
      if (fragmentIndex === -1) return;

      const params = new URLSearchParams(url.substring(fragmentIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error('Deep link auth error:', error.message);
      }
    };

    // Cold start: app opened via URL
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    // Warm start: app already open, receives URL
    const sub = Linking.addEventListener('url', (e) => handleAuthUrl(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not logged in → go to login (unless already there)
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!profile) {
      // Logged in but no profile → go to profile setup (unless already there)
      if (!inAuthGroup) router.replace('/(auth)/profile-setup');
    } else if (inAuthGroup) {
      // Fully authenticated with profile but still on auth screen → go to tabs
      router.replace('/(tabs)');
    }
    // If authenticated + has profile + NOT on auth screen → stay where you are
    // (could be /group/[id], /expense/[id], etc.)
  }, [session, profile, isLoading, segments]);

  const themeColors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedStatusBar() {
  return <StatusBar style="dark" />;
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}>
      <ThemedStatusBar />
      <AuthGate>
        <Slot />
      </AuthGate>
    </PersistQueryClientProvider>
  );
}
