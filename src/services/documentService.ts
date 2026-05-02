import { supabase } from '@/integrations/supabase/client';

export interface DocumentRecord {
  id: string;
  document_type: string;
  document_level: string | null;
  custom_label: string | null;
  file_url: string;
  file_path: string;
  file_name: string;
  file_mime: string | null;
  file_size_bytes: number | null;
  linked_type: 'student' | 'employee' | null;
  linked_id: string | null;
  branch_id: string | null;
  match_status: 'pending' | 'matched' | 'unmatched' | 'rejected';
  match_confidence: number | null;
  extracted_data: any;
  ai_suggestion: any;
  notes: string | null;
  uploaded_by_email: string | null;
  created_at: string;
  updated_at: string;
}

const BUCKET = 'documents';

export async function uploadDocumentFile(file: File): Promise<{ path: string; url: string }> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function getSignedDocumentUrl(path: string, expiresIn = 600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function createDocument(input: Partial<DocumentRecord>): Promise<DocumentRecord> {
  const { data: userRes } = await supabase.auth.getUser();
  const email = userRes.user?.email ?? null;
  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...input,
      uploaded_by_email: email,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function listDocuments(filters?: {
  type?: string;
  linked?: 'student' | 'employee' | 'unmatched';
  branchId?: string;
  search?: string;
}): Promise<DocumentRecord[]> {
  let q = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (filters?.type) q = q.eq('document_type', filters.type);
  if (filters?.linked === 'unmatched') q = q.is('linked_id', null);
  else if (filters?.linked) q = q.eq('linked_type', filters.linked);
  if (filters?.branchId) q = q.eq('branch_id', filters.branchId);
  if (filters?.search) q = q.or(`file_name.ilike.%${filters.search}%,custom_label.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as DocumentRecord[];
}

export async function listDocumentsForPerson(linkedType: 'student' | 'employee', linkedId: string): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('linked_type', linkedType)
    .eq('linked_id', linkedId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DocumentRecord[];
}

export async function updateDocument(id: string, patch: Partial<DocumentRecord>): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from('documents')
    .update(patch as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function deleteDocument(id: string, filePath?: string): Promise<void> {
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export async function runAiMatch(documentId: string): Promise<{ suggestion: any; extracted: any; confidence: number } | null> {
  const { data, error } = await supabase.functions.invoke('documents-ai-match', {
    body: { document_id: documentId },
  });
  if (error) {
    console.error('AI match failed:', error);
    return null;
  }
  return data ?? null;
}

export async function linkDocumentToPerson(
  documentId: string,
  linkedType: 'student' | 'employee',
  linkedId: string,
  branchId?: string | null,
): Promise<DocumentRecord> {
  return updateDocument(documentId, {
    linked_type: linkedType,
    linked_id: linkedId,
    branch_id: branchId ?? null,
    match_status: 'matched',
  });
}
