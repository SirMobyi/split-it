/**
 * Direct Supabase REST API wrapper.
 * Bypasses the Supabase JS client's auth middleware which can deadlock
 * due to navigator.locks contention during HMR / multiple instances.
 * Uses raw fetch() which always works.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const REST_URL = `${SUPABASE_URL}/rest/v1`;

function getStoredAccessToken(): string | null {
  try {
    // Supabase stores session under this key in localStorage
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.access_token) return parsed.access_token;
    }
    // Fallback: some Supabase versions use a different storage format
    const altKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token-code-verifier`;
    if (altKey) {
      // Check for session stored as a direct JSON object (v2 format)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const p = JSON.parse(val);
              if (p?.access_token) return p.access_token;
            } catch {}
          }
        }
      }
    }
  } catch {}
  return null;
}

function authHeaders(): Record<string, string> {
  const token = getStoredAccessToken() ?? SUPABASE_ANON_KEY;
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

/** SELECT from a table with filters */
export async function restSelect<T = any>(
  table: string,
  params: { select?: string; eq?: Record<string, string>; limit?: number; single?: boolean } = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const url = new URL(`${REST_URL}/${table}`);
    url.searchParams.set('select', params.select ?? '*');
    if (params.eq) {
      for (const [col, val] of Object.entries(params.eq)) {
        url.searchParams.set(col, `eq.${val}`);
      }
    }
    if (params.limit) url.searchParams.set('limit', String(params.limit));

    const headers = authHeaders();
    if (params.single) headers['Accept'] = 'application/vnd.pgrst.object+json';

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}

/** UPSERT (insert or update) into a table */
export async function restUpsert<T = any>(
  table: string,
  body: Record<string, any>,
  params: { onConflict?: string; select?: string; single?: boolean } = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const url = new URL(`${REST_URL}/${table}`);
    if (params.select) url.searchParams.set('select', params.select);

    const headers = authHeaders();
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    if (params.single) headers['Accept'] = 'application/vnd.pgrst.object+json';

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}

/** UPDATE rows in a table */
export async function restUpdate<T = any>(
  table: string,
  body: Record<string, any>,
  params: { eq?: Record<string, string>; select?: string; single?: boolean } = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const url = new URL(`${REST_URL}/${table}`);
    if (params.select) url.searchParams.set('select', params.select);
    if (params.eq) {
      for (const [col, val] of Object.entries(params.eq)) {
        url.searchParams.set(col, `eq.${val}`);
      }
    }

    const headers = authHeaders();
    headers['Prefer'] = 'return=representation';
    if (params.single) headers['Accept'] = 'application/vnd.pgrst.object+json';

    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: err };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}

/** INSERT into a table */
export async function restInsert<T = any>(
  table: string,
  body: Record<string, any>,
  params: { select?: string; single?: boolean } = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const url = new URL(`${REST_URL}/${table}`);
    if (params.select) url.searchParams.set('select', params.select);

    const headers = authHeaders();
    // Only request RETURNING when caller needs data back (select param).
    // Without it, PostgREST skips the SELECT policy check on the new row,
    // avoiding issues with STABLE/snapshot visibility.
    if (params.select) {
      headers['Prefer'] = 'return=representation';
    } else {
      headers['Prefer'] = 'return=minimal';
    }
    if (params.single) headers['Accept'] = 'application/vnd.pgrst.object+json';

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { data: null, error: err };
    }
    if (params.select) {
      const data = await res.json();
      return { data, error: null };
    }
    return { data: null, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
}
