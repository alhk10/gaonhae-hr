import { supabase } from '@/integrations/supabase/client';

export interface SmsDevice {
  id: string;
  label: string;
  send_delay_ms: number;
  poll_interval_seconds: number;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface SmsCampaign {
  id: string;
  name: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  scheduled_at: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  filters_json: Record<string, unknown>;
  created_at: string;
}

export interface SmsThread {
  id: string;
  phone: string;
  student_id: string | null;
  last_message_at: string;
  last_direction: 'in' | 'out' | null;
  last_snippet: string | null;
  unread_count: number;
}

export interface SmsMessage {
  id: string;
  thread_id: string;
  direction: 'in' | 'out';
  phone: string;
  body: string;
  sent_at: string;
  status: string | null;
}

export const normalizePhone = (p: string) => (p ?? '').replace(/[^\d+]/g, '');

/* Devices */
export async function listDevices(): Promise<SmsDevice[]> {
  const { data, error } = await (supabase as any)
    .from('sms_devices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function registerDevice(label: string, sendDelayMs: number): Promise<{ device: SmsDevice; token: string }> {
  const { data, error } = await supabase.functions.invoke('sms-register-device', {
    body: { label, send_delay_ms: sendDelayMs },
  });
  if (error) throw error;
  return data as any;
}

export async function updateDevice(id: string, patch: Partial<SmsDevice>): Promise<void> {
  const { error } = await (supabase as any).from('sms_devices').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDevice(id: string): Promise<void> {
  const { error } = await (supabase as any).from('sms_devices').delete().eq('id', id);
  if (error) throw error;
}

/* Device ↔ branch tags */
export async function listDeviceBranches(): Promise<Record<string, string[]>> {
  const { data, error } = await (supabase as any)
    .from('sms_device_branches')
    .select('device_id, branch_id');
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    (map[r.device_id] ||= []).push(r.branch_id);
  }
  return map;
}

export async function setDeviceBranch(deviceId: string, branchId: string, enabled: boolean): Promise<void> {
  if (enabled) {
    const { error } = await (supabase as any)
      .from('sms_device_branches')
      .upsert({ device_id: deviceId, branch_id: branchId }, { onConflict: 'device_id,branch_id' });
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from('sms_device_branches')
      .delete()
      .eq('device_id', deviceId)
      .eq('branch_id', branchId);
    if (error) throw error;
  }
}

/* Campaigns */
export interface RecipientFilters {
  branchIds?: string[];
  status?: string; // 'active' | 'trial' | ...
}

export async function fetchRecipients(filters: RecipientFilters): Promise<
  { id: string; first_name: string; last_name: string; phone: string; branch_id: string | null }[]
> {
  let q = (supabase as any)
    .from('students')
    .select('id, first_name, last_name, phone, branch_id')
    .not('phone', 'is', null)
    .neq('phone', '');
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.branchIds?.length) q = q.in('branch_id', filters.branchIds);
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return (data ?? []).filter((s: any) => normalizePhone(s.phone).length >= 8);
}

export async function createCampaign(params: {
  name: string;
  body: string;
  scheduledAt: Date;
  filters: RecipientFilters;
  recipients: { student_id: string | null; phone: string; first_name?: string }[];
}): Promise<SmsCampaign> {
  const { name, body, scheduledAt, filters, recipients } = params;
  const dedup = new Map<string, { student_id: string | null; phone: string; first_name?: string }>();
  for (const r of recipients) {
    const p = normalizePhone(r.phone);
    if (p.length < 8) continue;
    if (!dedup.has(p)) dedup.set(p, { ...r, phone: p });
  }
  const uniq = Array.from(dedup.values());

  const { data: campaign, error: cErr } = await (supabase as any)
    .from('sms_campaigns')
    .insert({
      name,
      body,
      scheduled_at: scheduledAt.toISOString(),
      filters_json: filters as any,
      total_count: uniq.length,
      status: 'scheduled',
    })
    .select('*')
    .single();
  if (cErr) throw cErr;

  if (uniq.length > 0) {
    const rows = uniq.map((r) => ({
      campaign_id: campaign.id,
      student_id: r.student_id,
      phone: r.phone,
      body: personalize(body, r.first_name),
      send_at: scheduledAt.toISOString(),
      status: 'queued',
    }));
    // chunk inserts
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await (supabase as any).from('sms_outbound').insert(rows.slice(i, i + CHUNK));
      if (error) throw error;
    }
  }
  return campaign as SmsCampaign;
}

export function personalize(body: string, firstName?: string): string {
  return body.replace(/\{first_name\}/gi, firstName?.trim() || 'there');
}

export async function listCampaigns(): Promise<SmsCampaign[]> {
  const { data, error } = await (supabase as any)
    .from('sms_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function cancelCampaign(id: string): Promise<void> {
  await (supabase as any)
    .from('sms_outbound')
    .update({ status: 'cancelled' })
    .eq('campaign_id', id)
    .eq('status', 'queued');
  await (supabase as any).from('sms_campaigns').update({ status: 'cancelled' }).eq('id', id);
}

/* Threads and messages */
export async function listThreads(): Promise<SmsThread[]> {
  const { data, error } = await (supabase as any)
    .from('sms_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listMessages(threadId: string): Promise<SmsMessage[]> {
  const { data, error } = await (supabase as any)
    .from('sms_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function markThreadRead(threadId: string): Promise<void> {
  await (supabase as any).from('sms_threads').update({ unread_count: 0 }).eq('id', threadId);
}

export async function sendQuickReply(phone: string, body: string): Promise<void> {
  const p = normalizePhone(phone);
  const { error } = await (supabase as any).from('sms_outbound').insert({
    phone: p,
    body,
    status: 'queued',
    send_at: new Date().toISOString(),
  });
  if (error) throw error;
}
