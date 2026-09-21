/**
 * Add Student dialog for the /access Students tab.
 * Creates the student immediately, with a duplicate confirmation step.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getPublicBranches } from '@/services/gradingPaymentSubmissionService';
import { createStudentPublic } from '@/services/studentDirectoryService';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';
import { isBlockedEmail, BLOCKED_EMAIL_MESSAGE } from '@/utils/blockedEmails';
import { toISODate } from '@/utils/dateFormat';

const BELT_OPTIONS = [...new Set(BELT_LEVELS_ARRAY)];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface AddStudentInitialValues {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  branchId?: string | null;
  belt?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actor: string;
  onCreated: (studentId?: string) => void;
  initialValues?: AddStudentInitialValues;
}

const AddStudentDialog: React.FC<Props> = ({ open, onOpenChange, actor, onCreated, initialValues }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [belt, setBelt] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches'],
    queryFn: getPublicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 1950; y--) arr.push(y);
    return arr;
  }, [currentYear]);
  const daysInMonth = useMemo(() => {
    const m = month === '' ? 0 : parseInt(month);
    const y = year === '' ? 2000 : parseInt(year);
    return new Date(y, m + 1, 0).getDate();
  }, [month, year]);

  const dobIso = useMemo(() => {
    if (!day || month === '' || !year) return null;
    const d = Math.min(parseInt(day), new Date(parseInt(year), parseInt(month) + 1, 0).getDate());
    return toISODate(new Date(parseInt(year), parseInt(month), d));
  }, [day, month, year]);

  // Prefill from the caller (e.g. a payment submission) each time the dialog opens
  React.useEffect(() => {
    if (!open || !initialValues) return;
    setFirstName((initialValues.firstName || '').toUpperCase());
    setLastName((initialValues.lastName || '').toUpperCase());
    setEmail(initialValues.email || '');
    setPhone(initialValues.phone || '');
    setBranchId(initialValues.branchId || '');
    setBelt(initialValues.belt || '');
    if (initialValues.dateOfBirth) {
      const [y, m, d] = String(initialValues.dateOfBirth).slice(0, 10).split('-');
      if (y && m && d) {
        setYear(String(parseInt(y)));
        setMonth(String(parseInt(m) - 1));
        setDay(String(parseInt(d)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setFirstName(''); setLastName(''); setDay(''); setMonth(''); setYear('');
    setGender(''); setEmail(''); setPhone(''); setBranchId(''); setBelt('');
    setStatus('active'); setConfirmDuplicate(null);
  };

  const submit = async (force = false) => {
    if (!firstName.trim()) { toast.error('First name is required'); return; }
    if (!branchId) { toast.error('Select a branch'); return; }
    if (email.trim() && isBlockedEmail(email)) { toast.error(BLOCKED_EMAIL_MESSAGE); return; }
    setSaving(true);
    try {
      const newId = await createStudentPublic(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dobIso,
          gender: gender || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          branchId,
          belt: belt || null,
          status,
        },
        actor,
        force,
      );
      toast.success('Student added');
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      const msg = e?.message || 'Failed to add student';
      if (String(msg).includes('DUPLICATE_STUDENT')) {
        setConfirmDuplicate('A student with this name and birth date already exists. Add anyway?');
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg top-[5%] translate-y-0">
        <DialogHeader>
          <DialogTitle className="text-base">Add Student</DialogTitle>
          <DialogDescription className="text-xs">
            The student is created straight away and appears in the list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">First name *</label>
              <Input className="h-9 uppercase" value={firstName} onChange={(e) => setFirstName(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Last name</label>
              <Input className="h-9 uppercase" value={lastName} onChange={(e) => setLastName(e.target.value.toUpperCase())} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Date of birth</label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">male</SelectItem>
                  <SelectItem value="female">female</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Mobile</label>
              <Input className="h-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65..." />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Email</label>
            <Input className="h-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Branch *</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {(branches as any[]).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Belt</label>
              <Select value={belt || '__none__'} onValueChange={(v) => setBelt(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No belt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No belt</SelectItem>
                  {BELT_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="trial">trial</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {confirmDuplicate && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {confirmDuplicate}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          {confirmDuplicate ? (
            <Button onClick={() => submit(true)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add anyway
            </Button>
          ) : (
            <Button onClick={() => submit(false)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add student
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
