/** /access Summary: certificates needed after a paid conversion, and /hello uploads awaiting approval. */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getPendingCertificates, reviewCertificate, signCertificate, CERT_STATUS_LABEL, type StudentCertificate } from '@/services/certificateService';
import ConversionDialog from './ConversionDialog';

const Row: React.FC<{ c: StudentCertificate; onUpload: () => void; onOpenStudent?: (id: string) => void; onChanged: () => void }> = ({ c, onUpload, onOpenStudent, onChanged }) => {
  const [date, setDate] = useState(c.issue_date ? c.issue_date.split('-').reverse().join('/') : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (approve: boolean) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
    if (approve && !m) return toast.error('Enter the Date of Issue as DD/MM/YYYY');
    if (!approve && !reason.trim()) return toast.error('Enter a reason');
    setBusy(true);
    try {
      await reviewCertificate(c.id, approve, { issueDate: m ? `${m[3]}-${m[2]}-${m[1]}` : undefined, reason: reason.trim() || undefined });
      toast.success(approve ? 'Certificate approved' : 'Certificate rejected'); onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <li className="py-2 space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-muted-foreground w-[120px]">{formatDateTime(c.created_at)}</span>
        <Badge variant="outline" className="text-[10px]">{CERT_STATUS_LABEL[c.status]}</Badge>
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => onOpenStudent?.(c.student_id!)}>{c.student_name}</button>
        <span>{c.rank || '—'} · {c.series === 'stf' ? 'STF' : 'Kukkiwon'}{c.source === 'hello' ? ' · from /hello' : ''}</span>
        <span className="text-muted-foreground">{c.branch}</span>
        {c.image_path && (
          <button type="button" title="View certificate" className="text-primary"
            onClick={async () => { try { const u = await signCertificate(c.student_id!, c.image_path!); if (u) window.open(u, '_blank', 'noopener'); } catch (e) { toast.error((e as Error).message); } }}>
            <FileImage className="h-4 w-4" />
          </button>
        )}
        {c.status === 'awaiting_upload' && <Button size="sm" className="h-7 text-xs ml-auto" onClick={onUpload}>Upload certificate</Button>}
      </div>
      {c.status === 'pending' && (
        <div className="flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[132px]">
          <span className="text-muted-foreground">Scan: {c.scan?.issuer || '—'} · {c.scan?.name || '—'} · {c.issue_date ? formatDate(c.issue_date) : 'no date'}</span>
          {(c.scan?.problems || []).map((p: string) => <span key={p} className="text-destructive">{p}</span>)}
          <Input className="h-7 w-[130px] text-xs" placeholder="DD/MM/YYYY" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input className="h-7 w-[160px] text-xs" placeholder="Reason (needed to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => act(true)}>Approve</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => act(false)}>Reject</Button>
        </div>
      )}
    </li>
  );
};

export const PendingCertificatesCard: React.FC<{ onOpenStudent?: (id: string) => void }> = ({ onOpenStudent }) => {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['pending-certificates'], queryFn: getPendingCertificates, retry: false });
  const [upload, setUpload] = useState<StudentCertificate | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['pending-certificates'] });
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Certificates<Badge variant="destructive" className="text-[10px]">{data.length}</Badge></CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ul className="divide-y max-h-[420px] overflow-y-auto">
          {data.map((c) => <Row key={c.id} c={c} onUpload={() => setUpload(c)} onOpenStudent={onOpenStudent} onChanged={refresh} />)}
        </ul>
      </CardContent>
      {upload && (
        <ConversionDialog open onOpenChange={(o) => { if (!o) { setUpload(null); refresh(); } }} certificateId={upload.id} defaultRank={upload.rank}
          student={{ id: upload.student_id!, name: upload.student_name || 'Student' }} />
      )}
    </Card>
  );
};

export default PendingCertificatesCard;
