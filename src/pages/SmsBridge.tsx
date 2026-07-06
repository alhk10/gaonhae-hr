import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/useBranches';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/dateFormat';
import { Copy, Trash2, Send, Ban, MessageSquare, Download } from 'lucide-react';
import { ANDROID_APK_URL } from '@/config/constants';

import { QRCodeSVG } from 'qrcode.react';
import {
  listDevices, registerDevice, updateDevice, deleteDevice,
  listCampaigns, createCampaign, cancelCampaign,
  listThreads, listMessages, markThreadRead, sendQuickReply,
  fetchRecipients, personalize,
  type SmsDevice, type SmsCampaign, type SmsThread, type SmsMessage,
} from '@/services/smsService';

function segmentCount(text: string): number {
  const gsm = /^[\x00-\x7F]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (text.length === 0) return 0;
  if (text.length <= single) return 1;
  return Math.ceil(text.length / multi);
}

export default function SmsBridgePage() {
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">SMS Bridge</h1>
          <p className="text-sm text-muted-foreground">
            Compose scheduled SMS campaigns and view replies from your paired Android device.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <Button asChild>
            <a href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download APK
            </a>
          </Button>
          <span className="text-[11px] text-muted-foreground mt-1">
            Android 8+ · sideload on the phone that will send SMS.
          </span>
        </div>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>
        <TabsContent value="compose"><ComposeTab /></TabsContent>
        <TabsContent value="manual"><ManualSendTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="conversations"><ConversationsTab /></TabsContent>
        <TabsContent value="devices"><DevicesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Compose ---------- */
function ComposeTab() {
  const { branches } = useBranches();
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('active');
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [device, setDevice] = useState<SmsDevice | null>(null);

  useEffect(() => {
    listDevices().then((d) => setDevice(d[0] ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRecipients({ branchIds: branchIds.length ? branchIds : undefined, status })
      .then(setRecipients)
      .catch((e) => toast({ title: 'Recipient lookup failed', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [branchIds, status]);

  const uniquePhones = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipients) s.add(r.phone);
    return s.size;
  }, [recipients]);

  const delayMs = device?.send_delay_ms ?? 3000;
  const etaSeconds = Math.round((uniquePhones * delayMs) / 1000);
  const eta = etaSeconds < 60 ? `${etaSeconds}s` : `${Math.round(etaSeconds / 60)} min`;
  const segs = segmentCount(body);

  const submit = async () => {
    if (!name.trim() || !body.trim() || uniquePhones === 0) {
      toast({ title: 'Missing info', description: 'Name, body, and at least one recipient are required', variant: 'destructive' });
      return;
    }
    const when = scheduleNow ? new Date() : new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      toast({ title: 'Invalid schedule', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await createCampaign({
        name,
        body,
        scheduledAt: when,
        filters: { branchIds, status },
        recipients: recipients.map((r) => ({
          student_id: r.id,
          phone: r.phone,
          first_name: r.first_name,
        })),
      });
      toast({ title: 'Campaign queued', description: `${uniquePhones} recipients queued.` });
      setName('');
      setBody('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>New Campaign</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Campaign name (internal)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Term 1 grading reminder" />
        </div>

        <div>
          <Label>Message body</Label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {first_name}, this is a reminder..."
          />
          <div className="text-xs text-muted-foreground mt-1 flex justify-between">
            <span>Merge tag: <code>{'{first_name}'}</code></span>
            <span>{body.length} chars · {segs} SMS segment{segs === 1 ? '' : 's'}</span>
          </div>
          {body && (
            <div className="text-xs mt-1 p-2 bg-muted rounded">
              Preview: {personalize(body, recipients[0]?.first_name)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Branches</Label>
            <div className="border rounded p-2 max-h-40 overflow-auto space-y-1">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={branchIds.includes(b.id)}
                    onCheckedChange={(v) => {
                      setBranchIds((prev) =>
                        v ? [...prev, b.id] : prev.filter((x) => x !== b.id),
                      );
                    }}
                  />
                  {b.name}
                </label>
              ))}
              <div className="text-xs text-muted-foreground pt-1">
                {branchIds.length === 0 ? 'All branches' : `${branchIds.length} selected`}
              </div>
            </div>
          </div>
          <div>
            <Label>Student status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox checked={scheduleNow} onCheckedChange={(v) => setScheduleNow(!!v)} id="now" />
          <Label htmlFor="now">Send now</Label>
        </div>
        {!scheduleNow && (
          <div>
            <Label>Schedule at</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        )}

        <div className="rounded bg-muted p-3 text-sm space-y-1">
          <div>Recipients (unique phones): <strong>{loading ? '…' : uniquePhones}</strong></div>
          <div>Per-message delay: <strong>{delayMs} ms</strong> ({(delayMs / 1000).toFixed(1)}s){' '}
            {!device && <span className="text-destructive">(no device registered)</span>}
          </div>
          <div>Estimated completion: <strong>{eta}</strong></div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting || uniquePhones === 0}>
            <Send className="w-4 h-4 mr-2" />
            {scheduleNow ? 'Send Now' : 'Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Manual send ---------- */
function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-()]/g, '');
  if (!s) return null;
  if (/^\+\d{7,15}$/.test(s)) return s;
  if (/^\d{7,15}$/.test(s)) return s;
  return null;
}

function ManualSendTab() {
  const [name, setName] = useState('');
  const [phonesText, setPhonesText] = useState('');
  const [firstName, setFirstName] = useState('');
  const [body, setBody] = useState('');
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [device, setDevice] = useState<SmsDevice | null>(null);

  useEffect(() => {
    listDevices().then((d) => setDevice(d[0] ?? null)).catch(() => {});
  }, []);

  const parsed = useMemo(() => {
    const tokens = phonesText.split(/[\s,;]+/).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    for (const t of tokens) {
      const n = normalizePhone(t);
      if (n) {
        if (!seen.has(n)) { seen.add(n); valid.push(n); }
      } else {
        invalid.push(t);
      }
    }
    return { valid, invalid };
  }, [phonesText]);

  const delayMs = device?.send_delay_ms ?? 3000;
  const etaSeconds = Math.round((parsed.valid.length * delayMs) / 1000);
  const eta = etaSeconds < 60 ? `${etaSeconds}s` : `${Math.round(etaSeconds / 60)} min`;
  const segs = segmentCount(body);

  const submit = async () => {
    if (!body.trim() || parsed.valid.length === 0) {
      toast({ title: 'Missing info', description: 'At least one valid number and a message body are required', variant: 'destructive' });
      return;
    }
    const when = scheduleNow ? new Date() : new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      toast({ title: 'Invalid schedule', variant: 'destructive' });
      return;
    }
    const campaignName = name.trim() || `Manual send — ${formatDateTime(when.toISOString())}`;
    setSubmitting(true);
    try {
      await createCampaign({
        name: campaignName,
        body,
        scheduledAt: when,
        filters: { manual: true },
        recipients: parsed.valid.map((phone) => ({
          student_id: null,
          phone,
          first_name: firstName.trim() || undefined,
        })),
      });
      toast({ title: 'Queued', description: `${parsed.valid.length} recipients queued.` });
      setName('');
      setPhonesText('');
      setFirstName('');
      setBody('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Send to manual numbers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Campaign name (optional)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto: Manual send — date/time" />
        </div>

        <div>
          <Label>Phone numbers</Label>
          <Textarea
            rows={4}
            value={phonesText}
            onChange={(e) => setPhonesText(e.target.value)}
            placeholder={'One per line or comma-separated\n+6591234567\n91234568'}
          />
          <div className="text-xs mt-1 flex flex-wrap gap-x-4">
            <span className="text-muted-foreground">
              Valid: <strong className="text-foreground">{parsed.valid.length}</strong>
            </span>
            {parsed.invalid.length > 0 && (
              <span className="text-destructive">
                Invalid ({parsed.invalid.length}): {parsed.invalid.slice(0, 5).join(', ')}
                {parsed.invalid.length > 5 ? '…' : ''}
              </span>
            )}
          </div>
        </div>

        <div>
          <Label>Recipient name (optional, used for {'{first_name}'})</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. John" />
        </div>

        <div>
          <Label>Message body</Label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {first_name}, ..."
          />
          <div className="text-xs text-muted-foreground mt-1 flex justify-between">
            <span>Merge tag: <code>{'{first_name}'}</code></span>
            <span>{body.length} chars · {segs} SMS segment{segs === 1 ? '' : 's'}</span>
          </div>
          {body && (
            <div className="text-xs mt-1 p-2 bg-muted rounded">
              Preview: {personalize(body, firstName.trim() || undefined)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox checked={scheduleNow} onCheckedChange={(v) => setScheduleNow(!!v)} id="manual-now" />
          <Label htmlFor="manual-now">Send now</Label>
        </div>
        {!scheduleNow && (
          <div>
            <Label>Schedule at</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        )}

        <div className="rounded bg-muted p-3 text-sm space-y-1">
          <div>Recipients: <strong>{parsed.valid.length}</strong></div>
          <div>Per-message delay: <strong>{delayMs} ms</strong> ({(delayMs / 1000).toFixed(1)}s){' '}
            {!device && <span className="text-destructive">(no device registered)</span>}
          </div>
          <div>Estimated completion: <strong>{eta}</strong></div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting || parsed.valid.length === 0 || !body.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {scheduleNow ? 'Send Now' : 'Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Campaigns ---------- */
function CampaignsTab() {
  const [rows, setRows] = useState<SmsCampaign[]>([]);
  const load = () => listCampaigns().then(setRows).catch(() => {});
  useEffect(() => {
    load();
    const ch = supabase
      .channel('sms_campaigns_ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_campaigns' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cancel = async (id: string) => {
    if (!confirm('Cancel all queued messages in this campaign?')) return;
    await cancelCampaign(id);
    toast({ title: 'Cancelled' });
    load();
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Sent / Total</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{formatDateTime(r.scheduled_at)}</TableCell>
                <TableCell>{r.sent_count} / {r.total_count}</TableCell>
                <TableCell>{r.failed_count}</TableCell>
                <TableCell>
                  {(r.status === 'scheduled' || r.status === 'sending') && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>
                      <Ban className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No campaigns yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- Conversations ---------- */
function ConversationsTab() {
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [selected, setSelected] = useState<SmsThread | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [reply, setReply] = useState('');

  const loadThreads = () => listThreads().then(setThreads).catch(() => {});
  useEffect(() => {
    loadThreads();
    const ch = supabase
      .channel('sms_threads_ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_threads' }, loadThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_messages' }, () => {
        if (selected) listMessages(selected.id).then(setMessages).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    listMessages(selected.id).then(setMessages).catch(() => {});
    if (selected.unread_count > 0) markThreadRead(selected.id).then(loadThreads);
  }, [selected]);

  const send = async () => {
    if (!selected || !reply.trim()) return;
    try {
      await sendQuickReply(selected.phone, reply.trim());
      setReply('');
      toast({ title: 'Queued', description: 'Reply will be sent by the device on next poll.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <Card className="md:col-span-1">
        <CardHeader><CardTitle className="text-base">Threads</CardTitle></CardHeader>
        <CardContent className="p-0 max-h-[70vh] overflow-auto">
          {threads.length === 0 && <div className="p-4 text-sm text-muted-foreground">No conversations</div>}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`w-full text-left p-3 border-b hover:bg-muted ${selected?.id === t.id ? 'bg-muted' : ''}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{t.phone}</span>
                {t.unread_count > 0 && <Badge>{t.unread_count}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{t.last_snippet}</div>
              <div className="text-[10px] text-muted-foreground">{formatDateTime(t.last_message_at)}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {selected ? selected.phone : 'Select a thread'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 min-h-[50vh]">
          <div className="flex-1 max-h-[55vh] overflow-auto space-y-2 border rounded p-2 bg-muted/30">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  m.direction === 'out' ? 'bg-primary text-primary-foreground' : 'bg-background border'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[10px] opacity-70 mt-1">{formatDateTime(m.sent_at)}{m.status ? ` · ${m.status}` : ''}</div>
                </div>
              </div>
            ))}
            {selected && messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No messages yet</div>
            )}
          </div>
          {selected && (
            <div className="flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply…"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <Button onClick={send} disabled={!reply.trim()}><Send className="w-4 h-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Devices ---------- */
function DevicesTab() {
  const [devices, setDevices] = useState<SmsDevice[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [delay, setDelay] = useState(3000);
  const [issued, setIssued] = useState<string | null>(null);

  const load = () => listDevices().then(setDevices).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim()) return;
    try {
      const { token } = await registerDevice(label.trim(), delay);
      setIssued(token);
      setLabel('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Devices</CardTitle>
        <Button size="sm" onClick={() => { setShowAdd(true); setIssued(null); }}>Register device</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Delay (ms)</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.label}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="h-8 w-24"
                    defaultValue={d.send_delay_ms}
                    onBlur={async (e) => {
                      const v = Number(e.target.value);
                      if (v !== d.send_delay_ms && v >= 0) {
                        await updateDevice(d.id, { send_delay_ms: v });
                        toast({ title: 'Updated' });
                        load();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={d.active}
                    onCheckedChange={async (v) => { await updateDevice(d.id, { active: !!v }); load(); }}
                  />
                </TableCell>
                <TableCell className="text-xs">{d.last_seen_at ? formatDateTime(d.last_seen_at) : '—'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (confirm(`Delete device "${d.label}"?`)) { await deleteDevice(d.id); load(); }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No devices</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Android device</DialogTitle></DialogHeader>
          {!issued ? (
            <div className="space-y-3">
              <div>
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Office Pixel" />
              </div>
              <div>
                <Label>Send delay between messages (ms)</Label>
                <Input type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} min={0} />
              </div>
              <DialogFooter>
                <Button onClick={create}>Register</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Scan this QR code with the SMS Bridge Android app to pair instantly.</p>
              <div className="flex justify-center p-4 bg-white rounded border">
                <QRCodeSVG
                  value={JSON.stringify({
                    v: 1,
                    url: import.meta.env.VITE_SUPABASE_URL,
                    anon: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    token: issued,
                    delay,
                  })}
                  size={240}
                  level="M"
                />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Manual entry (fallback)</summary>
                <div className="p-3 mt-2 bg-muted rounded font-mono text-xs break-all">{issued}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => { navigator.clipboard.writeText(issued); toast({ title: 'Copied' }); }}
                >
                  <Copy className="w-3 h-3 mr-2" /> Copy token
                </Button>
              </details>
              <DialogFooter>
                <Button onClick={() => { setShowAdd(false); setIssued(null); }}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
