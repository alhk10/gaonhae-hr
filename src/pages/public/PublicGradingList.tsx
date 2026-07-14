/**
 * Public grading list page (no auth).
 * Mounted at /grading-list.
 *
 * Hidden admin edit mode: discrete lock icon top-right; password unlocks inline
 * delete/update-slot, plus amount + proof columns for submission rows.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, Trash2, Pencil, Download, CheckCircle, XCircle, Award, AlertTriangle, RotateCw, Settings, PenLine, FileText, IdCard, Image as ImageIcon, Printer } from 'lucide-react';
import { generateCompetitionPrintPDF } from '@/utils/competitionPrintPDFGenerator';
import CompetitionEventsSettingsDialog from '@/components/grading-list/CompetitionEventsSettingsDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PublicGuardsPurchaseList from './PublicGuardsPurchaseList';
import DeleteRowConfirmDialog from '@/components/grading-list/DeleteRowConfirmDialog';
import SeminarsTab from '@/components/grading-list/SeminarsTab';
import EditCompetitionSubmissionDialog from '@/components/grading-list/EditCompetitionSubmissionDialog';
import {
  getPublicCompetitionList,
  adminDeleteCompetitionSubmission,
  getCompetitionSubmissionDeleteContext,
  updateCompetitionPoomsae,
  updateCompetitionSchedule,
  verifyCompetitionSubmission,
  rejectCompetitionSubmission,
  type PublicCompetitionListRow,

} from '@/services/competitionPaymentSubmissionService';
import {
  downloadGradingCertificatePDF,
  generateBulkGradingCertificatesPDFAsync,
  type GradingCertificateInput,
} from '@/utils/gradingCertificatePDFGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import { SignedImage } from '@/components/common/SignedMedia';
import { resolveStorageUrl } from '@/utils/storageUrl';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBranches } from '@/services/settingsService';
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import {
  getPublicGradingList,
  getPublicGradingSlotsByDate,
  getPublicBranches,
  adminUpdateGradingSubmissionSlot,
  adminUpdateGradingSubmissionBranch,
  adminUpdateGradingSubmissionDisplayName,
  adminUpdateGradingSubmissionResult,
  adminDeleteGradingSubmission,
  adminDeleteGradingRegistration,
  getGradingRowDeleteContext,
  adminUpdateGradingResult,
  adminUpdateGradingRemark,
  adminUpdateGradingSubmissionRemark,
  adminUpdateGradingRegistrationSlot,
  adminUpdateGradingRegistrationBranch,
  adminUpdateGradingRegistrationDisplayName,
  adminUpdateStudentCertificateName,
  verifyGradingSubmission,
  rejectGradingSubmission,
  type PublicGradingListRow,
  type PublicGradingSlotByDate,
} from '@/services/gradingPaymentSubmissionService';
import { getNextBeltLevel, isFoundationToBlackTip } from '@/constants/beltLevels';
import GradingCardUploadDialog from '@/components/grading-list/GradingCardUploadDialog';

const REMARK_OPTIONS = ['AWOL', 'Medical Certificate', 'Double Testing', 'Video Testing', 'To delete. Duplicate', 'For refund as credits'] as const;

const isWithinResultWindow = (gradingDate: string | null | undefined): boolean => {
  if (!gradingDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const g = new Date(gradingDate + 'T00:00:00');
  if (Number.isNaN(g.getTime())) return false;
  const end = new Date(g);
  end.setDate(end.getDate() + 30);
  return today >= g && today <= end;
};


const ADMIN_UNLOCK_PASSWORD = 'Hp97533488';
const ADMIN_FULL_UNLOCK_PASSWORD = 'Hp84311884';

const statusVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const PublicGradingList: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const verifiedBy = user?.employeeId || user?.email || 'system';
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());
  const [unlockLevel, setUnlockLevel] = useState<'none' | 'standard' | 'full'>(() => {
    try {
      const lvl = sessionStorage.getItem('guards_list_unlock_level_v1');
      if (lvl === 'standard' || lvl === 'full') return lvl;
    } catch {}
    return 'none';
  });
  const editMode = unlockLevel !== 'none';
  const canDelete = unlockLevel === 'full';
  const [pwInput, setPwInput] = useState('');

  const [slotEditRow, setSlotEditRow] = useState<PublicGradingListRow | null>(null);
  const [slotChoice, setSlotChoice] = useState<string>('');
  type PendingDelete =
    | { kind: 'grading'; source: 'submission' | 'registration'; id: string; studentName: string }
    | { kind: 'competition'; id: string; studentName: string }
    | { kind: 'guards'; id: string; studentName: string }
    | { kind: 'seminar'; id: string; studentName: string };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxRotation, setLightboxRotation] = useState(0);
  const [rejectRow, setRejectRow] = useState<PublicGradingListRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Row edit dialog (registrations + submissions)
  const [editRow, setEditRow] = useState<PublicGradingListRow | null>(null);
  const [editForm, setEditForm] = useState<{
    display_name: string;
    certificate_name: string;
    branch_id: string;
    slot_id: string;
    result: string;
    remark: string;
  }>({ display_name: '', certificate_name: '', branch_id: '', slot_id: '', result: '', remark: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Mass edit dialog
  const [massEditOpen, setMassEditOpen] = useState(false);
  const [massForm, setMassForm] = useState<{
    changeResult: boolean; result: string;
    changeSlot: boolean; slot_id: string;
    changeBranch: boolean; branch_id: string;
    changeRemark: boolean; remark: string;
  }>({ changeResult: false, result: '', changeSlot: false, slot_id: '', changeBranch: false, branch_id: '', changeRemark: false, remark: '' });
  const [savingMass, setSavingMass] = useState(false);


  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-grading-list'],
    queryFn: () => getPublicGradingList({}),
    staleTime: 30 * 1000,
  });

  const dateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.grading_date) set.add(r.grading_date);
    return Array.from(set).sort();
  }, [rows]);

  useEffect(() => {
    if (dateFilter === 'all' && dateOptions.length > 0) {
      setDateFilter(dateOptions[0]);
    }
  }, [dateOptions, dateFilter]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.branch_name || '—');
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let res = dateFilter === 'all' ? rows : rows.filter((r) => r.grading_date === dateFilter);
    if (branchFilter !== 'all') res = res.filter((r) => (r.branch_name || '—') === branchFilter);
    return res;
  }, [rows, dateFilter, branchFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { header: PublicGradingListRow; items: PublicGradingListRow[] }>();
    for (const r of filteredRows) {
      const key = `${r.grading_date || 'unscheduled'}|${r.start_time || ''}|${r.slot_id || ''}`;
      if (!map.has(key)) map.set(key, { header: r, items: [] });
      map.get(key)!.items.push(r);
    }
    for (const g of map.values()) {
      g.items.sort((a, b) => {
        const ra = a.remark ? 1 : 0;
        const rb = b.remark ? 1 : 0;
        if (ra !== rb) return ra - rb;
        const ba = (a.branch_name || '').localeCompare(b.branch_name || '');
        if (ba !== 0) return ba;
        return (a.student_name || '').localeCompare(b.student_name || '');
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.header.grading_date || '9999-12-31';
      const db = b.header.grading_date || '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      const ta = a.header.start_time || '99:99:99';
      const tb = b.header.start_time || '99:99:99';
      return ta.localeCompare(tb);
    });
  }, [filteredRows]);

  // Slots for the slot-only edit dialog (legacy submission Pencil)
  const { data: editableSlots = [] } = useQuery({
    queryKey: ['public-grading-slots-by-date', slotEditRow?.grading_date],
    queryFn: () =>
      slotEditRow?.grading_date
        ? getPublicGradingSlotsByDate(slotEditRow.grading_date)
        : Promise.resolve([] as PublicGradingSlotByDate[]),
    enabled: !!slotEditRow?.grading_date,
  });

  // Slots for the row edit dialog (by the editRow's grading_date)
  const { data: editRowSlots = [] } = useQuery({
    queryKey: ['public-grading-slots-by-date', editRow?.grading_date],
    queryFn: () =>
      editRow?.grading_date
        ? getPublicGradingSlotsByDate(editRow.grading_date)
        : Promise.resolve([] as PublicGradingSlotByDate[]),
    enabled: !!editRow?.grading_date,
  });

  // Branches for the row edit + mass edit dialogs
  const { data: publicBranches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    enabled: editMode,
    staleTime: 5 * 60 * 1000,
  });

  // Common selected date across mass-edit selection (if all share one date)
  // Declared below after selectedRows; see massSlotsQuery.





  const handleUnlock = () => {
    if (pwInput === ADMIN_FULL_UNLOCK_PASSWORD) {
      setUnlockLevel('full');
      setPwInput('');
      try {
        sessionStorage.setItem('guards_list_unlocked_v1', '1');
        sessionStorage.setItem('guards_list_unlock_level_v1', 'full');
      } catch {}
      toast.success('Full edit mode enabled');
    } else if (pwInput === ADMIN_UNLOCK_PASSWORD) {
      setUnlockLevel('standard');
      setPwInput('');
      try {
        sessionStorage.setItem('guards_list_unlocked_v1', '1');
        sessionStorage.setItem('guards_list_unlock_level_v1', 'standard');
      } catch {}
      toast.success('Edit mode enabled');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleLock = () => {
    setUnlockLevel('none');
    try {
      sessionStorage.removeItem('guards_list_unlocked_v1');
      sessionStorage.removeItem('guards_list_unlock_level_v1');
    } catch {}
  };

  const handleSlotSave = async () => {
    if (!slotEditRow?.submission_id || !slotChoice) return;
    try {
      await adminUpdateGradingSubmissionSlot(slotEditRow.submission_id, slotChoice);
      toast.success('Slot updated');
      setSlotEditRow(null);
      setSlotChoice('');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update slot');
    }
  };

  const handlePendingDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === 'grading') {
        if (pendingDelete.source === 'submission') {
          await adminDeleteGradingSubmission(pendingDelete.id);
        } else {
          await adminDeleteGradingRegistration(pendingDelete.id);
        }
        toast.success('Row deleted');
        qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      } else if (pendingDelete.kind === 'competition') {
        await adminDeleteCompetitionSubmission(pendingDelete.id);
        toast.success('Competition entry deleted');
        qc.invalidateQueries({ queryKey: ['public-competition-list'] });
      } else if (pendingDelete.kind === 'guards') {
        const { adminDeleteGuardsPurchase } = await import('@/services/guardsPurchaseService');
        await adminDeleteGuardsPurchase(pendingDelete.id);
        toast.success('Guards purchase deleted');
        qc.invalidateQueries({ queryKey: ['guards-purchases'] });
      } else if (pendingDelete.kind === 'seminar') {
        const { adminDeleteSeminarSubmission } = await import('@/services/seminarPaymentSubmissionService');
        await adminDeleteSeminarSubmission(pendingDelete.id);
        toast.success('Seminar booking deleted');
        qc.invalidateQueries({ queryKey: ['public-seminar-list'] });
      }
      setPendingDelete(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Auto-lock after 15 minutes of inactivity when unlocked
  useEffect(() => {
    if (unlockLevel === 'none') return;
    const TIMEOUT_MS = 15 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLock();
        toast.info('Auto-locked after 15 minutes of inactivity');
      }, TIMEOUT_MS);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlockLevel]);

  const handleVerify = async (row: PublicGradingListRow) => {
    if (!row.submission_id) return;
    setBusyId(row.submission_id);
    try {
      await verifyGradingSubmission(row.submission_id, verifiedBy);
      toast.success('Marked as verified');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRow?.submission_id) return;
    setBusyId(rejectRow.submission_id);
    try {
      await rejectGradingSubmission(rejectRow.submission_id, rejectReason.trim() || 'Rejected', verifiedBy);
      toast.success('Submission rejected');
      setRejectRow(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-grading-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  const handleResultChange = async (r: PublicGradingListRow, next: string) => {
    const value = next === '__clear__' ? null : next;
    try {
      if (r.source === 'registration' && r.registration_id) {
        await adminUpdateGradingResult(r.registration_id, value);
      } else if (r.source === 'submission' && r.submission_id) {
        await adminUpdateGradingSubmissionResult(r.submission_id, value);
      } else {
        return;
      }
      toast.success('Result updated');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update result');
    }
  };

  const handleRemarkChange = async (r: PublicGradingListRow, next: string) => {
    const value = next === '__clear__' ? null : next;
    try {
      if (r.source === 'registration' && r.registration_id) {
        await adminUpdateGradingRemark(r.registration_id, value);
      } else if (r.source === 'submission' && r.submission_id) {
        await adminUpdateGradingSubmissionRemark(r.submission_id, value);
      } else {
        return;
      }
      toast.success('Remark updated');
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update remark');
    }
  };

  const openRowEdit = (r: PublicGradingListRow) => {
    setEditRow(r);
    setEditForm({
      display_name: r.student_name || '',
      certificate_name: r.certificate_name || '',
      branch_id: r.branch_id || '',
      slot_id: r.slot_id || '',
      result: r.result || '',
      remark: r.remark || '',
    });
  };

  const handleRowEditSave = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const ops: Promise<unknown>[] = [];
      const currentName = editRow.student_name || '';
      const currentResult = editRow.result || '';
      const currentRemark = editRow.remark || '';
      const resultEditable = unlockLevel === 'full' || isWithinResultWindow(editRow.grading_date);

      if (editRow.source === 'registration' && editRow.registration_id) {
        if (currentName !== editForm.display_name) {
          ops.push(adminUpdateGradingRegistrationDisplayName(editRow.registration_id, editForm.display_name));
        }
        if (editForm.branch_id && editForm.branch_id !== editRow.branch_id) {
          ops.push(adminUpdateGradingRegistrationBranch(editRow.registration_id, editForm.branch_id));
        }
        if (editForm.slot_id && editForm.slot_id !== editRow.slot_id) {
          ops.push(adminUpdateGradingRegistrationSlot(editRow.registration_id, editForm.slot_id));
        }
        if (resultEditable && editForm.result !== currentResult) {
          ops.push(adminUpdateGradingResult(editRow.registration_id, editForm.result || null));
        }
        if (editForm.remark !== currentRemark) {
          ops.push(adminUpdateGradingRemark(editRow.registration_id, editForm.remark || null));
        }
      } else if (editRow.source === 'submission' && editRow.submission_id) {
        if (currentName !== editForm.display_name) {
          ops.push(adminUpdateGradingSubmissionDisplayName(editRow.submission_id, editForm.display_name));
        }
        if (editForm.branch_id && editForm.branch_id !== editRow.branch_id) {
          ops.push(adminUpdateGradingSubmissionBranch(editRow.submission_id, editForm.branch_id));
        }
        if (editForm.slot_id && editForm.slot_id !== editRow.slot_id) {
          ops.push(adminUpdateGradingSubmissionSlot(editRow.submission_id, editForm.slot_id));
        }
        if (resultEditable && editForm.result !== currentResult) {
          ops.push(adminUpdateGradingSubmissionResult(editRow.submission_id, editForm.result || null));
        }
        if (editForm.remark !== currentRemark) {
          ops.push(adminUpdateGradingSubmissionRemark(editRow.submission_id, editForm.remark || null));
        }
      }

      if (editRow.student_id && (editRow.certificate_name || '') !== editForm.certificate_name) {
        ops.push(adminUpdateStudentCertificateName(editRow.student_id, editForm.certificate_name));
      }

      if (ops.length === 0) {
        toast.info('Nothing to update');
      } else {
        await Promise.all(ops);
        toast.success('Updated');
        qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      }
      setEditRow(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  const openMassEdit = () => {
    setMassForm({ changeResult: false, result: '', changeSlot: false, slot_id: '', changeBranch: false, branch_id: '', changeRemark: false, remark: '' });
    setMassEditOpen(true);
  };

  const handleMassEditApply = async () => {
    setSavingMass(true);
    let updated = 0; let skipped = 0;
    try {
      for (const r of selectedRows) {
        const ops: Promise<unknown>[] = [];
        if (massForm.changeResult) {
          const resultEditable = unlockLevel === 'full' || isWithinResultWindow(r.grading_date);
          if (resultEditable) {
            if (r.source === 'registration' && r.registration_id) {
              ops.push(adminUpdateGradingResult(r.registration_id, massForm.result || null));
            } else if (r.source === 'submission' && r.submission_id) {
              ops.push(adminUpdateGradingSubmissionResult(r.submission_id, massForm.result || null));
            }
          }
        }
        if (massForm.changeSlot && massForm.slot_id) {
          if (r.source === 'registration' && r.registration_id) {
            ops.push(adminUpdateGradingRegistrationSlot(r.registration_id, massForm.slot_id));
          } else if (r.source === 'submission' && r.submission_id) {
            ops.push(adminUpdateGradingSubmissionSlot(r.submission_id, massForm.slot_id));
          }
        }
        if (massForm.changeBranch && massForm.branch_id) {
          if (r.source === 'registration' && r.registration_id) {
            ops.push(adminUpdateGradingRegistrationBranch(r.registration_id, massForm.branch_id));
          } else if (r.source === 'submission' && r.submission_id) {
            ops.push(adminUpdateGradingSubmissionBranch(r.submission_id, massForm.branch_id));
          }
        }
        if (massForm.changeRemark) {
          if (r.source === 'registration' && r.registration_id) {
            ops.push(adminUpdateGradingRemark(r.registration_id, massForm.remark || null));
          } else if (r.source === 'submission' && r.submission_id) {
            ops.push(adminUpdateGradingSubmissionRemark(r.submission_id, massForm.remark || null));
          }
        }
        if (ops.length === 0) { skipped++; continue; }
        try { await Promise.all(ops); updated++; } catch { skipped++; }
      }
      qc.invalidateQueries({ queryKey: ['public-grading-list'] });
      toast.success(`Updated ${updated}${skipped ? ` · Skipped ${skipped}` : ''}`);
      setMassEditOpen(false);
    } finally {
      setSavingMass(false);
    }
  };



  const openLightbox = async (storedUrl: string) => {
    const resolved = await resolveStorageUrl(storedUrl);
    setLightboxUrl(resolved || storedUrl);
  };

  const loadLogoDataUrl = (): Promise<{ dataUrl: string; w: number; h: number } | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/lovable-uploads/gaonhae-logo-transparent.png';
    });

  // Fixed per-branch color mapping
  const BRANCH_COLOR_MAP: Record<string, { fill: [number, number, number]; text: [number, number, number] }> = {
    balmoral:     { fill: [219, 234, 254], text: [30, 64, 175] },   // blue
    kembangan:    { fill: [220, 252, 231], text: [22, 101, 52] },   // green
    'jurong west':{ fill: [254, 249, 195], text: [133, 77, 14] },   // yellow
    yishun:       { fill: [233, 213, 255], text: [107, 33, 168] },  // purple
    'bukit merah':{ fill: [255, 237, 213], text: [154, 52, 18] },   // orange
    morley:       { fill: [204, 251, 241], text: [17, 94, 89] },    // teal
  };
  const BRANCH_DEFAULT_COLOR: { fill: [number, number, number]; text: [number, number, number] } = {
    fill: [241, 245, 249], text: [51, 65, 85],                      // grey
  };
  const branchColor = (name: string) => {
    const k = (name || '').trim().toLowerCase();
    return BRANCH_COLOR_MAP[k] || BRANCH_DEFAULT_COLOR;
  };
  const statusColor = (s: string): { fill: [number, number, number]; text: [number, number, number] } => {
    const k = (s || '').toLowerCase();
    if (k === 'paid') return { fill: [220, 252, 231], text: [22, 101, 52] };
    if (k === 'verified') return { fill: [219, 234, 254], text: [30, 64, 175] };
    if (k.includes('pending')) return { fill: [254, 243, 199], text: [146, 64, 14] };
    if (k === 'rejected') return { fill: [254, 226, 226], text: [153, 27, 27] };
    return { fill: [241, 245, 249], text: [51, 65, 85] };
  };

  const handleDownloadPdf = async () => {
    if (groups.length === 0) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const gutter = 6;
    const colW = (pageW - margin * 2 - gutter) / 2;
    const colX = [margin, margin + colW + gutter];

    // Title
    const titleText = `GRADING LIST FOR ${dateFilter === 'all' ? 'ALL DATES' : formatDate(dateFilter)}`;
    const titleY = margin + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(titleText, pageW / 2, titleY, { align: 'center' });

    // Logo top-right, baseline-aligned with title
    const logo = await loadLogoDataUrl();
    if (logo) {
      const logoW = 22;
      const logoH = (logo.h / logo.w) * logoW;
      const logoX = pageW - margin - logoW;
      const logoY = titleY - logoH + 1; // baseline align with title
      try { doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH); } catch { /* noop */ }
    }

    const contentTop = margin + 14;
    const contentBottom = pageH - margin - 8;
    const columnCapacity = contentBottom - contentTop;

    // Pre-measure each group's rendered height (matches actual render below)
    const estRowH = 4.2;
    const headH = 5.5;
    const measureGroup = (g: typeof groups[number]) => {
      const sub = [
        g.header.grading_date ? formatDate(g.header.grading_date) : 'Unscheduled',
        g.header.start_time
          ? `${g.header.start_time.slice(0, 5)}${g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}`
          : null,
      ].filter(Boolean).join(' · ');
      const title = g.header.slot_title || sub || 'Grading';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const titleLines = doc.splitTextToSize(title, colW);
      const titleH = titleLines.length * 4;
      const tableH = headH + g.items.length * estRowH;
      // title (with offset) + table + spacing after
      return 3.5 + titleH + 1 + tableH + 4;
    };
    const heights = groups.map(measureGroup);

    // Partition groups into pages (no group split). For each page, find split index
    // that minimizes |sumLeft - sumRight| subject to both <= columnCapacity.
    type Page = { items: typeof groups; leftCount: number };
    const pages: Page[] = [];
    let idx = 0;
    while (idx < groups.length) {
      // Greedily grow the page while groups can still fit somewhere
      let end = idx;
      let leftBest = 0;
      let bestSplit = 1;
      // include at least one group
      while (end < groups.length) {
        const candidateEnd = end + 1;
        const slice = heights.slice(idx, candidateEnd);
        // try to find valid split for this slice
        let valid = false;
        let bestDiff = Infinity;
        let bestK = 1;
        let bestLeft = 0;
        const total = slice.reduce((a, c) => a + c, 0);
        let sumLeft = 0;
        for (let k = 1; k <= slice.length; k++) {
          sumLeft += slice[k - 1];
          const sumRight = total - sumLeft;
          if (sumLeft <= columnCapacity && sumRight <= columnCapacity) {
            const diff = Math.abs(sumLeft - sumRight);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestK = k;
              bestLeft = sumLeft;
              valid = true;
            }
          }
        }
        if (!valid) break; // can't fit candidateEnd groups on this page
        end = candidateEnd;
        bestSplit = bestK;
        leftBest = bestLeft;
      }
      if (end === idx) {
        // single group doesn't fit even in one column — fallback: place alone in left col
        end = idx + 1;
        bestSplit = 1;
      }
      pages.push({ items: groups.slice(idx, end), leftCount: bestSplit });
      idx = end;
    }

    const renderGroupAt = (g: typeof groups[number], x: number, y: number): number => {
      const sub = [
        g.header.grading_date ? formatDate(g.header.grading_date) : 'Unscheduled',
        g.header.start_time
          ? `${g.header.start_time.slice(0, 5)}${g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}`
          : null,
      ].filter(Boolean).join(' · ');
      const title = g.header.slot_title || sub || 'Grading';

      const body = g.items.map((r, i) => [
        String(i + 1),
        r.branch_name || '—',
        r.student_name,
        `${r.current_belt || '—'}${r.target_belt ? ` → ${r.target_belt}` : ''}`,
        r.paid_status,
      ]);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0);
      const titleLines = doc.splitTextToSize(title, colW);
      doc.text(titleLines, x, y + 3.5);
      y += titleLines.length * 4;

      autoTable(doc, {
        startY: y + 1,
        margin: { left: x, right: pageW - x - colW },
        tableWidth: colW,
        head: [['#', 'Branch', 'Student', 'Belt', 'Status']],
        body,
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold', halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 6 },
          1: { cellWidth: 18 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 22 },
          4: { cellWidth: 18 },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index === 1) {
            const c = branchColor(String(data.cell.raw ?? ''));
            data.cell.styles.fillColor = c.fill;
            data.cell.styles.textColor = c.text;
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 4) {
            const c = statusColor(String(data.cell.raw ?? ''));
            data.cell.styles.fillColor = c.fill;
            data.cell.styles.textColor = c.text;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // @ts-ignore lastAutoTable is attached by plugin
      return (doc as any).lastAutoTable.finalY + 4;
    };

    pages.forEach((page, pIdx) => {
      if (pIdx > 0) {
        doc.addPage();
        // Re-draw title + logo on subsequent pages
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(titleText, pageW / 2, titleY, { align: 'center' });
        if (logo) {
          const logoW = 22;
          const logoH = (logo.h / logo.w) * logoW;
          const logoX = pageW - margin - logoW;
          const logoY = titleY - logoH + 1;
          try { doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH); } catch { /* noop */ }
        }
      }
      const leftItems = page.items.slice(0, page.leftCount);
      const rightItems = page.items.slice(page.leftCount);
      let yL = contentTop;
      leftItems.forEach((g) => { yL = renderGroupAt(g, colX[0], yL); });
      let yR = contentTop;
      rightItems.forEach((g) => { yR = renderGroupAt(g, colX[1], yR); });
    });


    // Footers
    const totalPages = doc.getNumberOfPages();
    const generatedAt = `Generated ${formatDateTime(new Date())}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = pageH - 6;
      doc.text(`Page ${p} of ${totalPages}`, pageW / 2, footerY, { align: 'center' });
      doc.text(generatedAt, pageW - margin, footerY, { align: 'right' });
    }
    doc.setTextColor(0);

    const fname = `grading-list-${dateFilter === 'all' ? 'all' : dateFilter}.pdf`;
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.rel = 'noopener';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      try { doc.save(fname); } catch { /* noop */ }
      toast.error('Could not download PDF in this view');
    }
  };

  const handleDownloadSummaryPdf = async () => {
    if (groups.length === 0) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;

    const titleText = `GRADING SUMMARY FOR ${dateFilter === 'all' ? 'ALL DATES' : formatDate(dateFilter)}`;
    const titleY = margin + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(titleText, pageW / 2, titleY, { align: 'center' });

    const logo = await loadLogoDataUrl();
    if (logo) {
      const logoW = 22;
      const logoH = (logo.h / logo.w) * logoW;
      const logoX = pageW - margin - logoW;
      const logoY = titleY - logoH + 1;
      try { doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH); } catch { /* noop */ }
    }

    // Unique branches across filtered rows
    const branches = Array.from(
      new Set(filteredRows.map((r) => r.branch_name || '—'))
    ).sort((a, b) => a.localeCompare(b));

    // Table 1: students per slot by branch (exclude rejected)
    const slotHead = ['Slot', ...branches, 'Total'];
    const colTotals = new Array(branches.length).fill(0);
    const colAmounts = new Array(branches.length).fill(0);
    let grandTotalStudents = 0;
    let grandTotalAmount = 0;
    const isPaidOrVerified = (s: string | null | undefined) => {
      const v = (s || '').toLowerCase();
      return v === 'paid' || v === 'verified';
    };
    const slotBody = groups.map((g) => {
      const items = g.items.filter((r) => (r.paid_status || '').toLowerCase() !== 'rejected');
      const label = [
        g.header.slot_title || 'Grading',
        g.header.grading_date ? formatDate(g.header.grading_date) : null,
        g.header.start_time ? g.header.start_time.slice(0, 5) : null,
      ].filter(Boolean).join(' — ');
      const counts = branches.map((b) => items.filter((r) => (r.branch_name || '—') === b).length);
      const amounts = branches.map((b) =>
        items
          .filter((r) => (r.branch_name || '—') === b && isPaidOrVerified(r.paid_status))
          .reduce((s, r) => s + (Number(r.amount) || 0), 0)
      );
      counts.forEach((c, i) => { colTotals[i] += c; });
      amounts.forEach((a, i) => { colAmounts[i] += a; });
      const rowTotal = counts.reduce((s, n) => s + n, 0);
      const rowAmount = amounts.reduce((s, n) => s + n, 0);
      grandTotalStudents += rowTotal;
      grandTotalAmount += rowAmount;
      const cells = counts.map((c, i) => `${c}\n(${formatCurrency(amounts[i])})`);
      return [label, ...cells, `${rowTotal}\n(${formatCurrency(rowAmount)})`];
    });
    slotBody.push([
      'Total',
      ...colTotals.map((c, i) => `${c}\n(${formatCurrency(colAmounts[i])})`),
      `${grandTotalStudents}\n(${formatCurrency(grandTotalAmount)})`,
    ]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Students per slot by branch', margin, titleY + 10);

    autoTable(doc, {
      startY: titleY + 13,
      margin: { left: margin, right: margin },
      head: [slotHead],
      body: slotBody,
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index >= 1 && data.column.index <= branches.length) {
          const c = branchColor(branches[data.column.index - 1]);
          data.cell.styles.fillColor = c.fill;
          data.cell.styles.textColor = c.text;
        }
        if (data.section === 'body' && data.row.index === slotBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
    });

    // Table 2: amount collected by branch — subtotal (paid+verified), GST 9%, total, unverified
    let y2 = (doc as any).lastAutoTable.finalY + 10;
    const paidByBranch: Record<string, number> = {};
    const pendingByBranch: Record<string, number> = {};
    branches.forEach((b) => { paidByBranch[b] = 0; pendingByBranch[b] = 0; });
    for (const r of filteredRows) {
      const s = (r.paid_status || '').toLowerCase();
      const b = r.branch_name || '—';
      const amt = Number(r.amount) || 0;
      if (s === 'paid' || s === 'verified') {
        paidByBranch[b] = (paidByBranch[b] || 0) + amt;
      } else if (s === 'pending_verification' || s === 'pending verification') {
        pendingByBranch[b] = (pendingByBranch[b] || 0) + amt;
      }
    }
    const subtotals = branches.map((b) => paidByBranch[b] || 0);
    const gsts = subtotals.map((v) => v * 0.09);
    const totals = subtotals.map((v) => v * 1.09);
    const unverifieds = branches.map((b) => pendingByBranch[b] || 0);
    const sumOf = (arr: number[]) => arr.reduce((s, n) => s + n, 0);

    const amountHead = ['', ...branches, 'Total'];
    const fmtRow = (label: string, vals: number[]) => [
      label,
      ...vals.map((v) => formatCurrency(v)),
      formatCurrency(sumOf(vals)),
    ];
    const amountBody = [
      fmtRow('Subtotal (paid + verified)', subtotals),
      fmtRow('GST 9%', gsts),
      fmtRow('Total (incl. GST)', totals),
      fmtRow('Unverified (pending)', unverifieds),
    ];

    if (y2 + 40 > pageH - margin - 8) {
      doc.addPage();
      y2 = margin + 8;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Amount collected by branch', margin, y2);

    autoTable(doc, {
      startY: y2 + 3,
      margin: { left: margin, right: margin },
      head: [amountHead],
      body: amountBody,
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 'auto' } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index >= 1 && data.column.index <= branches.length) {
          const c = branchColor(branches[data.column.index - 1]);
          data.cell.styles.fillColor = c.fill;
          data.cell.styles.textColor = c.text;
        }
        if (data.section === 'body' && data.column.index === branches.length + 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
        if (data.section === 'body' && data.row.index === 2) {
          // Total (incl. GST) row emphasized
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // Footers
    const totalPages = doc.getNumberOfPages();
    const generatedAt = `Generated ${formatDateTime(new Date())}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const footerY = pageH - 6;
      doc.text(`Page ${p} of ${totalPages}`, pageW / 2, footerY, { align: 'center' });
      doc.text(generatedAt, pageW - margin, footerY, { align: 'right' });
    }
    doc.setTextColor(0);

    const fname = `grading-summary-${dateFilter === 'all' ? 'all' : dateFilter}.pdf`;
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      a.rel = 'noopener';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      try { doc.save(fname); } catch { /* noop */ }
      toast.error('Could not download PDF in this view');
    }
  };

  // ---- Certificate download (inline + bulk) -------------------------------
  const rowCertKey = (r: PublicGradingListRow): string =>
    `${r.source}:${r.registration_id ?? r.submission_id ?? `${r.student_name}|${r.grading_date ?? ''}|${r.current_belt ?? ''}`}`;

  const resolveCertName = (r: PublicGradingListRow): string => {
    const fromOverride = (r.certificate_name || '').trim();
    if (fromOverride) return fromOverride;
    const composed = `${r.first_name || ''} ${r.last_name || ''}`.trim();
    if (composed) return composed;
    return r.student_name || '';
  };

  const rowToCertInput = (
    r: PublicGradingListRow,
    beltOverride?: string | null,
  ): GradingCertificateInput | null => {
    const belt = beltOverride ?? r.current_belt ?? r.student_current_belt;
    if (!r.grading_date || !belt) return null;
    return {
      studentName: resolveCertName(r),
      beltAchieved: belt,
      gradingDate: r.grading_date,
      scorecard: [],
      branchCountry: r.branch_country ?? null,
    };
  };

  const certFilename = (r: PublicGradingListRow, beltOverride?: string | null): string => {
    const safeName = (resolveCertName(r) || 'Student').replace(/[^\w\-]+/g, '_');
    const belt = beltOverride ?? r.current_belt ?? r.student_current_belt ?? 'Belt';
    const safeBelt = belt.replace(/[^\w\-]+/g, '_');
    const dateStr = (r.grading_date || '').replace(/-/g, '');
    return `Certificate_${safeName}_${safeBelt}_${dateStr}.pdf`;
  };


  const handleDownloadCertificate = (r: PublicGradingListRow, beltOverride?: string | null) => {
    const input = rowToCertInput(r, beltOverride);
    if (!input) {
      toast.error('Missing grading date or belt — cannot generate certificate');
      return;
    }
    try {
      downloadGradingCertificatePDF(input, certFilename(r, beltOverride));
      toast.success('Certificate generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate certificate');
    }
  };

  const NON_CERT_TITLE_KEYWORDS = [
    'stage 1 - 3',
    'stage 4 - 10',
    'stage 11-26',
    'stage 11 - 26',
    'provisional pass confirmation',
  ];

  const isCertEligible = (r: PublicGradingListRow): boolean => {
    if (!r.grading_date || !r.current_belt) return false;
    if (r.result !== 'pass' && r.result !== 'double') return false;
    const title = (r.slot_title ?? '').trim().toLowerCase();
    if (NON_CERT_TITLE_KEYWORDS.some((kw) => title.includes(kw))) return false;
    return true;
  };

  const toggleCert = (r: PublicGradingListRow) => {
    const key = rowCertKey(r);
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Checkbox: every row in edit mode is selectable.
  const allSelectedInSlot = (items: PublicGradingListRow[]) =>
    items.length > 0 && items.every((r) => selectedCerts.has(rowCertKey(r)));

  const toggleSlotAll = (items: PublicGradingListRow[]) => {
    const allSel = allSelectedInSlot(items);
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      for (const r of items) {
        const k = rowCertKey(r);
        if (allSel) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };


  const selectedRows = useMemo(() => {
    const out: PublicGradingListRow[] = [];
    for (const g of groups) {
      for (const r of g.items) {
        if (selectedCerts.has(rowCertKey(r))) out.push(r);
      }
    }
    return out;
  }, [groups, selectedCerts]);

  // Common date across mass-edit selection (for slot options)
  const massCommonDate = useMemo(() => {
    const dates = new Set<string>();
    for (const r of selectedRows) if (r.grading_date) dates.add(r.grading_date);
    return dates.size === 1 ? Array.from(dates)[0] : '';
  }, [selectedRows]);

  const { data: massEditSlots = [] } = useQuery({
    queryKey: ['public-grading-slots-by-date', massCommonDate],
    queryFn: () =>
      massCommonDate
        ? getPublicGradingSlotsByDate(massCommonDate)
        : Promise.resolve([] as PublicGradingSlotByDate[]),
    enabled: massEditOpen && !!massCommonDate,
  });

  const handleDownloadSelectedCertificates = async () => {
    const inputs: GradingCertificateInput[] = [];
    let skipped = 0;
    for (const r of selectedRows) {
      if (!isCertEligible(r)) { skipped++; continue; }
      const inp = rowToCertInput(r);
      if (inp) inputs.push(inp);
      else { skipped++; continue; }
      if (r.result === 'double' && r.target_belt) {
        const next = getNextBeltLevel(r.target_belt);
        if (next) {
          const inp2 = rowToCertInput(r, next);
          if (inp2) inputs.push(inp2);
        }
      }
    }

    if (inputs.length === 0) {
      toast.error('No eligible rows selected');
      return;
    }
    const toastId = 'bulk-cert';
    toast.loading(`Generating certificates… 0 / ${inputs.length} (0%)`, { id: toastId });
    try {
      const doc = await generateBulkGradingCertificatesPDFAsync(inputs, (done, total) => {
        const pct = Math.round((done / total) * 100);
        toast.loading(`Generating certificates… ${done} / ${total} (${pct}%)`, { id: toastId });
      });
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      doc.save(`Certificates_Bulk_${stamp}.pdf`);
      toast.success(`Generated ${inputs.length} certificate${inputs.length > 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}`, { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate certificates', { id: toastId });
    }
  };

  if (unlockLevel === 'none') {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">Restricted area</h1>
              <p className="text-sm text-muted-foreground">Enter password to continue.</p>
            </div>
            <Input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Password"
              autoFocus
            />
            <Button className="w-full" onClick={handleUnlock}>Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleLock}
            title="Lock"
          >
            <Lock className="h-4 w-4" />
          </Button>
        </div>
        <Tabs defaultValue="grading" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="grading">Grading</TabsTrigger>
            <TabsTrigger value="competitions">Competitions</TabsTrigger>
            <TabsTrigger value="seminars">Seminars</TabsTrigger>
            <TabsTrigger value="guards">Guards</TabsTrigger>
          </TabsList>
          <TabsContent value="grading" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">Grading List</h1>
            </div>



        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1 min-w-[140px]">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {dateOptions.map((d) => (
                  <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="flex-1 min-w-[140px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDownloadPdf}
              disabled={isLoading || groups.length === 0}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={handleDownloadSummaryPdf}
                disabled={isLoading || groups.length === 0}
                title="Download Summary PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {editMode && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadSelectedCertificates}
                  disabled={selectedRows.length === 0}
                  title="Download selected certificates"
                  className="gap-1"
                >
                  <Award className="h-4 w-4" />
                  <span className="text-xs">Certificates ({selectedRows.length})</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openMassEdit}
                  disabled={selectedRows.length === 0}
                  title="Mass edit selected rows"
                  className="gap-1"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="text-xs">Edit ({selectedRows.length})</span>
                </Button>
              </>
            )}

          </CardContent>
        </Card>

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading...</p>
        )}

        {!isLoading && groups.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No grading registrations found.
            </CardContent>
          </Card>
        )}

        {groups.map((g, idx) => {
          const subtitle = [
            g.header.grading_date ? formatDate(g.header.grading_date) : 'Unscheduled',
            g.header.start_time
              ? `${g.header.start_time.slice(0, 5)}${g.header.end_time ? `–${g.header.end_time.slice(0, 5)}` : ''}`
              : null,
          ].filter(Boolean).join(' · ');
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <div className="font-semibold">
                    {g.header.slot_title || subtitle || 'Grading'}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {editMode && (
                        <TableHead className="h-7 w-8 px-2">
                          <Checkbox
                            checked={allSelectedInSlot(g.items)}
                            onCheckedChange={() => toggleSlotAll(g.items)}
                            aria-label="Select all in slot"
                          />
                        </TableHead>
                      )}
                      <TableHead className="h-7 w-8 px-2 text-xs">#</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Branch</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Student</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Belt</TableHead>
                      <TableHead className="h-7 px-2 text-[11px]">Status</TableHead>
                      {editMode && (
                        <>
                          <TableHead className="h-7 px-2 text-[11px] text-right">Amount</TableHead>
                          <TableHead className="h-7 px-2 text-[11px]">Proof</TableHead>
                          <TableHead className="h-7 px-2 text-[11px]">Result</TableHead>
                          <TableHead className="h-7 px-2 text-[11px]">Remark</TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-8"></TableHead>
                          <TableHead className="h-7 px-2 text-[11px] w-16"></TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((r, i) => (
                      <TableRow key={i} className="odd:bg-muted/40">
                        {editMode && (
                          <TableCell className="px-2 py-0.5">
                            <Checkbox
                              checked={selectedCerts.has(rowCertKey(r))}
                              onCheckedChange={() => toggleCert(r)}
                              aria-label="Select row"
                            />
                          </TableCell>
                        )}

                        <TableCell className="px-2 py-0.5 text-[11px] tabular-nums whitespace-nowrap">{i + 1}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px]">{r.branch_name || '—'}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px] font-medium">{r.student_name}</TableCell>
                        <TableCell className="px-2 py-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                          {r.current_belt || '—'}{r.target_belt ? ` → ${r.target_belt}` : ''}
                        </TableCell>
                        <TableCell className="px-2 py-0.5">
                          <Badge variant="outline" className={`${statusVariant(r.paid_status)} text-[10px] px-1.5 py-0 whitespace-nowrap`}>
                            {r.paid_status}
                          </Badge>
                        </TableCell>
                        {editMode && (
                          <>
                            <TableCell className="px-2 py-0.5 text-[11px] tabular-nums whitespace-nowrap text-right">
                              {r.amount != null ? `$${(Number(r.amount) * 1.09).toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.proof_url ? (
                                <button
                                  type="button"
                                  onClick={() => openLightbox(r.proof_url!)}
                                  className="block"
                                  title="Click to enlarge"
                                >
                                  <SignedImage
                                    src={r.proof_url}
                                    alt="Proof"
                                    className="h-8 w-8 object-cover rounded border cursor-zoom-in hover:opacity-80"
                                    fallback={<span className="text-muted-foreground text-xs">—</span>}
                                  />
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {(r.registration_id || r.submission_id) ? (
                                <Select
                                  value={r.result ?? ''}
                                  onValueChange={(v) => handleResultChange(r, v)}
                                  disabled={!(unlockLevel === 'full' || isWithinResultWindow(r.grading_date))}
                                >
                                  <SelectTrigger className="h-7 w-[88px] text-[11px] px-1.5">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="double">Double</SelectItem>
                                    <SelectItem value="pass">Pass</SelectItem>
                                    <SelectItem value="fail">Fail</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="__clear__">—</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {(r.registration_id || r.submission_id) ? (
                                <Select
                                  value={r.remark ?? ''}
                                  onValueChange={(v) => handleRemarkChange(r, v)}
                                >
                                  <SelectTrigger className="h-7 w-[140px] text-[11px] px-1.5">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REMARK_OPTIONS.map((o) => (
                                      <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                    <SelectItem value="__clear__">—</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && r.paid_status === 'pending verification' && (
                                <button
                                  type="button"
                                  onClick={() => handleVerify(r)}
                                  disabled={busyId === r.submission_id}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Verify payment"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {r.source === 'submission' && r.paid_status === 'pending verification' && (
                                <button
                                  type="button"
                                  onClick={() => setRejectRow(r)}
                                  disabled={busyId === r.submission_id}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Reject submission"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              <button
                                type="button"
                                onClick={() => openRowEdit(r)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Edit row"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>

                            <TableCell className="px-2 py-0.5">
                              {canDelete && (r.source === 'submission' ? r.submission_id : r.registration_id) && (
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete({
                                    kind: 'grading',
                                    source: r.source as 'submission' | 'registration',
                                    id: (r.source === 'submission' ? r.submission_id : r.registration_id) as string,
                                    studentName: r.student_name || '',
                                  })}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-0.5">
                              {isCertEligible(r) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadCertificate(r)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title={`Download certificate (${r.current_belt}${r.target_belt ? ` → ${r.target_belt}` : ''})`}
                                  >
                                    <Award className="h-3.5 w-3.5" />
                                  </button>
                                  {r.result === 'double' && r.target_belt && (() => {
                                    const next = getNextBeltLevel(r.target_belt);
                                    return next ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadCertificate(r, next)}
                                        className="text-muted-foreground hover:text-foreground"
                                        title={`Download certificate (${r.target_belt} → ${next})`}
                                      >
                                        <Award className="h-3.5 w-3.5" />
                                      </button>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
          </TabsContent>
          <TabsContent value="competitions" className="mt-4">
            <CompetitionsTab
              branchFilter={branchFilter}
              canDelete={canDelete}
              canEdit={editMode}
              verifiedBy={user?.employeeId || user?.email || 'system'}
              onRequestDelete={(id, name) => setPendingDelete({ kind: 'competition', id, studentName: name })}
            />
          </TabsContent>
          <TabsContent value="seminars" className="mt-4">
            <SeminarsTab
              branchFilter={branchFilter}
              canEdit={editMode}
              canDelete={canDelete}
              onRequestDelete={(id, name) => setPendingDelete({ kind: 'seminar', id, studentName: name })}
            />
          </TabsContent>
          <TabsContent value="guards" className="mt-4">
            <PublicGuardsPurchaseList
              embedded
              canDelete={canDelete}
              onRequestDelete={(id, name) => setPendingDelete({ kind: 'guards', id, studentName: name })}
            />
          </TabsContent>
        </Tabs>
      </div>


      {/* Slot edit dialog */}
      <Dialog open={!!slotEditRow} onOpenChange={(o) => !o && setSlotEditRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update slot</DialogTitle>
            <DialogDescription>{slotEditRow?.student_name}</DialogDescription>
          </DialogHeader>
          <Select value={slotChoice} onValueChange={setSlotChoice}>
            <SelectTrigger>
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent>
              {editableSlots.map((s) => {
                const fallback = `${formatDate(s.grading_date)} ${s.start_time?.slice(0, 5) || ''} · ${s.branch_name}`;
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title || fallback}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotEditRow(null)}>Cancel</Button>
            <Button onClick={handleSlotSave} disabled={!slotChoice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified delete confirm (grading + competition + guards) */}
      <DeleteRowConfirmDialog
        pending={pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onConfirm={handlePendingDelete}
        loading={deleting}
      />

      {/* Proof lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => { if (!o) { setLightboxUrl(null); setLightboxRotation(0); } }}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle className="sr-only">Payment proof</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {lightboxUrl && (
            <div className="flex items-center justify-center overflow-hidden">
              <img
                src={lightboxUrl}
                alt="Payment proof"
                className="max-w-full max-h-[80vh] h-auto rounded transition-transform"
                style={{ transform: `rotate(${lightboxRotation}deg)` }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject submission?</DialogTitle>
            <DialogDescription>{rejectRow?.student_name}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === rejectRow?.submission_id}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row edit dialog (registrations + submissions) */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editRow?.source === 'registration' ? 'registration' : 'submission'}</DialogTitle>
            <DialogDescription className="truncate">{editRow?.student_name}</DialogDescription>
          </DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Display name (this {editRow.source} only)</label>
                  <Input
                    value={editForm.display_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                    placeholder="Display name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Certificate name (saved to student)</label>
                  <Input
                    value={editForm.certificate_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, certificate_name: e.target.value }))}
                    placeholder={
                      (editRow.first_name || editRow.last_name)
                        ? `${editRow.first_name || ''} ${editRow.last_name || ''}`.trim()
                        : (editRow.student_name || 'Certificate name')
                    }
                    disabled={!editRow.student_id}
                  />
                  {!editRow.student_id && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">No matched student — cannot save certificate name.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Branch</label>
                  <Select value={editForm.branch_id} onValueChange={(v) => setEditForm((f) => ({ ...f, branch_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {publicBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Result</label>
                  <Select
                    value={editForm.result}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, result: v === '__clear__' ? '' : v }))}
                    disabled={!(unlockLevel === 'full' || isWithinResultWindow(editRow?.grading_date))}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="__clear__">—</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Remark</label>
                  <Select
                    value={editForm.remark}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, remark: v === '__clear__' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {REMARK_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                      <SelectItem value="__clear__">—</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
              <div>
                <label className="text-xs text-muted-foreground">Slot</label>
                <Select value={editForm.slot_id} onValueChange={(v) => setEditForm((f) => ({ ...f, slot_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                  <SelectContent>
                    {editRowSlots.map((s) => {
                      const fallback = `${formatDate(s.grading_date)} ${s.start_time?.slice(0, 5) || ''} · ${s.branch_name}`;
                      return (
                        <SelectItem key={s.id} value={s.id}>{s.title || fallback}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleRowEditSave} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass edit dialog */}
      <Dialog open={massEditOpen} onOpenChange={setMassEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mass edit ({selectedRows.length})</DialogTitle>
            <DialogDescription>Toggle fields to apply changes to all selected rows.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={massForm.changeResult}
                  onCheckedChange={(v) => setMassForm((f) => ({ ...f, changeResult: !!v }))}
                />
                Result
              </label>
              {massForm.changeResult && (
                <Select value={massForm.result} onValueChange={(v) => setMassForm((f) => ({ ...f, result: v === '__clear__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="__clear__">—</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={massForm.changeSlot}
                  onCheckedChange={(v) => setMassForm((f) => ({ ...f, changeSlot: !!v }))}
                />
                Slot
              </label>
              {massForm.changeSlot && (
                <Select value={massForm.slot_id} onValueChange={(v) => setMassForm((f) => ({ ...f, slot_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                  <SelectContent>
                    {massCommonDate ? (
                      massEditSlots.map((s) => {
                        const fallback = `${formatDate(s.grading_date)} ${s.start_time?.slice(0, 5) || ''} · ${s.branch_name}`;
                        return (
                          <SelectItem key={s.id} value={s.id}>{s.title || fallback}</SelectItem>
                        );
                      })
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Select rows with the same date.</div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={massForm.changeBranch}
                  onCheckedChange={(v) => setMassForm((f) => ({ ...f, changeBranch: !!v }))}
                />
                Branch
              </label>
              {massForm.changeBranch && (
                <Select value={massForm.branch_id} onValueChange={(v) => setMassForm((f) => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {publicBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={massForm.changeRemark}
                  onCheckedChange={(v) => setMassForm((f) => ({ ...f, changeRemark: !!v }))}
                />
                Remark
              </label>
              {massForm.changeRemark && (
                <Select value={massForm.remark} onValueChange={(v) => setMassForm((f) => ({ ...f, remark: v === '__clear__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {REMARK_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                    <SelectItem value="__clear__">—</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMassEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMassEditApply}
              disabled={
                savingMass ||
                (!massForm.changeResult && !massForm.changeSlot && !massForm.changeBranch && !massForm.changeRemark)
              }
            >
              {savingMass ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const POOMSAE_OPTIONS = [
  'Introductory Poomsae',
  'Preliminary Poomsae',
  'Taegeuk 1',
  'Taegeuk 2',
  'Taegeuk 3',
  'Taegeuk 4',
  'Taegeuk 5',
  'Taegeuk 6',
  'Taegeuk 7',
  'Taegeuk 8',
  'Koryo',
  'Keumgang',
  'Taebaek',
  'Pyongwon',
  'Sipjin',
  'Jitae',
  'Chonkwon',
  'Hansu',
];

const POOMSAE_CLEAR = '__clear__';

const CompetitionsTab: React.FC<{
  branchFilter: string;
  canDelete?: boolean;
  canEdit?: boolean;
  verifiedBy: string;
  onRequestDelete?: (id: string, studentName: string) => void;
}> = ({ branchFilter, canDelete, canEdit, verifiedBy, onRequestDelete }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['public-competition-list', 'v2-dob', branchFilter],
    queryFn: () => getPublicCompetitionList(branchFilter === 'all' ? null : branchFilter),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['competition-events-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competition_events')
        .select('id, name, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Sort: active events first (newest active = "current"), then inactive by newest
  const sortedEvents = React.useMemo(() => {
    const active = (events as any[]).filter((e) => e.is_active);
    const inactive = (events as any[]).filter((e) => !e.is_active);
    return [...active, ...inactive];
  }, [events]);

  const [eventFilter, setEventFilter] = useState<string>('');
  const [localBranchFilter, setLocalBranchFilter] = useState<string>('all');
  useEffect(() => {
    if (!eventFilter && sortedEvents.length > 0) {
      setEventFilter(sortedEvents[0].id);
    }
  }, [sortedEvents, eventFilter]);

  const branchOptionsLocal = React.useMemo(() => {
    const set = new Set<string>();
    (rows as PublicCompetitionListRow[]).forEach((r) => {
      if (r.branch_name) set.add(r.branch_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const { data: branchesForColor = [] } = useQuery({
    queryKey: ['branches-for-competition-color'],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });
  const branchColorMap = React.useMemo(() => {
    const m = new Map<string, string>();
    branchesForColor.forEach((b: any) => {
      m.set(b.id, convertTailwindColorToHex(b.color || '#6b7280'));
    });
    return m;
  }, [branchesForColor]);

  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [gradingCardDialog, setGradingCardDialog] = useState<{ row: PublicCompetitionListRow; pendingVerify: boolean } | null>(null);

  const gradingCardRequiredAndMissing = (r: PublicCompetitionListRow): boolean => {
    return r.require_grading_card === true
      && isFoundationToBlackTip(r.current_belt)
      && (!r.grading_card_urls || r.grading_card_urls.length === 0);
  };

  const doVerify = async (submissionId: string) => {
    setVerifyingId(submissionId);
    try {
      await verifyCompetitionSubmission(submissionId, verifiedBy);
      toast.success('Marked as verified');
      qc.invalidateQueries({ queryKey: ['public-competition-list'] });
      qc.invalidateQueries({ queryKey: ['pending-competition-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-competition-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerify = async (submissionId: string) => {
    const r = (rows as PublicCompetitionListRow[]).find(x => x.submission_id === submissionId);
    if (r && gradingCardRequiredAndMissing(r)) {
      setGradingCardDialog({ row: r, pendingVerify: true });
      return;
    }
    await doVerify(submissionId);
  };



  const handleReject = async () => {
    if (!rejectingId) return;
    setBusy(true);
    try {
      await rejectCompetitionSubmission(rejectingId, rejectReason.trim() || 'Rejected', verifiedBy);
      toast.success('Submission rejected');
      setRejectingId(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['public-competition-list'] });
      qc.invalidateQueries({ queryKey: ['pending-competition-submissions'] });
      qc.invalidateQueries({ queryKey: ['pending-competition-submissions-count'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };

  const poomsaeMutation = useMutation({
    mutationFn: ({ id, p1, p2 }: { id: string; p1: string | null; p2: string | null }) =>
      updateCompetitionPoomsae(id, p1, p2),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-competition-list'] });
      toast.success('Poomsae updated');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update poomsae'),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { competition_at?: string | null; reporting_at?: string | null; court?: string | null } }) =>
      updateCompetitionSchedule(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-competition-list'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  // Convert ISO timestamp <-> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  const toLocalInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const fromLocalInput = (s: string): string | null => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const DateTimeCell: React.FC<{
    id: string;
    field: 'competition_at' | 'reporting_at';
    value: string | null;
  }> = ({ id, field, value }) => {
    const initial = toLocalInput(value);
    const [local, setLocal] = useState(initial);
    useEffect(() => { setLocal(toLocalInput(value)); }, [value]);
    return (
      <Input
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = fromLocalInput(local);
          if (next === value) return;
          const patch: { competition_at?: string | null; reporting_at?: string | null } = { [field]: next };
          if (field === 'competition_at') {
            // Always recalculate reporting = competition - 1h30m (null if cleared)
            patch.reporting_at = next
              ? new Date(new Date(next).getTime() - 90 * 60 * 1000).toISOString()
              : null;
          }
          scheduleMutation.mutate({ id, patch });
        }}
        className="h-7 text-[11px] w-[150px] px-1"
      />
    );
  };

  const CourtCell: React.FC<{ id: string; value: string | null }> = ({ id, value }) => {
    const [local, setLocal] = useState(value ?? '');
    useEffect(() => { setLocal(value ?? ''); }, [value]);
    return (
      <Input
        value={local}
        maxLength={4}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = local.trim() === '' ? null : local.trim();
          if ((next ?? '') === (value ?? '')) return;
          scheduleMutation.mutate({ id, patch: { court: next } });
        }}
        placeholder="—"
        className="h-7 text-[11px] w-[42px] px-1"
      />
    );
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No competition registrations yet.</div>;

  const renderPoomsae = (value: string | null, onChange: (v: string | null) => void) => (
    <Select
      value={value ?? ''}
      onValueChange={(v) => onChange(v === POOMSAE_CLEAR ? null : v)}
    >
      <SelectTrigger className="h-7 text-[11px] min-w-[112px] w-[112px]">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={POOMSAE_CLEAR}>—</SelectItem>
        {POOMSAE_OPTIONS.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const Thumb: React.FC<{ url: string | null; title: string }> = ({ url, title }) => {
    if (!url) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <button
        type="button"
        onClick={() => setPreview({ url, title })}
        className="block"
        title="Click to view"
      >
        <SignedImage
          src={url}
          className="h-10 w-10 object-cover rounded border cursor-pointer hover:opacity-80"
          alt={title}
          fallback={<span className="text-xs text-muted-foreground">…</span>}
        />
      </button>
    );
  };

  const handlePrintPdf = () => {
    const eventName =
      eventFilter && eventFilter !== 'all'
        ? sortedEvents.find((e: any) => e.id === eventFilter)?.name || 'All events'
        : 'All events';
    const branchLabel = localBranchFilter === 'all' ? 'All branches' : localBranchFilter;
    const printRows = [...(rows as PublicCompetitionListRow[])]
      .filter((r) => eventFilter === 'all' || !eventFilter || r.event_id === eventFilter)
      .filter((r) => localBranchFilter === 'all' || (r.branch_name || '') === localBranchFilter)
      .sort((a, b) => {
        const ta = a.competition_at ? new Date(a.competition_at).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.competition_at ? new Date(b.competition_at).getTime() : Number.POSITIVE_INFINITY;
        if (ta !== tb) return ta - tb;
        return (a.student_name || '').localeCompare(b.student_name || '', undefined, { sensitivity: 'base' });
      })
      .flatMap((r) => {
        const productCats = r.category_names && r.category_names.length > 0 ? r.category_names : [];
        const extraCats = (r as any).extra_categories && (r as any).extra_categories.length > 0 ? (r as any).extra_categories as string[] : [];
        const merged = productCats.length > 0 ? productCats : extraCats;
        const cats = merged.length > 0 ? merged : [''];
        return cats.map((cat) => ({
          branch_name: r.branch_name,
          student_name: r.student_name,
          current_belt: r.current_belt,
          category: cat || null,
          poomsae_1: r.poomsae_1,
          poomsae_2: r.poomsae_2,
          competition_at: r.competition_at,
          reporting_at: r.reporting_at,
          court: r.court,
        }));
      });
    generateCompetitionPrintPDF({ rows: printRows, eventName, branchName: branchLabel });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold">Competitions</h2>
          {sortedEvents.length > 0 && (
            <Select value={eventFilter || 'all'} onValueChange={setEventFilter}>
              <SelectTrigger className="h-8 text-xs w-[220px]">
                <SelectValue placeholder="Filter event" />
              </SelectTrigger>
              <SelectContent>
                {sortedEvents.map((e: any) => (
                  <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
                ))}
                <SelectItem value="all" className="text-xs">All events</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={localBranchFilter} onValueChange={setLocalBranchFilter}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All branches</SelectItem>
              {branchOptionsLocal.map((b) => (
                <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintPdf} disabled={rows.length === 0}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-3.5 w-3.5 mr-1" /> Events
            </Button>
          )}
        </div>
      </div>

      <CompetitionEventsSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-7 px-2 text-[11px]">Competition</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Reporting</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Court</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Branch</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Student</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Age</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Belt</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Categories</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Status</TableHead>
              <TableHead className="h-7 px-2 text-[11px] text-right">Amount</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Poomsae 1</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Poomsae 2</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Cert</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Grading Card</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Proof</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Docs</TableHead>
              <TableHead className="h-7 px-2 text-[11px]">Actions</TableHead>
              {canDelete && <TableHead className="h-7 px-2 text-[11px] w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...(rows as PublicCompetitionListRow[])]
              .filter((r) => eventFilter === 'all' || !eventFilter || r.event_id === eventFilter)
              .filter((r) => localBranchFilter === 'all' || (r.branch_name || '') === localBranchFilter)
              .sort((a, b) => {
                const ta = a.competition_at ? new Date(a.competition_at).getTime() : Number.POSITIVE_INFINITY;
                const tb = b.competition_at ? new Date(b.competition_at).getTime() : Number.POSITIVE_INFINITY;
                if (ta !== tb) return ta - tb;
                return (a.student_name || '').localeCompare(b.student_name || '', undefined, { sensitivity: 'base' });
              })
              .flatMap((r) => {
                const productCats = r.category_names && r.category_names.length > 0 ? r.category_names : [];
                const extraCats = (r as any).extra_categories && (r as any).extra_categories.length > 0 ? (r as any).extra_categories as string[] : [];
                const merged = productCats.length > 0 ? productCats : extraCats;
                const cats = merged.length > 0 ? merged : [''];
                return cats.map((cat, idx) => (
              <TableRow key={`${r.submission_id}__${idx}`}>
                <TableCell className="text-xs px-2 py-1">{r.event_name || '—'}</TableCell>
                <TableCell className="px-2 py-1">
                  <DateTimeCell id={r.submission_id} field="competition_at" value={r.competition_at} />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <DateTimeCell id={r.submission_id} field="reporting_at" value={r.reporting_at} />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <CourtCell id={r.submission_id} value={r.court} />
                </TableCell>
                <TableCell className="text-xs px-2 py-1">{r.branch_name || '—'}</TableCell>
                <TableCell className="text-xs px-2 py-1 font-medium">
                  <div>{r.student_name}</div>
                  {r.gender && (
                    <div className="text-[10px] uppercase text-muted-foreground">{r.gender}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs px-2 py-1 tabular-nums">
                  {(() => {
                    const dob = r.date_of_birth;
                    if (!dob) return '—';
                    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob));
                    if (!m) return '—';
                    const y = parseInt(m[1], 10);
                    if (!y) return '—';
                    return new Date().getFullYear() - y;
                  })()}
                </TableCell>
                <TableCell className="text-xs px-2 py-1">{r.current_belt || '—'}</TableCell>
                <TableCell className="text-xs px-2 py-1">
                  <div className="text-[11px] leading-tight whitespace-nowrap">
                    {cat ? cat.replace(/Singapore Open Poomsae — Category: /, '') : '—'}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Badge className={statusVariant(r.paid_status)}>{r.paid_status}</Badge>
                </TableCell>
                <TableCell className="text-xs px-2 py-1 text-right">
                  {r.amount != null ? formatCurrency(Number(r.amount)) : '—'}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {renderPoomsae(r.poomsae_1, (v) =>
                    poomsaeMutation.mutate({ id: r.submission_id, p1: v, p2: r.poomsae_2 }),
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {renderPoomsae(r.poomsae_2, (v) =>
                    poomsaeMutation.mutate({ id: r.submission_id, p1: r.poomsae_1, p2: v }),
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Thumb url={r.certificate_url} title={`${r.student_name} — Certificate`} />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Thumb url={r.proof_url} title={`${r.student_name} — Payment Proof`} />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    {r.signature_url ? (
                      <button type="button" title="Signature" onClick={() => setPreview({ url: r.signature_url!, title: `${r.student_name} — Signature` })} className="text-green-700">
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {r.indemnity_form_url ? (
                      <button type="button" title="Indemnity form" onClick={() => setPreview({ url: r.indemnity_form_url!, title: `${r.student_name} — Indemnity` })} className="text-green-700">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {r.passport_url ? (
                      <button type="button" title="Passport" onClick={() => setPreview({ url: r.passport_url!, title: `${r.student_name} — Passport` })} className="text-green-700">
                        <IdCard className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {r.photo_url ? (
                      <button type="button" title="Photo" onClick={() => setPreview({ url: r.photo_url!, title: `${r.student_name} — Photo` })} className="text-green-700">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {r.require_grading_card && isFoundationToBlackTip(r.current_belt) ? (
                      r.grading_card_urls && r.grading_card_urls.length > 0 ? (
                        <button
                          type="button"
                          title={`Grading card (${r.grading_card_urls.length}) — click to add more`}
                          onClick={() => setGradingCardDialog({ row: r, pendingVerify: false })}
                          className="text-green-700 relative"
                        >
                          <IdCard className="h-3.5 w-3.5" />
                          <span className="absolute -top-1 -right-1 text-[8px] leading-none bg-green-600 text-white rounded-full px-0.5">
                            {r.grading_card_urls.length}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Grading card required — click to upload"
                          onClick={() => setGradingCardDialog({ row: r, pendingVerify: false })}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <IdCard className="h-3.5 w-3.5" />
                          <AlertTriangle className="h-2.5 w-2.5 -ml-1 -mt-2 inline" />
                        </button>
                      )
                    ) : null}
                    {!r.signature_url && !r.indemnity_form_url && !r.passport_url && !r.photo_url && !(r.require_grading_card && isFoundationToBlackTip(r.current_belt)) && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingId(r.submission_id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit submission"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {r.paid_status === 'pending verification' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerify(r.submission_id)}
                          disabled={verifyingId === r.submission_id}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Verify"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectingId(r.submission_id); setRejectReason(''); }}
                          className="text-red-600 hover:text-red-800"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    ) : !canEdit ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </TableCell>

                {canDelete && (
                  <TableCell className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => onRequestDelete?.(r.submission_id, r.student_name)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
                ));
              })}
          </TableBody>
        </Table>
      </div>




      {/* Reject dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(o) => { if (!o) { setRejectingId(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject submission</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={busy}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) { setPreview(null); setPreviewRotation(0); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle className="text-sm">{preview?.title}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
              title="Rotate 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {preview && (
            <div className="flex items-center justify-center overflow-hidden">
              <SignedImage
                src={preview.url}
                className="max-w-full max-h-[80vh] h-auto object-contain rounded transition-transform"
                alt={preview.title}
                style={{ transform: `rotate(${previewRotation}deg)` }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditCompetitionSubmissionDialog
        submissionId={editingId}
        onClose={() => setEditingId(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['public-competition-list'] })}
      />

      <GradingCardUploadDialog
        open={!!gradingCardDialog}
        onOpenChange={(o) => { if (!o) setGradingCardDialog(null); }}
        submissionId={gradingCardDialog?.row.submission_id || null}
        studentName={gradingCardDialog?.row.student_name}
        existingUrls={gradingCardDialog?.row.grading_card_urls || []}
        pendingVerify={gradingCardDialog?.pendingVerify || false}
        onUploaded={() => qc.invalidateQueries({ queryKey: ['public-competition-list'] })}
        onVerifyAfter={async () => {
          if (gradingCardDialog) await doVerify(gradingCardDialog.row.submission_id);
        }}
      />
    </div>
  );
};


export default PublicGradingList;
