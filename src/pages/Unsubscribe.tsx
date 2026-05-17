import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'submitting' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('loading');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      setMessage('Missing unsubscribe token.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.valid) {
          setEmail(data.email || '');
          setState('valid');
        } else if (data?.alreadyUnsubscribed) {
          setEmail(data.email || '');
          setState('already');
        } else {
          setState('invalid');
          setMessage(data?.error || 'This unsubscribe link is invalid or has expired.');
        }
      } catch {
        setState('invalid');
        setMessage('Could not verify unsubscribe link.');
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState('success');
      else {
        setState('error');
        setMessage((data as any)?.error || 'Unable to unsubscribe.');
      }
    } catch (e: any) {
      setState('error');
      setMessage(e?.message || 'Unable to unsubscribe.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'loading' && <p className="text-sm text-muted-foreground">Verifying...</p>}
          {state === 'valid' && (
            <>
              <p className="text-sm">Unsubscribe <strong>{email}</strong> from future emails?</p>
              <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}
          {state === 'submitting' && <p className="text-sm text-muted-foreground">Processing...</p>}
          {state === 'success' && (
            <p className="text-sm text-foreground">You have been unsubscribed. We won't email {email} anymore.</p>
          )}
          {state === 'already' && (
            <p className="text-sm text-muted-foreground">{email} is already unsubscribed.</p>
          )}
          {(state === 'invalid' || state === 'error') && (
            <p className="text-sm text-destructive">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
