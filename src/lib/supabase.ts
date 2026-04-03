import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Chunked SecureStore adapter — splits values > 2048 bytes across multiple keys
// Required because iOS Keychain (used by SecureStore) has a 2048 byte limit per entry
// Supabase sessions can be 3-4KB (JWT + refresh token + user metadata)
const CHUNK_SIZE = 1900; // stay safely under 2048
const CHUNK_COUNT_SUFFIX = '__chunks';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // Check if value was stored in chunks
    const chunkCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);
      const chunks: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    }
    // Fall back to single-key storage (for previously stored small values)
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      // Small enough — store as single key, clean up any old chunks
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX);
      await SecureStore.setItemAsync(key, value);
      return;
    }
    // Split into chunks
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    // Delete old single-key value if present
    await SecureStore.deleteItemAsync(key);
    // Write all chunks
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk))
    );
    await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(chunks.length));
  },

  removeItem: async (key: string): Promise<void> => {
    const chunkCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);
      await Promise.all([
        ...Array.from({ length: chunkCount }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}__chunk_${i}`)
        ),
        SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX),
      ]);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Only load URL polyfill on native (breaks web fetch internals)
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment');
}

const isWeb = Platform.OS === 'web';

// Singleton: prevent HMR from creating duplicate clients that deadlock via navigator.locks
const globalForSupabase = globalThis as unknown as { __supabase?: SupabaseClient };

export const supabase =
  globalForSupabase.__supabase ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      ...(isWeb ? {} : { storage: ExpoSecureStoreAdapter }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
      // Disable navigator.locks to prevent deadlock from HMR duplicate instances
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
    },
  });

globalForSupabase.__supabase = supabase;
