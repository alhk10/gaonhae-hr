import React, { useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, FileText, Image as ImageIcon, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImage } from '@/components/common/SignedMedia';
import {
  adminUploadCompetitionGradingCards,
  adminSetCompetitionGradingCards,
  adminReplaceCompetitionGradingCardAt,
} from '@/services/competitionPaymentSubmissionService';

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
const MAX_FILES = 2;

const isPdfUrl = (u: string) => /\.pdf(\?|$)/i.test(u);

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
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [enlarged, setEnlarged] = useState<{ url: string; index: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [reuploadBusy, setReuploadBusy] = useState(false);

  const totalCount = existingUrls.length + files.length;
  const remaining = Math.max(0, MAX_FILES - totalCount);

  const reset = () => { setFiles([]); setEnlarged(null); setRotation(0); };

  const handlePick = (list: FileList | null) => {
    if (!list) return;
    if (remaining === 0) {
      toast.error(`Maximum of ${MAX_FILES} grading card files reached`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const valid = Array.from(list).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (valid.length === 0) {
      toast.error('Only images or PDF files are allowed');
      return;
    }
    const next = valid.slice(0, remaining);
    if (valid.length > remaining) {
      toast.error(`Only ${MAX_FILES} grading card files allowed — extra files ignored`);
    }
    setFiles(prev => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const removeExisting = async (i: number) => {
    if (!submissionId) return;
    setDeletingIdx(i);
    try {
      const next = existingUrls.filter((_, idx) => idx !== i);
      await adminSetCompetitionGradingCards(submissionId, next);
      toast.success('Grading card removed');
      onUploaded?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove grading card');
    } finally {
      setDeletingIdx(null);
    }
  };

  const handleReuploadPick = async (file: File | undefined) => {
    if (!file || !submissionId || !enlarged) return;
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
      toast.error('Only images or PDF files are allowed');
      return;
    }
    setReuploadBusy(true);
    try {
      const newUrl = await adminReplaceCompetitionGradingCardAt(submissionId, enlarged.index, file);
      toast.success('Grading card replaced');
      setEnlarged({ url: newUrl, index: enlarged.index });
      setRotation(0);
      onUploaded?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reupload grading card');
    } finally {
      setReuploadBusy(false);
    }
  };

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
    <>
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
              <div className="grid grid-cols-2 gap-2">
                {existingUrls.map((u, i) => (
                  <div key={u} className="relative border rounded overflow-hidden bg-muted/30">
                    <button
                      type="button"
                      onClick={() => { setEnlarged({ url: u, index: i }); setRotation(0); }}
                      className="block w-full h-24 flex items-center justify-center hover:opacity-80"
                      title="Click to enlarge"
                    >
                      {isPdfUrl(u) ? (
                        <div className="flex flex-col items-center text-xs text-muted-foreground">
                          <FileText className="h-6 w-6 mb-1" />
                          Grading card {i + 1} (PDF)
                        </div>
                      ) : (
                        <SignedImage
                          src={u}
                          className="h-24 w-full object-cover"
                          alt={`Grading card ${i + 1}`}
                          fallback={<span className="text-xs text-muted-foreground">…</span>}
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExisting(i)}
                      disabled={busy || deletingIdx !== null}
                      className="absolute top-1 right-1 bg-white/90 rounded p-0.5 text-red-600 hover:text-red-800 disabled:opacity-50 shadow"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy || remaining === 0}
                className="h-8 text-xs"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Add files
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {totalCount} of {MAX_FILES} files
              </span>
            </div>

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

      <Dialog open={!!enlarged} onOpenChange={(o) => { if (!o) { setEnlarged(null); setRotation(0); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle className="text-sm">
              Grading card {enlarged ? enlarged.index + 1 : ''}{studentName ? ` — ${studentName}` : ''}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <input
                ref={reuploadInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  void handleReuploadPick(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={reuploadBusy}
                onClick={() => reuploadInputRef.current?.click()}
                title="Reupload grading card"
              >
                <Upload className="h-4 w-4 mr-1" />
                {reuploadBusy ? 'Uploading…' : 'Reupload'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {enlarged && (
            <div className="flex items-center justify-center overflow-hidden">
              {isPdfUrl(enlarged.url) ? (
                <a href={enlarged.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm py-8">
                  Open PDF in new tab
                </a>
              ) : (
                <SignedImage
                  src={enlarged.url}
                  className="max-w-full max-h-[80vh] h-auto object-contain rounded transition-transform"
                  alt="Grading card"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GradingCardUploadDialog;
