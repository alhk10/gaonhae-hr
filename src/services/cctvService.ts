import { supabase } from '@/integrations/supabase/client';

export interface CctvCamera {
  id: string;
  branch_id: string;
  name: string;
  mediamtx_path: string;
  supports_playback: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CctvCameraSecret {
  rtsp_url: string;
  username?: string | null;
  password?: string | null;
}

export interface StreamToken {
  url: string;
  protocol: 'hls' | 'webrtc';
  expires_in: number;
  camera_id: string;
}

/** Fetch all visible cameras (RLS filters by branch access). */
export async function listCameras(): Promise<CctvCamera[]> {
  const { data, error } = await supabase
    .from('cctv_cameras')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as CctvCamera[];
}

/** Fetch cameras for a single branch (admin view — includes inactive). */
export async function listCamerasForBranch(branchId: string): Promise<CctvCamera[]> {
  const { data, error } = await supabase
    .from('cctv_cameras')
    .select('*')
    .eq('branch_id', branchId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as CctvCamera[];
}

export async function createCamera(
  payload: Omit<CctvCamera, 'id' | 'created_at' | 'updated_at'>,
): Promise<CctvCamera> {
  const { data, error } = await supabase
    .from('cctv_cameras')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as CctvCamera;
}

export async function updateCamera(
  id: string,
  patch: Partial<Omit<CctvCamera, 'id' | 'created_at' | 'updated_at'>>,
): Promise<CctvCamera> {
  const { data, error } = await supabase
    .from('cctv_cameras')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as CctvCamera;
}

export async function deleteCamera(id: string): Promise<void> {
  const { error } = await supabase.from('cctv_cameras').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Request a short-lived stream URL via the cctv-stream-token edge function.
 * Returns null when the server isn't configured yet (HTTP 503) so the UI
 * can show a friendly placeholder instead of crashing.
 */
export async function getStreamToken(
  cameraId: string,
  options?: { protocol?: 'hls' | 'webrtc'; playbackStart?: string },
): Promise<StreamToken | { error: string; message?: string } | null> {
  const { data, error } = await supabase.functions.invoke('cctv-stream-token', {
    body: {
      camera_id: cameraId,
      protocol: options?.protocol ?? 'hls',
      playback_start: options?.playbackStart,
    },
  });
  if (error) {
    // FunctionsHttpError carries a status; treat 503 as "not configured"
    const ctx: any = (error as any)?.context;
    if (ctx?.status === 503) {
      try {
        const body = await ctx.json();
        return { error: 'not_configured', message: body?.message };
      } catch {
        return { error: 'not_configured' };
      }
    }
    throw error;
  }
  if (data && (data as any).error) return data as { error: string; message?: string };
  return data as StreamToken;
}
