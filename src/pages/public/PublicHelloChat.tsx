/**
 * Public /hello — mobile-first chat-style workflow.
 * Steps: identify -> (match? payment : choice) -> payment/register/trial/callback
 * Persistent "Not what I'm looking for" escape hatch -> Callback (emails hello@gaonhaetaekwondo.com).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageCircleQuestion, ArrowRight, ChevronLeft, CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/utils/dateFormat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { PhoneInput } from '@/components/ui/phone-input';
import gaonhaeLogo from '@/assets/gaonhae-logo.png';
import {
  getPublicBranches,
  getPublicPaymentOptions,
} from '@/services/gradingPaymentSubmissionService';
import {
  createChatSession,
  matchStudentByIdentity,
  logChatEvent,
  submitCallback,
  submitChatPayment,
  submitInlineRegistration,
  submitLessonRequest,
  getChatProducts,
  getStudentCompletedGradingStages,
  type ChatProduct,
  type MatchedStudent,
} from '@/services/publicChatService';
import { computeNextGradingDefault } from '@/utils/nextGradingProduct';


const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';

type Stage =
  | 'identify'
  | 'matched'
  | 'choice'
  | 'callback'
  | 'callback_done'
  | 'register'
  | 'register_done'
  | 'trial'
  | 'trial_done'
  | 'payment_category'
  | 'payment_products'
  | 'payment_pay'
  | 'payment_done'
  | 'lesson_action'
  | 'lesson_request'
  | 'lesson_request_done';

const TERMINAL_STAGES: Stage[] = ['callback_done', 'register_done', 'trial_done', 'payment_done', 'lesson_request_done'];


interface BubbleProps {
  who: 'bot' | 'user';
  children: React.ReactNode;
}
const Bubble: React.FC<BubbleProps> = ({ who, children }) => (
  <div className={cn('flex', who === 'user' ? 'justify-end' : 'justify-start')}>
    <div
      className={cn(
        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
        who === 'user'
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm',
      )}
    >
      {children}
    </div>
  </div>
);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORIES = [
  { id: 'a416f120-4ec2-4826-8d37-375db3e002bc', label: 'School Fees' },
  { id: 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c', label: 'Uniforms & Apparel' },
  { id: '31514844-78dc-43f2-bf07-41d124d175e2', label: 'Grading' },
  { id: '117cdc13-1296-4651-bc4b-f0449873cbf1', label: 'Protection Guards & Accessories' },
];

const PublicHelloChat: React.FC = () => {
  const [stage, setStage] = useState<Stage>('identify');
  const [stageHistory, setStageHistory] = useState<Stage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedStudent | null>(null);

  const goTo = useCallback((next: Stage) => {
    setStageHistory((h) => [...h, stage]);
    setStage(next);
  }, [stage]);

  const goBack = useCallback(() => {
    setStageHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setStage(prev);
      return h.slice(0, -1);
    });
  }, []);


  // Step 1 - identify
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [branchId, setBranchId] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Callback step
  const [cbMessage, setCbMessage] = useState('');

  // Register step
  const [regNotes, setRegNotes] = useState('');

  // Trial step
  const [trialNotes, setTrialNotes] = useState('');
  const [trialTime, setTrialTime] = useState('');

  // Payment
  const [payCategory, setPayCategory] = useState<{ id: string; label: string } | null>(null);
  const [cart, setCart] = useState<{ product: ChatProduct; size: string | null; qty: number }[]>([]);
  const [payMethod, setPayMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [gradingOverride, setGradingOverride] = useState(false);
  const [gradingDefaultLogged, setGradingDefaultLogged] = useState(false);

  // Lesson schedule/reschedule (calendar-based)
  const [lessonNotes, setLessonNotes] = useState('');
  const [cancellations, setCancellations] = useState<Record<string, import('@/services/publicChatService').LessonChangeItem>>({});
  const [newBookings, setNewBookings] = useState<Record<string, import('@/services/publicChatService').LessonChangeItem>>({});
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<Date | undefined>(undefined);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);



  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['public-branches-hello'],
    queryFn: getPublicBranches,
  });

  const branch = useMemo(() => branches.find(b => b.id === branchId), [branches, branchId]);

  const { data: paymentOptions } = useQuery({
    queryKey: ['public-payment-options-hello', branchId],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId && (stage === 'payment_pay'),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['hello-products', branchId, payCategory?.id],
    queryFn: () => getChatProducts(branchId, payCategory!.id),
    enabled: !!branchId && !!payCategory && stage === 'payment_products',
  });

  const isGradingMatched =
    !!matched && payCategory?.id === GRADING_CATEGORY_ID && stage === 'payment_products';

  const { data: completedStages = [] } = useQuery({
    queryKey: ['hello-completed-stages', matched?.id],
    queryFn: () => getStudentCompletedGradingStages(matched!.id),
    enabled: isGradingMatched,
  });

  const gradingDefault = useMemo(() => {
    if (!isGradingMatched || products.length === 0) return null;
    return computeNextGradingDefault(matched!.current_belt, completedStages, products);
  }, [isGradingMatched, matched, completedStages, products]);

  useEffect(() => {
    if (gradingDefault && sessionId && !gradingDefaultLogged) {
      logChatEvent(sessionId, 'grading_default_applied', {
        current_belt: matched?.current_belt ?? null,
        completed_stages: completedStages,
        defaulted_product_id: gradingDefault.product?.product_id ?? null,
        reason: gradingDefault.reason,
      }).catch(() => {});
      setGradingDefaultLogged(true);
    }
  }, [gradingDefault, sessionId, gradingDefaultLogged, completedStages, matched]);

  useEffect(() => {
    // Reset grading default state when leaving products step or changing category.
    if (stage !== 'payment_products' || payCategory?.id !== GRADING_CATEGORY_ID) {
      setGradingOverride(false);
      setGradingDefaultLogged(false);
    }
  }, [stage, payCategory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [stage, cart.length]);

  const dob = useMemo(() => {
    if (!dobDay || dobMonth === '' || !dobYear) return null;
    const d = String(parseInt(dobDay)).padStart(2, '0');
    const m = String(parseInt(dobMonth) + 1).padStart(2, '0');
    return `${dobYear}-${m}-${d}`;
  }, [dobDay, dobMonth, dobYear]);

  const dobDisplay = useMemo(() => {
    if (!dob) return '';
    return `${dobDay.padStart(2,'0')}/${String(parseInt(dobMonth)+1).padStart(2,'0')}/${dobYear}`;
  }, [dob, dobDay, dobMonth, dobYear]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = now; y >= 1950; y--) arr.push(y);
    return arr;
  }, []);

  const daysInMonth = useMemo(() => {
    const m = dobMonth === '' ? 0 : parseInt(dobMonth);
    const y = dobYear === '' ? 2000 : parseInt(dobYear);
    return new Date(y, m + 1, 0).getDate();
  }, [dobMonth, dobYear]);

  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + (c.product.branch_price * c.qty), 0),
    [cart],
  );

  // Identify -> match
  const handleIdentify = async () => {
    if (!firstName.trim() || !lastName.trim() || !dob || !branchId) {
      toast.error('Please fill first name, last name, date of birth and branch');
      return;
    }
    setSubmitting(true);
    try {
      const sid = await createChatSession({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        branch_id: branchId,
        gender: gender || null,
        email: email || null,
        phone: phone || null,
      });
      setSessionId(sid);
      await logChatEvent(sid, 'identify_submitted');
      const m = await matchStudentByIdentity(firstName, lastName, dob, branchId, {
        gender: gender || null,
        email: email || null,
        phone: phone || null,
      });
      if (m) {
        setMatched(m);
        // Persist match on the session so SECURITY DEFINER RPCs validate
        try {
          const { updateSessionMatchAndOutcome } = await import('@/services/publicChatService');
          await updateSessionMatchAndOutcome(sid, m.id, null);
        } catch (err) {
          console.warn('Could not persist matched_student_id', err);
        }
        await logChatEvent(sid, 'student_matched', { student_id: m.id });
        goTo('matched');
      } else {
        await logChatEvent(sid, 'no_student_match');
        goTo('choice');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start chat session');
    } finally {
      setSubmitting(false);
    }
  };

  const openCallback = async () => {
    if (sessionId) await logChatEvent(sessionId, 'callback_opened');
    goTo('callback');
  };

  const handleSubmitCallback = async () => {
    if (!sessionId) return;
    if (!cbMessage.trim()) {
      toast.error('Please tell us how we can help');
      return;
    }
    setSubmitting(true);
    try {
      await submitCallback({
        session_id: sessionId,
        branch_id: branchId || null,
        branch_name: branch?.name || null,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        contact_phone: phone || null,
        contact_email: email || null,
        message: cbMessage.trim(),
        type: 'general_callback',
      });
      goTo('callback_done');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send your message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRegister = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await submitInlineRegistration({
        session_id: sessionId,
        branch_id: branchId,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob!,
        gender: gender || null,
        email: email || null,
        phone: phone || null,
        notes: regNotes || null,
      });
      goTo('register_done');
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTrial = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await submitCallback({
        session_id: sessionId,
        branch_id: branchId,
        branch_name: branch?.name || null,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        contact_phone: phone || null,
        contact_email: email || null,
        message: `Free trial request${trialNotes ? `: ${trialNotes}` : ''}`,
        preferred_time: trialTime || null,
        type: 'trial_lead',
      });
      goTo('trial_done');
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit trial request');
    } finally {
      setSubmitting(false);
    }
  };

  const addToCart = (p: ChatProduct, size: string | null) => {
    if (p.requires_size && !size) {
      toast.error('Please pick a size');
      return;
    }
    setCart((c) => {
      const idx = c.findIndex(x => x.product.product_id === p.product_id && x.size === size);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, { product: p, size, qty: 1 }];
    });
  };

  const handleSubmitPayment = async () => {
    if (!sessionId || !branchId || !payCategory || cart.length === 0 || !proofFile) {
      toast.error('Missing required information');
      return;
    }
    setSubmitting(true);
    try {
      await submitChatPayment({
        session_id: sessionId,
        branch_id: branchId,
        category: payCategory.label,
        items: cart.map(c => ({
          product_id: c.product.product_id,
          product_name: c.product.product_name,
          size: c.size,
          qty: c.qty,
          unit_price: c.product.branch_price,
        })),
        amount: cartTotal,
        payment_method: payMethod,
        matched_student_id: matched?.id || null,
        proof_file: proofFile,
        contact_first_name: firstName,
        contact_last_name: lastName,
      });
      goTo('payment_done');
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Lesson calendar data ----
  const lessonEnabled = !!sessionId && !!matched && (stage === 'matched' || stage === 'lesson_action' || stage === 'lesson_request');

  const { data: invoicedTerms = [] } = useQuery({
    queryKey: ['hello-invoiced-terms', sessionId, matched?.id],
    queryFn: () => import('@/services/publicChatService').then(m => m.getStudentInvoicedTerms(sessionId!, matched!.id)),
    enabled: lessonEnabled,
  });

  // Default selection: current term (or earliest upcoming) from invoicedTerms
  useEffect(() => {
    if (selectedTermId) return;
    if (invoicedTerms.length === 0) return;
    const current = invoicedTerms.find(t => t.is_current) || invoicedTerms[0];
    setSelectedTermId(current.term_id);
  }, [invoicedTerms, selectedTermId]);

  const { data: termCtx, isLoading: termCtxLoading, isError: termCtxError } = useQuery({
    queryKey: ['hello-lesson-term-ctx', sessionId, matched?.id, selectedTermId],
    queryFn: () => import('@/services/publicChatService').then(m => m.getStudentTermContext(sessionId!, matched!.id, selectedTermId)),
    enabled: lessonEnabled,
  });

  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['hello-lesson-timetable', sessionId, matched?.id],
    queryFn: () => import('@/services/publicChatService').then(m => m.getBranchTimetableSlots(sessionId!, matched!.id)),
    enabled: lessonEnabled,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['hello-lesson-bookings', sessionId, matched?.id, selectedTermId, stage],
    queryFn: () => import('@/services/publicChatService').then(m => m.getStudentTermBookings(sessionId!, matched!.id, selectedTermId)),
    enabled: lessonEnabled,
  });

  const timetableIds = useMemo(() => timetableSlots.map(s => s.id), [timetableSlots]);
  const { data: slotCapacityRows = [] } = useQuery({
    queryKey: ['hello-lesson-caps', sessionId, matched?.id, selectedTermId, timetableIds.join(',')],
    queryFn: () => import('@/services/publicChatService').then(m => m.getTermSlotCapacities(sessionId!, matched!.id, timetableIds, selectedTermId)),
    enabled: lessonEnabled && timetableIds.length > 0,
  });

  const { data: holidayDates = [] } = useQuery({
    queryKey: ['hello-lesson-holidays', sessionId, matched?.id, termCtx?.start_date, termCtx?.end_date],
    queryFn: () => import('@/services/publicChatService').then(m => m.getBranchHolidays(sessionId!, matched!.id, termCtx!.start_date, termCtx!.end_date)),
    enabled: lessonEnabled && !!termCtx,
  });

  // Build maps
  const bookingsByDate = useMemo(() => {
    const m: Record<string, typeof bookings> = {};
    bookings.forEach(b => { (m[b.scheduled_date] ||= [] as any).push(b); });
    return m;
  }, [bookings]);

  const capByDateSlot = useMemo(() => {
    const m: Record<string, number> = {};
    slotCapacityRows.forEach(r => { m[`${r.scheduled_date}_${r.timetable_id}`] = r.booked_count; });
    return m;
  }, [slotCapacityRows]);

  const slotsByWeekday = useMemo(() => {
    const m: Record<number, typeof timetableSlots> = {};
    timetableSlots.forEach(s => { (m[s.weekday] ||= [] as any).push(s); });
    return m;
  }, [timetableSlots]);

  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Eligible non-full slots for a given date (after considering picked changes)
  const slotsForDate = (date: Date) => {
    const iso = toIso(date);
    const wd = date.getDay();
    const all = slotsByWeekday[wd] || [];
    return all.map(s => {
      const baseCount = capByDateSlot[`${iso}_${s.id}`] || 0;
      const pickedHere = newBookings[`${iso}_${s.id}`] ? 1 : 0;
      const studentAlreadyBooked = (bookingsByDate[iso] || []).some(b => b.timetable_id === s.id);
      const effectiveCount = baseCount + pickedHere;
      const isFull = effectiveCount >= s.max_capacity;
      return { ...s, baseCount, effectiveCount, isFull, studentAlreadyBooked };
    });
  };

  const dateHasAvailable = (date: Date) => {
    const slots = slotsForDate(date);
    return slots.some(s => !s.isFull && !s.studentAlreadyBooked);
  };

  const dateHasBooking = (date: Date) => {
    const iso = toIso(date);
    return (bookingsByDate[iso] || []).length > 0;
  };

  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates]);

  const isDateDisabled = (date: Date) => {
    if (!termCtx) return true;
    const iso = toIso(date);
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return true;
    if (iso < termCtx.start_date || iso > termCtx.end_date) return true;
    if (holidaySet.has(iso)) return true;
    if (!dateHasAvailable(date) && !dateHasBooking(date)) return true;
    return false;
  };

  const netLessons = Object.keys(newBookings).length - Object.keys(cancellations).length;
  const maxNew = termCtx?.is_unlimited
    ? Number.POSITIVE_INFINITY
    : (termCtx?.unbooked_count ?? 0) + Object.keys(cancellations).length;

  const handleSubmitLessonRequest = async () => {
    if (!sessionId || !branchId || !matched) {
      toast.error('Missing student context');
      return;
    }
    if (Object.keys(newBookings).length === 0 && Object.keys(cancellations).length === 0) {
      toast.error('Pick at least one slot to book or cancel');
      return;
    }
    setSubmitting(true);
    try {
      await submitLessonRequest({
        session_id: sessionId,
        branch_id: branchId,
        branch_name: branch?.name || null,
        student_id: matched.id,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        contact_phone: phone || null,
        contact_email: email || null,
        cancellations: Object.values(cancellations),
        new_bookings: Object.values(newBookings),
        notes: lessonNotes.trim() || null,
      });
      await logChatEvent(sessionId, 'lesson_request_submitted', {
        student_id: matched.id,
        cancel_count: Object.keys(cancellations).length,
        book_count: Object.keys(newBookings).length,
      });
      goTo('lesson_request_done');
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit lesson request');
    } finally {
      setSubmitting(false);
    }
  };


  const escapeHatch = (
    <Button

      type="button"
      variant="outline"
      size="sm"
      onClick={openCallback}
      className="gap-1 text-xs"
    >
      <MessageCircleQuestion className="h-3.5 w-3.5" />
      Not what I'm looking for
    </Button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b">
        <div className="max-w-md mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {stageHistory.length > 0 && !TERMINAL_STAGES.includes(stage) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goBack}
                aria-label="Back"
                className="h-8 w-8 -ml-1 shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <img src={gaonhaeLogo} alt="Gaonhae Taekwondo" className="h-7 w-auto" />

          </div>
          {stage !== 'identify' && stage !== 'callback' && stage !== 'callback_done' && escapeHatch}
        </div>
      </header>


      {/* Chat scroll area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-md mx-auto px-3 py-4 space-y-3 pb-6">
          <Bubble who="bot">Hi! Let's get you to the right place. Please share a few details.</Bubble>

          {/* ---------- Identify ---------- */}
          {stage === 'identify' && (
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">First name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => setFirstName(s => s.trim().toUpperCase())} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => setLastName(s => s.trim().toUpperCase())} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of birth *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={dobDay} onValueChange={setDobDay}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Day" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dobMonth} onValueChange={setDobMonth}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dobYear} onValueChange={setDobYear}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Branch *</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choose your branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gender (optional)</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email (optional)</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact number (optional)</Label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
                <Button onClick={handleIdentify} disabled={submitting} className="w-full h-11 mt-1">
                  {submitting ? 'Please wait…' : 'Continue'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <div className="pt-1 flex justify-center">{escapeHatch}</div>
              </CardContent>
            </Card>
          )}

          {/* ---------- Identify echo + matched/no match ---------- */}
          {stage !== 'identify' && (
            <Bubble who="user">
              {firstName} {lastName} · {dobDisplay} · {branch?.name}
            </Bubble>
          )}

          {stage === 'matched' && matched && (
            <>
              <Bubble who="bot">
                Welcome back, <strong>{matched.first_name}</strong>! I found your record
                {matched.current_belt ? <> ({matched.current_belt} belt)</> : null}.
                {termCtx && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded bg-background/60 px-2 py-1.5 text-center">
                      <div className="text-base font-semibold tabular-nums">
                        {termCtx.is_unlimited ? '∞' : termCtx.unbooked_count}
                      </div>
                      <div className="text-muted-foreground">Unbooked (term)</div>
                    </div>
                    <div className="rounded bg-background/60 px-2 py-1.5 text-center">
                      <div className="text-base font-semibold tabular-nums">{termCtx.attended_this_month}</div>
                      <div className="text-muted-foreground">Attended (mo)</div>
                    </div>
                    <div className="rounded bg-background/60 px-2 py-1.5 text-center">
                      <div className="text-base font-semibold tabular-nums">{termCtx.missed_this_month}</div>
                      <div className="text-muted-foreground">Missed (mo)</div>
                    </div>
                  </div>
                )}
              </Bubble>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <Button onClick={() => goTo('payment_category')} className="w-full h-11 justify-between">
                    Make a payment <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      if (sessionId) logChatEvent(sessionId, 'lesson_action_opened').catch(() => {});
                      goTo('lesson_action');
                    }}
                    variant="outline"
                    className="w-full h-11 justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      Schedule / Reschedule a lesson
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>

              </Card>
            </>
          )}

          {stage === 'choice' && (
            <>
              <Bubble who="bot">
                We couldn't find your record with the details provided. Leave any remarks below and our team will reach out to help.
              </Bubble>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <Textarea
                    value={cbMessage}
                    onChange={(e) => setCbMessage(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="Remarks (optional) — e.g. preferred class, age, anything we should know…"
                    maxLength={500}
                  />
                  <div className="text-[11px] text-muted-foreground text-right">{cbMessage.length}/500</div>
                  <Button
                    onClick={async () => {
                      if (!sessionId) return;
                      setSubmitting(true);
                      try {
                        await submitCallback({
                          session_id: sessionId,
                          branch_id: branchId || null,
                          branch_name: branch?.name || null,
                          first_name: firstName,
                          last_name: lastName,
                          date_of_birth: dob,
                          contact_phone: phone || null,
                          contact_email: email || null,
                          message: `No student match. Gender: ${gender || '-'}. Remarks: ${cbMessage.trim() || '(none)'}`,
                          type: 'no_match_request',
                        });
                        goTo('callback_done');
                      } catch (e: any) {
                        toast.error(e?.message || 'Could not send your details');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="w-full h-11"
                  >
                    {submitting ? 'Sending…' : 'Send my details'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    We'll email your details to our team and someone will contact you shortly.
                  </p>
                </CardContent>
              </Card>
            </>
          )}


          {/* ---------- Callback ---------- */}
          {stage === 'callback' && (
            <>
              <Bubble who="bot">How can we help? Leave a message and we'll get back to you.</Bubble>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <Textarea
                    value={cbMessage}
                    onChange={(e) => setCbMessage(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="Type your message…"
                    maxLength={500}
                  />
                  <div className="text-[11px] text-muted-foreground text-right">{cbMessage.length}/500</div>
                  <Button onClick={handleSubmitCallback} disabled={submitting} className="w-full h-11">
                    {submitting ? 'Sending…' : 'Send message'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'callback_done' && (
            <Bubble who="bot">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>Thank you for your message. We will get back to you shortly.</span>
              </div>
            </Bubble>
          )}

          {/* ---------- Register ---------- */}
          {stage === 'register' && (
            <>
              <Bubble who="bot">Great! Tell us anything we should know — class preference, day/time, age of student, etc.</Bubble>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <Textarea
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    rows={4}
                    placeholder="e.g. prefers Saturday classes, 9 yrs old…"
                  />
                  <Button onClick={handleSubmitRegister} disabled={submitting} className="w-full h-11">
                    {submitting ? 'Submitting…' : 'Submit registration request'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    A staff member will contact you to complete the full registration form (including signature).
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'register_done' && (
            <Bubble who="bot">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>Thanks! We've received your registration request and will reach out shortly.</span>
              </div>
            </Bubble>
          )}

          {/* ---------- Free trial ---------- */}
          {stage === 'trial' && (
            <>
              <Bubble who="bot">We'll arrange a free trial for you. When is a good time to be contacted?</Bubble>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Preferred contact time (optional)</Label>
                    <Input value={trialTime} onChange={(e) => setTrialTime(e.target.value)} placeholder="e.g. weekday evenings" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea
                      value={trialNotes}
                      onChange={(e) => setTrialNotes(e.target.value)}
                      rows={3}
                      placeholder="Any specifics?"
                    />
                  </div>
                  <Button onClick={handleSubmitTrial} disabled={submitting} className="w-full h-11">
                    {submitting ? 'Submitting…' : 'Request a callback'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'trial_done' && (
            <Bubble who="bot">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>Thanks! We'll be in touch to schedule your free trial.</span>
              </div>
            </Bubble>
          )}

          {/* ---------- Payment ---------- */}
          {stage === 'payment_category' && (
            <>
              <Bubble who="bot">What would you like to pay for?</Bubble>
              <Card>
                <CardContent className="p-3 grid grid-cols-1 gap-2">
                  {CATEGORIES.map(c => (
                    <Button
                      key={c.id}
                      variant="outline"
                      className="w-full h-11 justify-between"
                      onClick={() => { setPayCategory(c); setCart([]); goTo('payment_products'); }}
                    >
                      {c.label} <ArrowRight className="h-4 w-4" />
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'payment_products' && payCategory && (
            <>
              <Bubble who="bot">{payCategory.label} — pick item(s):</Bubble>
              <Card>
                <CardContent className="p-3 space-y-2">
                  {productsLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                  {!productsLoading && products.length === 0 && (
                    <p className="text-xs text-muted-foreground">No items available for this branch right now.</p>
                  )}

                  {isGradingMatched && gradingDefault && !gradingOverride ? (
                    <div className="space-y-2">
                      <div className="rounded-md bg-muted/60 p-2 text-xs text-foreground">
                        {gradingDefault.message}
                      </div>
                      {gradingDefault.product ? (
                        <>
                          <ProductRow product={gradingDefault.product} onAdd={addToCart} />
                          <button
                            type="button"
                            onClick={() => setGradingOverride(true)}
                            className="text-xs text-primary underline underline-offset-2"
                          >
                            Change grading
                          </button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-9 w-full"
                          onClick={() => setGradingOverride(true)}
                        >
                          Show all gradings
                        </Button>
                      )}
                    </div>
                  ) : (
                    products.map(p => (
                      <ProductRow key={p.product_id} product={p} onAdd={addToCart} />
                    ))
                  )}

                  {cart.length > 0 && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-xs font-semibold">Your cart</p>
                      {cart.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate">
                            {c.product.product_name}{c.size ? ` (${c.size})` : ''} × {c.qty}
                          </span>
                          <span className="tabular-nums">${(c.product.branch_price * c.qty).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t">
                        <span>Total</span>
                        <span className="tabular-nums">${cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={goBack} className="flex-1 h-10">Back</Button>
                    <Button onClick={() => goTo('payment_pay')} disabled={cart.length === 0} className="flex-1 h-10">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'payment_pay' && (
            <>
              <Bubble who="bot">Choose payment method and upload your proof.</Bubble>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Amount to pay</span>
                    <span className="text-base font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                  </div>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paynow">PayNow</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <PaymentInfoDisplay
                    paymentMethod={payMethod}
                    bankTransferInfo={paymentOptions?.bank_transfer_info}
                    paynowQrUrl={paymentOptions?.paynow_qr_url}
                  />
                  <ProofOfPaymentUpload value={proofFile} onChange={setProofFile} required />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={goBack} className="flex-1 h-10">Back</Button>
                    <Button onClick={handleSubmitPayment} disabled={submitting || !proofFile} className="flex-1 h-10">
                      {submitting ? 'Submitting…' : 'Submit payment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'payment_done' && (
            <Bubble who="bot">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>Thanks! Your payment has been received and is pending verification.</span>
              </div>
            </Bubble>
          )}

          {/* ---------- Lesson schedule / reschedule ---------- */}
          {stage === 'lesson_action' && (
            <>
              <Bubble who="bot">Would you like to schedule a new lesson or reschedule an existing one?</Bubble>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-between"
                    onClick={() => goTo('lesson_request')}
                  >
                    Schedule a new lesson <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-between"
                    onClick={() => goTo('lesson_request')}
                  >
                    Reschedule an existing lesson <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    You can do both on the next screen — pick a date to add or cancel a class.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {stage === 'lesson_request' && (
            <>
              <Bubble who="bot">
                Pick a date to see your kids class times. Tap an open time to <span className="text-emerald-600 font-medium">book it</span>, or tap one of your booked classes to <span className="text-destructive font-medium">cancel it</span>.
              </Bubble>

              {/* Term context strip */}
              {termCtx ? (
                <Card>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{termCtx.term_name}</p>
                      <Badge variant="secondary" className="text-[11px]">
                        {termCtx.is_unlimited
                          ? '∞ unbooked'
                          : `${Math.max(0, termCtx.unbooked_count - Object.keys(newBookings).length + Object.keys(cancellations).length)} unbooked`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(termCtx.start_date)} – {formatDate(termCtx.end_date)}
                    </p>
                    <div className="flex gap-3 flex-wrap text-[10px] pt-1">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> your class</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> to book</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> to cancel</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="p-3 text-xs text-muted-foreground">
                  {termCtxLoading
                    ? 'Loading term…'
                    : termCtxError
                      ? 'Could not load term right now. Please try again shortly.'
                      : 'No active term found for your branch yet. Our team will set this up — please reach out if urgent.'}
                </CardContent></Card>
              )}

              {/* Calendar */}
              {termCtx && (
                <Card>
                  <CardContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={pickedDate}
                      month={calMonth || (pickedDate || new Date(termCtx.start_date))}
                      onMonthChange={setCalMonth}
                      onSelect={(d) => {
                        if (!d) return;
                        setPickedDate(d);
                        setSlotDialogOpen(true);
                      }}
                      disabled={isDateDisabled}
                      fromDate={new Date(termCtx.start_date)}
                      toDate={new Date(termCtx.end_date)}
                      modifiers={{
                        booked: (d) => dateHasBooking(d),
                        hasNewPick: (d) => Object.keys(newBookings).some(k => k.startsWith(toIso(d) + '_')),
                        hasCancelPick: (d) => Object.values(cancellations).some(c => c.date === toIso(d)),
                      }}
                      modifiersClassNames={{
                        booked: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-blue-500',
                        hasNewPick: 'ring-2 ring-emerald-500 ring-inset rounded-md',
                        hasCancelPick: 'ring-2 ring-destructive ring-inset rounded-md',
                      }}
                      className="p-2 pointer-events-auto"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Picked changes summary */}
              {(Object.keys(cancellations).length > 0 || Object.keys(newBookings).length > 0) && (
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-medium">Your changes</p>
                    {Object.entries(cancellations).map(([id, c]) => (
                      <div key={id} className="flex items-center justify-between gap-2 text-xs p-2 rounded border border-destructive/40 bg-destructive/5">
                        <span className="text-destructive">
                          Cancel {formatDate(c.date)} · {c.start_time.slice(0,5)}–{c.end_time.slice(0,5)}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                          onClick={() => setCancellations(prev => { const n = { ...prev }; delete n[id]; return n; })}>
                          Undo
                        </Button>
                      </div>
                    ))}
                    {Object.entries(newBookings).map(([key, b]) => (
                      <div key={key} className="flex items-center justify-between gap-2 text-xs p-2 rounded border border-emerald-500/40 bg-emerald-500/5">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Book {formatDate(b.date)} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}{b.class_type ? ` · ${b.class_type}` : ''}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                          onClick={() => setNewBookings(prev => { const n = { ...prev }; delete n[key]; return n; })}>
                          Undo
                        </Button>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Net: {netLessons >= 0 ? '+' : ''}{netLessons} lesson{Math.abs(netLessons) === 1 ? '' : 's'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Notes + Submit */}
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Remarks (optional)</Label>
                    <Textarea
                      value={lessonNotes}
                      onChange={(e) => setLessonNotes(e.target.value.slice(0, 500))}
                      rows={2}
                      placeholder="Anything we should know?"
                      maxLength={500}
                      className="min-h-0"
                    />
                  </div>
                  <Button onClick={handleSubmitLessonRequest} disabled={submitting} className="w-full h-11">
                    {submitting ? 'Submitting…' : 'Submit request'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Our team will confirm your booking and update your attendance shortly.
                  </p>
                </CardContent>
              </Card>

              {/* Slot dialog */}
              <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                <DialogContent className="max-w-md max-h-[85vh]">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {pickedDate ? formatDate(toIso(pickedDate)) : ''}
                    </DialogTitle>
                  </DialogHeader>
                  {pickedDate && (() => {
                    const iso = toIso(pickedDate);
                    const dayBookings = bookingsByDate[iso] || [];
                    const slots = slotsForDate(pickedDate);
                    const openSlots = slots.filter(s => !s.studentAlreadyBooked);

                    return (
                      <div className="space-y-3">
                        {dayBookings.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Your booked classes</p>
                            {dayBookings.map(b => {
                              const picked = !!cancellations[b.id];
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  className={cn(
                                    'w-full text-left rounded border h-11 px-3 text-sm flex items-center justify-between transition-colors',
                                    picked
                                      ? 'border-destructive bg-destructive/10 text-destructive'
                                      : 'border-blue-500/40 bg-blue-500/5 hover:border-destructive/60'
                                  )}
                                  onClick={() => {
                                    setCancellations(prev => {
                                      const n = { ...prev };
                                      if (n[b.id]) { delete n[b.id]; }
                                      else {
                                        n[b.id] = {
                                          date: b.scheduled_date,
                                          start_time: b.start_time,
                                          end_time: b.end_time,
                                          class_type: b.class_type,
                                          timetable_id: b.timetable_id,
                                          scheduled_class_id: b.id,
                                        };
                                      }
                                      return n;
                                    });
                                  }}
                                >
                                  <span>{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)} {b.class_type ? `· ${b.class_type}` : ''}</span>
                                  <span className="text-[11px]">{picked ? 'Cancelling' : 'Tap to cancel'}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Available class times</p>
                          {openSlots.length === 0 && (
                            <p className="text-xs text-muted-foreground">No open slots for this date.</p>
                          )}
                          {openSlots.map(s => {
                            const key = `${iso}_${s.id}`;
                            const picked = !!newBookings[key];
                            const full = s.isFull && !picked;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                disabled={full}
                                className={cn(
                                  'w-full text-left rounded border h-11 px-3 text-sm flex items-center justify-between transition-colors',
                                  picked
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : full
                                      ? 'opacity-50 cursor-not-allowed border-border'
                                      : 'border-border hover:border-emerald-500/60'
                                )}
                                onClick={() => {
                                  if (picked) {
                                    setNewBookings(prev => { const n = { ...prev }; delete n[key]; return n; });
                                    return;
                                  }
                                  if (Object.keys(newBookings).length + 1 > maxNew) {
                                    toast.error(`You only have ${maxNew} lesson${maxNew === 1 ? '' : 's'} left to book. Cancel an existing one first.`);
                                    return;
                                  }
                                  setNewBookings(prev => ({
                                    ...prev,
                                    [key]: {
                                      date: iso,
                                      start_time: s.start_time,
                                      end_time: s.end_time,
                                      class_type: s.class_type,
                                      timetable_id: s.id,
                                    },
                                  }));
                                }}
                              >
                                <span>
                                  {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)} · {s.class_type}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {picked ? 'Booking' : full ? 'Full' : `${s.effectiveCount}/${s.max_capacity}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const iso2 = toIso(pickedDate);
                              setCancellations(prev => {
                                const n = { ...prev };
                                Object.keys(n).forEach(k => { if (n[k].date === iso2) delete n[k]; });
                                return n;
                              });
                              setNewBookings(prev => {
                                const n = { ...prev };
                                Object.keys(n).forEach(k => { if (k.startsWith(iso2 + '_')) delete n[k]; });
                                return n;
                              });
                            }}
                          >
                            Clear day
                          </Button>
                          <Button type="button" size="sm" onClick={() => setSlotDialogOpen(false)}>Done</Button>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </>
          )}


          {stage === 'lesson_request_done' && (
            <Bubble who="bot">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span>Thanks! Your lesson request has been received. We'll confirm and update your attendance shortly.</span>
              </div>
            </Bubble>
          )}

        </div>
      </main>
    </div>
  );
};

const ProductRow: React.FC<{ product: ChatProduct; onAdd: (p: ChatProduct, size: string | null) => void }> = ({ product, onAdd }) => {
  const sizes = product.requires_size ? (product.available_sizes || []) : [];
  const [size, setSize] = useState<string>('');
  return (
    <div className="border rounded-lg p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{product.product_name}</p>
          <p className="text-xs text-muted-foreground">${product.branch_price.toFixed(2)}</p>
        </div>
        {product.requires_size && <Badge variant="secondary" className="text-[10px]">Size required</Badge>}
      </div>
      {product.requires_size && sizes.length > 0 && (
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick size" /></SelectTrigger>
          <SelectContent>
            {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-9"
        onClick={() => onAdd(product, product.requires_size ? (size || null) : null)}
      >
        Add to cart
      </Button>
    </div>
  );
};

export default PublicHelloChat;
