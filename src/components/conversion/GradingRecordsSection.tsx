/** Grading section in the student profile: gradings + conversions/certificates. */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, FileImage } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateFormat';
import { getGradingRecords, getHelloGradingRecords, signCertificate, CERT_STATUS_LABEL, type GradingRecords } from '@/services/certificateService';

interface Props { studentId: string; sessionId?: string; onCertificateNeeded?: (certId: string, rank: string | null) => void }

export const GradingRecordsSection: React.FC<Props> = ({ studentId, sessionId, onCertificateNeeded }) => {
  const { data, isLoading, error } = useQuery<GradingRecords>({
    queryKey: ['grading-records', studentId, !!sessionId],
    queryFn: () => (sessionId ? getHelloGradingRecords(sessionId, studentId) : getGradingRecords(studentId)),
  });
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (path: string) => {
    setOpening(path);
    try { const u = await signCertificate(studentId, path, { sessionId }); if (u) window.open(u, '_blank', 'noopener'); }
    catch (e) { toast.error((e as Error).message); } finally { setOpening(null); }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading gradings…</p>;
  if (error) return <p className="text-xs text-muted-foreground">Gradings unavailable.</p>;
  const certs = data?.certificates || [];
  type Row = { key: string; date: string | null; belt: string; result: string; cert?: (typeof certs)[number]; action?: () => void };
  const rows: Row[] = [
    ...(data?.history || []).map((h) => {
      const cert = certs.find((c) => c.rank === h.belt_to && c.image_path && !c.invoice_id);
      return { key: h.id, date: h.date, belt: h.belt_to || h.belt_from || '—', result: h.result || '—', cert };
    }),
    ...certs.filter((c) => c.invoice_id || !(data?.history || []).some((h) => h.belt_to === c.rank)).map((c) => ({
      key: c.id, date: c.issue_date || c.created_at?.slice(0, 10), belt: `${c.rank || '—'} (${c.series === 'stf' ? 'STF' : 'Kukkiwon'})`,
      result: c.invoice_id ? `Conversion · ${CERT_STATUS_LABEL[c.status]}` : CERT_STATUS_LABEL[c.status], cert: c,
      action: c.status === 'awaiting_upload' && onCertificateNeeded ? () => onCertificateNeeded(c.id, c.rank) : undefined,
    })),
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No gradings recorded yet.</p>;
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border px-2 py-1 text-xs">
          <span className="text-muted-foreground w-[78px]">{r.date ? formatDate(r.date) : '—'}</span>
          <span className="font-medium">{r.belt}</span>
          <span className="text-muted-foreground capitalize flex-1 min-w-[80px]">{r.result}</span>
          {r.cert?.image_path ? (
            <button type="button" title="View certificate" aria-label="View certificate" disabled={opening === r.cert.image_path}
              onClick={() => open(r.cert!.image_path!)} className="text-primary"><FileImage className="h-4 w-4" /></button>
          ) : r.action ? (
            <button type="button" onClick={r.action}><Badge variant="destructive" className="text-[10px]">Upload certificate</Badge></button>
          ) : <Award className="h-3.5 w-3.5 text-muted-foreground/40" />}
        </div>
      ))}
    </div>
  );
};

export default GradingRecordsSection;
