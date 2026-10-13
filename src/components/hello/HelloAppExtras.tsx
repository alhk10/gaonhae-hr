import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Share, SquarePlus, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  disableHelloPush, enableHelloPush, getHelloPushStatus, isIOS, isStandalone, type HelloPushResult,
} from '@/services/helloPushService';

const PROMPT_KEY = 'hello_a2hs_last_prompt';
export const A2HS_INTERVAL_DAYS = 150;

/** True when the Home Screen prompt is due (never shown, or last shown ≥150 days ago). */
export const isHomeScreenPromptDue = (lastShown: number | null, now = Date.now()) =>
  lastShown === null || now - lastShown >= A2HS_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

let deferredPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
}

const resultMessage = (r: HelloPushResult) => {
  switch (r) {
    case 'enabled': return null;
    case 'open-in-new-tab': return 'Please open this page in its own browser tab to turn on notifications.';
    case 'denied': return 'Notifications are blocked. Please allow them in your browser settings.';
    case 'ios-home-screen': return 'On iPhone, add this page to your Home Screen first, then turn on notifications from there.';
    default: return 'Notifications are not supported on this browser.';
  }
};

interface Props { sessionId: string | null; studentId: string; branchId: string; studentName?: string }

export function useHelloPush({ sessionId, studentId, branchId }: Props) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    getHelloPushStatus(sessionId, studentId, branchId).then(setOn);
  }, [sessionId, studentId, branchId]);
  const enable = async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      const r = await enableHelloPush(sessionId, studentId, branchId);
      const msg = resultMessage(r);
      if (msg) toast.error(msg); else { setOn(true); toast.success('Notifications turned on'); }
    } catch { toast.error('Could not turn on notifications'); } finally { setBusy(false); }
  };
  const disable = async () => {
    if (!sessionId) return;
    setBusy(true);
    try { await disableHelloPush(sessionId, studentId, branchId); setOn(false); toast.success('Notifications turned off'); }
    catch { toast.error('Could not turn off notifications'); } finally { setBusy(false); }
  };
  return { on, busy, enable, disable };
}

export function HelloNotificationButton(props: Props) {
  const { on, busy, enable, disable } = useHelloPush(props);
  return (
    <Button onClick={on ? disable : enable} disabled={busy} variant="outline" className="w-full h-11 justify-between">
      <span className="flex items-center gap-1.5">
        {on ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {on ? 'Turn Off Notifications' : 'Turn On Notifications'}
      </span>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
    </Button>
  );
}

export function HelloHomeScreenPrompt({ suppressed, ...props }: Props & { suppressed: boolean }) {
  const [open, setOpen] = useState(false);
  const push = useHelloPush(props);
  const ios = isIOS();

  useEffect(() => {
    if (suppressed || open || isStandalone()) return;
    const raw = localStorage.getItem(PROMPT_KEY);
    if (isHomeScreenPromptDue(raw ? Number(raw) : null)) setOpen(true);
  }, [suppressed, open]);

  const close = () => { localStorage.setItem(PROMPT_KEY, String(Date.now())); setOpen(false); };
  const install = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => null); deferredPrompt = null; close(); }
    else toast.message('Use your browser menu and choose "Add to Home Screen" or "Install app".');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Add Gaonhae to your Home Screen</DialogTitle>
          <DialogDescription>Open fees, grading and invoices in one tap.</DialogDescription>
        </DialogHeader>
        {ios ? (
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li className="flex items-center gap-1">Tap <Share className="h-4 w-4 inline" /> Share at the bottom of Safari</li>
            <li className="flex items-center gap-1">Choose <SquarePlus className="h-4 w-4 inline" /> “Add to Home Screen”</li>
            <li>Open Gaonhae from your Home Screen to turn on notifications</li>
          </ol>
        ) : (
          <Button onClick={install} className="w-full">Add to Home Screen</Button>
        )}
        {!push.on && !(ios && !isStandalone()) && (
          <Button variant="outline" onClick={push.enable} disabled={push.busy} className="w-full">
            {push.busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
            Turn on notifications{props.studentName ? ` for ${props.studentName}` : ''}
          </Button>
        )}
        <Button variant="ghost" onClick={close} className="w-full">Not now</Button>
      </DialogContent>
    </Dialog>
  );
}
