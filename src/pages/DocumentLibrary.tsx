import React, { useEffect, useState, useCallback } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBranches } from '@/hooks/useBranches';
import { formatDate } from '@/utils/dateFormat';
import { DOCUMENT_TYPES, getDocumentTypeLabel } from '@/constants/documentTypes';
import {
  DocumentRecord,
  createDocument,
  deleteDocument,
  getSignedDocumentUrl,
  linkDocumentToPerson,
  listDocuments,
  runAiMatch,
  updateDocument,
  uploadDocumentFile,
} from '@/services/documentService';
import DocumentUploadZone from '@/components/documents/DocumentUploadZone';
import DocumentTypeSelectDialog, { DocumentMeta } from '@/components/documents/DocumentTypeSelectDialog';
import DocumentMatchConfirmDialog from '@/components/documents/DocumentMatchConfirmDialog';
import { Eye, Trash2, Sparkles, Link as LinkIcon } from 'lucide-react';

const DocumentLibrary: React.FC = () => {
  const { toast } = useToast();
  const { branches } = useBranches();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLinked, setFilterLinked] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [reviewDoc, setReviewDoc] = useState<DocumentRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDocuments({
        type: filterType !== 'all' ? filterType : undefined,
        linked: filterLinked !== 'all' ? (filterLinked as any) : undefined,
        branchId: filterBranch !== 'all' ? filterBranch : undefined,
        search: search || undefined,
      });
      setDocs(data);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterLinked, filterBranch, search, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleConfirmTypes = async (metas: DocumentMeta[]) => {
    const files = pendingFiles;
    setPendingFiles([]);
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
          branch_id: meta.branch_id || null,
          notes: meta.notes || null,
          match_status: 'pending',
        });
        toast({ title: 'Uploaded', description: file.name });
        // Run AI match in background, then open confirmation
        runAiMatch(created.id).then(async () => {
          const { data } = await import('@/integrations/supabase/client').then(({ supabase }) =>
            supabase.from('documents').select('*').eq('id', created.id).single(),
          );
          if (data) setReviewDoc(data as DocumentRecord);
          refresh();
        });
      } catch (e: any) {
        toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
      }
    }
    refresh();
  };

  const handleView = async (d: DocumentRecord) => {
    try {
      const url = await getSignedDocumentUrl(d.file_path);
      window.open(url, '_blank');
    } catch (e: any) {
      toast({ title: 'Cannot open', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (d: DocumentRecord) => {
    if (!confirm(`Delete "${d.file_name}"?`)) return;
    try {
      await deleteDocument(d.id, d.file_path);
      toast({ title: 'Deleted' });
      refresh();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleRematch = async (d: DocumentRecord) => {
    toast({ title: 'Running AI match...' });
    await runAiMatch(d.id);
    const { data } = await import('@/integrations/supabase/client').then(({ supabase }) =>
      supabase.from('documents').select('*').eq('id', d.id).single(),
    );
    if (data) setReviewDoc(data as DocumentRecord);
    refresh();
  };

  const handleConfirmLink = async (linkedType: 'student' | 'employee', linkedId: string, branchId?: string | null) => {
    if (!reviewDoc) return;
    try {
      await linkDocumentToPerson(reviewDoc.id, linkedType, linkedId, branchId);
      toast({ title: 'Linked' });
      setReviewDoc(null);
      refresh();
    } catch (e: any) {
      toast({ title: 'Link failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleSkipLink = async () => {
    if (!reviewDoc) return;
    await updateDocument(reviewDoc.id, { match_status: 'unmatched' });
    setReviewDoc(null);
    refresh();
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-4 p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Document Library</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DocumentUploadZone onFiles={setPendingFiles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLinked} onValueChange={setFilterLinked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All linked</SelectItem>
                  <SelectItem value="student">Linked to student</SelectItem>
                  <SelectItem value="employee">Linked to employee</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Search file name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents ({docs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : docs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No documents yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">File</th>
                      <th className="py-2 px-2">Linked to</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">Uploaded</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">
                          {getDocumentTypeLabel(d.document_type, d.document_level, d.custom_label)}
                        </td>
                        <td className="py-2 px-2 text-xs truncate max-w-[200px]">{d.file_name}</td>
                        <td className="py-2 px-2 text-xs">
                          {d.linked_id ? (
                            <span><Badge variant="outline" className="capitalize text-[10px] mr-1">{d.linked_type}</Badge>{d.ai_suggestion?.name || d.linked_id}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Badge
                            variant={d.match_status === 'matched' ? 'default' : d.match_status === 'unmatched' ? 'secondary' : 'outline'}
                            className="text-[10px] capitalize"
                          >
                            {d.match_status}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs">{formatDate(d.created_at)}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleView(d)}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRematch(d)} title="AI match"><Sparkles className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setReviewDoc(d)} title="Link"><LinkIcon className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentTypeSelectDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        branches={branches}
        onCancel={() => setPendingFiles([])}
        onConfirm={handleConfirmTypes}
      />

      <DocumentMatchConfirmDialog
        open={!!reviewDoc}
        doc={reviewDoc}
        onCancel={() => setReviewDoc(null)}
        onConfirm={handleConfirmLink}
        onSkip={handleSkipLink}
      />
    </ResponsiveLayout>
  );
};

export default DocumentLibrary;
