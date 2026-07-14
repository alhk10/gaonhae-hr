import React, { useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, FileText, Image as ImageIcon, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { adminUploadCompetitionGradingCards } from '@/services/competitionPaymentSubmissionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string | null;
  studentName?: string;
  existingUrls?: string[];
  pendingVerify?: boolean;
  onUploaded?: () => void;
  onVerifyAfter?: () => Promise<void> | void;
}

const ACCEPT = 'image/*,application/pdf';
const UNLOCK_PASSWORDS = ['Hp84311884', 'Hp97533488'];

const GradingCardUploadDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  submissionId,
  studentName,
  existingUrls = [],
  pendingVerify = false,
  onUploaded,
  onVerifyAfter,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const unlocked = UNLOCK_PASSWORDS.includes(password);

  const reset = () => { setFiles([]); setPassword(''); };

  const handlePick = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (next.length === 0) {
      toast.error('Only images or PDF files are allowed');
      return;
    }
    setFiles(prev => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!submissionId) return;
    if (files.length === 0 && !pendingVerify) {
      toast.error('Add at least one file');
      return;
    }
    setBusy(true);
    try {
      if (files.length > 0) {
        await adminUploadCompetitionGradingCards(submissionId, files);
        toast.success(`Uploaded ${files.length} grading card${files.length === 1 ? '' : 's'}`);
        onUploaded?.();
      }
      if (pendingVerify && onVerifyAfter) {
        await onVerifyAfter();
      }
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload grading card</DialogTitle>
          <DialogDescription>
            {pendingVerify
              ? `A grading card is required before verifying${studentName ? ` ${studentName}` : ''}. Upload one or more images or PDF files, then verify.`
              : `Add grading card files${studentName ? ` for ${studentName}` : ''}. Images or PDF accepted.`}
          </DialogDescription>
        </DialogHeader>

        {existingUrls.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Already uploaded ({existingUrls.length})</div>
            <ul className="text-xs space-y-0.5">
              {existingUrls.map((u, i) => (
                <li key={u} className="truncate">
                  <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Grading card {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => handlePick(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-8 text-xs"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Add files
          </Button>

          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-xs">
                  {f.type === 'application/pdf' ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  <span className="truncate flex-1">{f.name}</span>
                  <button type="button" onClick={() => removeAt(i)} className="text-red-600 hover:text-red-800" disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy || (files.length === 0 && !pendingVerify)}>
            {busy
              ? 'Saving…'
              : pendingVerify
                ? (files.length > 0 ? 'Upload & Verify' : 'Verify')
                : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingCardUploadDialog;
