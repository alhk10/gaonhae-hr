/** Refreshes /access data (react-query) automatically after any successful Supabase write. */
import type { QueryClient } from '@tanstack/react-query';

const WRITE_RPC = /(^|_)(set|save|upsert|update|delete|add|remove|mark|create|insert|verify|approve|reject|refund|match|unmatch|convert|move|toggle|resolve|submit|edit|record|apply|cancel|assign|issue|link|unlink|log)(_|$)/;
const READ_RPC = /^(get|list|search|check|_)|(_|^)(status|statuses|list|search|lookup|week|students|settings|dues)$/;

/** True when a request to Supabase changes data. */
export function isSupabaseWrite(url: string, method: string): boolean {
  const m = (method || 'GET').toUpperCase();
  const rpc = url.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/i);
  if (rpc) {
    const name = rpc[1].toLowerCase();
    if (/^get_|^list_|^search_/.test(name)) return false;
    return WRITE_RPC.test(name) && !(READ_RPC.test(name) && !/(^|_)(set|save|upsert|delete|mark|add|remove|update)(_|$)/.test(name));
  }
  if (/\/rest\/v1\//.test(url)) return m === 'POST' || m === 'PATCH' || m === 'DELETE' || m === 'PUT';
  if (/\/functions\/v1\//.test(url)) return m === 'POST';
  return false;
}

const SUPABASE_URL = 'https://qwdcbfnuywgubumlgscy.supabase.co';
let client: QueryClient | null = null;
/** Called from App once the QueryClient exists. */
export function setAccessAutoRefreshClient(qc: QueryClient) { client = qc; }

// Patch fetch at import time (main.tsx imports this first) so the Supabase client picks it up.
if (typeof window !== 'undefined' && !(window as any).__accessAutoRefresh) {
  (window as any).__accessAutoRefresh = true;
  const orig = window.fetch.bind(window);
  let timer: ReturnType<typeof setTimeout> | null = null;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await orig(input, init);
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      if (res.ok && client && url.startsWith(SUPABASE_URL) && window.location.pathname.startsWith('/access') && isSupabaseWrite(url, method)) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; client?.invalidateQueries(); }, 400);
      }
    } catch { /* never break requests */ }
    return res;
  };
}
