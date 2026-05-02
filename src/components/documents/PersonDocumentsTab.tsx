import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/dateFormat';
import { getDocumentTypeLabel } from '@/constants/documentTypes';
import {
  DocumentRecord,
  createDocument,
  deleteDocument,
  getSignedDocumentUrl,
  listDocumentsForPerson,
  uploadDocumentFile,
  runAiMatch,
} from '@/services/documentService';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentTypeSelectDialog, { DocumentMeta } from './DocumentTypeSelectDialog';

interface Props {
  linkedType: 'student' | 'employee';
  linkedId: string;
  branchId?: string | null;
}

const PersonDocumentsTab: React.FC<Props> = ({ linkedType, linkedId, branchId }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<File[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      setDocs(await listDocumentsForPerson(linkedType, linkedId));
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedType, linkedId]);

  const handleConfirm = async (metas: DocumentMeta[]) => {
    const files = pending;
    setPending([]);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = metas[i];
      try {
        const { path, url } = await uploadDocumentFile(file);
        const created = await createDocument({
          document_type: meta.document_type,
          document_level: meta.document_level || null,
          custom_label: meta.custom_label || null,
          file_url: url,
          file_path: path,
          file_name: file.name,
          file_mime: file.type,
          file_size_bytes: file.size,
          branch_id: branchId || null,
          linked_type: linkedType,
          linked_id: linkedId,
          notes: meta.notes || null,
          match_status: 'matched',
        });
        // Trigger AI extraction in background for record completeness (don't change link)
        runAiMatch(created.id).catch(() => {});
      } catch (e: any) {
        toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
      }
    }
    refresh();
  };

  const handleView = async (d: DocumentRecord) => {
    const url = await getSignedDocumentUrl(d.file_path);
    window.open(url, '_blank');
  };

  const handleDelete = async (d: DocumentRecord) => {
    if (!confirm(`Delete "${d.file_name}"?`)) return;
    await deleteDocument(d.id, d.file_path);
    refresh();
  };

  return (
    <div className="space-y-3">
      <DocumentUploadZone onFiles={setPending} />

      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">No documents uploaded yet</div>
      ) : (
        <div className="divide-y border rounded-md">
          {docs.map((d) => (
            <div key={d.id} className="p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {getDocumentTypeLabel(d.document_type, d.document_level, d.custom_label)}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{d.file_name} · {formatDate(d.created_at)}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleView(d)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentTypeSelectDialog
        open={pending.length > 0}
        files={pending}
        onCancel={() => setPending([])}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default PersonDocumentsTab;
