/** /hello: student's gradings and certificates, with upload of existing STF/Kukkiwon certificates for staff approval. */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import GradingRecordsSection from './GradingRecordsSection';
import { uploadCertificate } from '@/services/certificateService';

const RANKS = ['1st Poom', '2nd Poom', '3rd Poom', '4th Poom', '1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan'];

export const HelloCertificatesDialog: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; sessionId: string; studentId: string; belt?: string | null }> =
  ({ open, onOpenChange, sessionId, studentId, belt }) => {
    const qc = useQueryClient();
    const [series, setSeries] = useState<'stf' | 'kukkiwon'>('stf');
    const [rank, setRank] = useState(RANKS.includes(belt || '') ? belt! : '1st Poom');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
      if (!file) return toast.error('Choose a photo of the certificate');
      if (!file.type.startsWith('image/')) return toast.error('Please upload an image, not a PDF');
      setBusy(true);
      try {
        await uploadCertificate(studentId, file, { series, rank }, { sessionId });
        toast.success('Certificate sent. Your instructor will check and approve it.');
        setFile(null);
        qc.invalidateQueries({ queryKey: ['grading-records', studentId] });
      } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Gradings &amp; certificates</DialogTitle></DialogHeader>
          <GradingRecordsSection studentId={studentId} sessionId={sessionId} />
          <div className="rounded-md border p-2 space-y-2 mt-2">
            <p className="text-xs font-semibold">Upload an existing certificate</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Series</Label>
                <Select value={series} onValueChange={(v) => setSeries(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="stf">STF</SelectItem><SelectItem value="kukkiwon">Kukkiwon</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Rank</Label>
                <Select value={rank} onValueChange={setRank}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Input type="file" accept="image/*" className="h-9 text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button className="w-full h-9" disabled={busy || !file} onClick={submit}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}Upload for approval
            </Button>
            <p className="text-[10px] text-muted-foreground">Approved certificates are filled in automatically on competition and event forms.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default HelloCertificatesDialog;
