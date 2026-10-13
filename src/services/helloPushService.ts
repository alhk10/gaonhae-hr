import { supabase } from '@/integrations/supabase/client';

// Same publishable VAPID key used for staff notifications.
const VAPID_PUBLIC_KEY = 'BBTNSFPKoWdq0Q_PVNwkTSKfMR0IFJHkVSYnW1oDPR8UVo9IVzJDBFJFMCYvuVg_n7r5c0qQ0WFHThvB1nZxQ8E';

export type HelloPushResult = 'enabled' | 'unsupported' | 'open-in-new-tab' | 'denied' | 'ios-home-screen';

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toKey = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const getSubscription = async (create: boolean): Promise<PushSubscription | null> => {
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing || !create) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) as BufferSource });
};

export const getHelloPushStatus = async (sessionId: string, studentId: string, branchId: string): Promise<boolean> => {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const sub = await getSubscription(false);
    if (!sub) return false;
    const { data } = await (supabase.rpc as any)('public_chat_push_status', {
      p_session_id: sessionId, p_student_id: studentId, p_branch_id: branchId, p_endpoint: sub.endpoint,
    });
    return !!data;
  } catch {
    return false;
  }
};

export const enableHelloPush = async (sessionId: string, studentId: string, branchId: string): Promise<HelloPushResult> => {
  if (window.top !== window.self) return 'open-in-new-tab';
  if (!isPushSupported()) return isIOS() && !isStandalone() ? 'ios-home-screen' : 'unsupported';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const sub = await getSubscription(true);
  if (!sub) return 'unsupported';
  const json = sub.toJSON();
  const { error } = await (supabase.rpc as any)('subscribe_public_chat_push', {
    p_session_id: sessionId, p_student_id: studentId, p_branch_id: branchId,
    p_endpoint: json.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return 'enabled';
};

export const disableHelloPush = async (sessionId: string, studentId: string, branchId: string) => {
  const sub = await getSubscription(false);
  if (!sub) return;
  // Keep the browser subscription: siblings on the same phone may still use it.
  const { error } = await (supabase.rpc as any)('unsubscribe_public_chat_push', {
    p_session_id: sessionId, p_student_id: studentId, p_branch_id: branchId, p_endpoint: sub.endpoint,
  });
  if (error) throw error;
};
