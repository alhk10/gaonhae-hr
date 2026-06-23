/**
 * Admin edit dialog for a single seminar_payment_submissions row.
 * Opened from the Seminars tab pencil icon on /grading-list.
 */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getBeltLevelsForCountry } from '@/constants/beltLevels';
import {
  getSeminarSubmissionForEdit,
  adminPatchSeminarSubmission,
  adminReplaceSeminarSubmissionProof,
  SEMINAR_OPTIONS,
} from '@/services/seminarPaymentSubmissionService';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { SignedImage } from '@/components/common/SignedMedia';

interface Props {
  submissionId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const EditSeminarSubmissionDialog: React.FC<Props> = ({ submissionId, onClose, onSaved }) => {
  const open = !!submissionId;

  const { data: row, refetch, isLoading } = useQuery({
    queryKey: ['seminar-submission-edit', submissionId],
    queryFn: () => getSeminarSubmissionForEdit(submissionId!),
    enabled: !!submissionId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (row) {
      setForm({
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        email: row.email ?? '',
        date_of_birth: row.date_of_birth ?? '',
        gender: row.gender ?? '',
        branch_id: row.branch_id ?? '',
        current_belt: row.current_belt ?? '',
        package_code: row.package_code ?? '',
        amount: row.amount ?? 0,
      });
    }
  }, [row]);

  const branchObj = branches.find((b: any) => b.id === form.branch_id);
  const beltOptions = getBeltLevelsForCountry((branchObj as any)?.country || 'Singapore');

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handlePackageChange = (code: string) => {
    const pkg = SEMINAR_OPTIONS.find((o) => o.code === code);
    setForm((f: any) => ({
      ...f,
      package_code: code,
      amount: pkg?.amount ?? f.amount,
    }));
  };

  const handleSave = async () => {
    if (!submissionId) return;
    setSaving(true);
    try {
      const pkg = SEMINAR_OPTIONS.find((o) => o.code === form.package_code);
      await adminPatchSeminarSubmission(submissionId, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        branch_id: form.branch_id,
        current_belt: form.current_belt,
        amount: Number(form.amount) || 0,
        package_code: form.package_code,
        package_label: pkg?.label ?? row?.package_label,
        session_dates: pkg?.session_dates ?? row?.session_dates,
      });
      toast.success('Saved');
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleProofFile = async (file: File | null) => {
    if (!file || !submissionId || !form.branch_id) return;
    setUploading(true);
    try {
      await adminReplaceSeminarSubmissionProof(submissionId, file, form.branch_id);
      toast.success('Proof updated');
      await refetch();
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Proof upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Edit seminar submission</DialogTitle>
        </DialogHeader>

        {isLoading || !row ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First name</Label>
                <Input className="h-8 text-xs" value={form.first_name || ''} onChange={(e) => setField('first_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input className="h-8 text-xs" value={form.last_name || ''} onChange={(e) => setField('last_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-xs" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date of birth</Label>
                <Input className="h-8 text-xs" type="date" value={form.date_of_birth || ''} onChange={(e) => setField('date_of_birth', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender || ''} onValueChange={(v) => setField('gender', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="female">female</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Branch</Label>
                <Select value={form.branch_id || ''} onValueChange={(v) => setField('branch_id', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Current belt</Label>
                <Select value={form.current_belt || ''} onValueChange={(v) => setField('current_belt', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {beltOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={form.amount ?? ''} onChange={(e) => setField('amount', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Package</Label>
                <Select value={form.package_code || ''} onValueChange={handlePackageChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {SEMINAR_OPTIONS.map((o) => (
                      <SelectItem key={o.code} value={o.code} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded p-2 space-y-2">
              <Label className="text-xs font-semibold">Payment proof</Label>
              {row.proof_url ? (
                <SignedImage src={row.proof_url} alt="Proof" className="h-24 w-24 object-cover rounded border" fallback={<span className="text-[10px] text-muted-foreground">…</span>} />
              ) : (
                <div className="text-[10px] text-muted-foreground">No file</div>
              )}
              <Input type="file" accept="image/*" className="h-7 text-[11px]" disabled={uploading} onChange={(e) => handleProofFile(e.target.files?.[0] ?? null)} />
              {uploading && <div className="text-[10px] text-muted-foreground">Uploading…</div>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSeminarSubmissionDialog;
