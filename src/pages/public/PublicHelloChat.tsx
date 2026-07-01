/**
 * Public /hello — mobile-first chat-style workflow.
 * Steps: identify -> (match? payment : choice) -> payment/register/trial/callback
 * Persistent "Not what I'm looking for" escape hatch -> Callback (emails hello@gaonhaetaekwondo.com).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageCircleQuestion, ArrowRight, ChevronLeft, CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  getPublicGradingSlots,
  type PublicGradingSlot,
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
  getChatTermsForStudent,
  getStudentCompletedGradingStages,
  type ChatProduct,
  type ChatTerm,
  type MatchedStudent,
} from '@/services/publicChatService';
import { computeNextGradingDefault } from '@/utils/nextGradingProduct';


const GRADING_CATEGORY_ID = '31514844-78dc-43f2-bf07-41d124d175e2';
const SCHOOL_FEES_CATEGORY_ID = 'a416f120-4ec2-4826-8d37-375db3e002bc';
const UNIFORMS_CATEGORY_ID = 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c';
const PROTECTION_CATEGORY_ID = '117cdc13-1296-4651-bc4b-f0449873cbf1';

type CartItem = {
  product: ChatProduct;
  size: string | null;
  qty: number;
  selectedOptions?: Record<string, string | null>;
  gradingSlotId?: string | null;
  termId?: string | null;
  termName?: string | null;
};

const getVariantArray = (product: ChatProduct, key: string): string[] => {
  const value = product.available_variants?.[key];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
};

const getDisplayPrice = (product: ChatProduct, country?: string | null): number => {
  const sgTarget = Number(product.metadata?.sg_target_price ?? NaN);
  return country?.toLowerCase() === 'singapore' && Number.isFinite(sgTarget)
    ? sgTarget
    : Number(product.branch_price || 0);
};

const isPreorderProduct = (product: ChatProduct): boolean => product.metadata?.is_preorder === true;

const formatGradingSlotLabel = (slot: PublicGradingSlot): string => {
  const time = slot.start_time ? ` ${String(slot.start_time).slice(0, 5)}` : '';
  const title = slot.title ? ` — ${slot.title}` : '';
  const location = slot.location ? ` · ${slot.location}` : '';
  return `${formatDate(slot.grading_date)}${time}${title}${location}`;
};

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
  { id: '31514844-78dc-43f2-bf07-41d124d175e2', label: 'Grading' },
  { id: 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c', label: 'Uniforms & Apparel' },
  { id: '117cdc13-1296-4651-bc4b-f0449873cbf1', label: 'Protection Guards & Accessories' },
];

const PublicHelloChat: React.FC = () => {
  const navigate = useNavigate();
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<'paynow' | 'bank_transfer'>('paynow');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [gradingDefaultLogged, setGradingDefaultLogged] = useState(false);
  const [selectedGradingSlotId, setSelectedGradingSlotId] = useState('');
  const [selectedFoundationLevels, setSelectedFoundationLevels] = useState<Set<string>>(new Set());
  // Per-product draft state for non-grading flow (picked + variant + term selections)
  type RowDraft = { picked: boolean; size: string; color: string; gender: string; termId: string; qty: number };
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [pendingPreorder, setPendingPreorder] = useState<{
    product: ChatProduct;
    size: string | null;
    selectedOptions?: Record<string, string | null>;
    gradingSlotId?: string | null;
    termId?: string | null;
    termName?: string | null;
    qty?: number;
  } | null>(null);

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

  const dob = useMemo(() => {
    if (!dobDay || dobMonth === '' || !dobYear) return null;
    const d = String(parseInt(dobDay)).padStart(2, '0');
    const m = String(parseInt(dobMonth) + 1).padStart(2, '0');
    return `${dobYear}-${m}-${d}`;
  }, [dobDay, dobMonth, dobYear]);

  const { data: paymentOptions } = useQuery({
    queryKey: ['public-payment-options-hello', branchId],
    queryFn: () => getPublicPaymentOptions(branchId, 'White'),
    enabled: !!branchId && (stage === 'payment_pay'),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['hello-products', branchId, payCategory?.id, sessionId, matched?.id],
    queryFn: () => getChatProducts(branchId, payCategory!.id, sessionId, matched?.id),
    enabled: !!branchId && !!payCategory && stage === 'payment_products',
  });

  const { data: chatTerms = [] } = useQuery({
    queryKey: ['hello-chat-terms', branchId, sessionId, matched?.id],
    queryFn: () => getChatTermsForStudent(sessionId!, matched!.id, branchId),
    enabled: !!branchId && !!sessionId && !!matched?.id && stage === 'payment_products' && payCategory?.id === SCHOOL_FEES_CATEGORY_ID,
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

  const FOUNDATION_LEVELS = ['Foundation 1', 'Foundation 2', 'Foundation 3'] as const;
  const isSGFoundation = useMemo(() => (
    isGradingMatched
    && (branch?.country?.toLowerCase() === 'singapore')
    && !!matched?.current_belt
    && (FOUNDATION_LEVELS as readonly string[]).includes(matched.current_belt)
  ), [isGradingMatched, branch, matched]);

  const findFoundationProduct = useCallback((level: string): ChatProduct | undefined =>
    products.find(p => p.product_name.trim().toLowerCase().startsWith(`${level.toLowerCase()} >>`)),
  [products]);

  // Resolved grading products that will be added to cart on Continue.
  const selectedGradingProducts = useMemo<ChatProduct[]>(() => {
    if (!isGradingMatched) return [];
    if (isSGFoundation) {
      return (FOUNDATION_LEVELS as readonly string[])
        .filter(l => selectedFoundationLevels.has(l))
        .map(l => findFoundationProduct(l))
        .filter((p): p is ChatProduct => !!p);
    }
    return gradingDefault?.product ? [gradingDefault.product] : [];
  }, [isGradingMatched, isSGFoundation, selectedFoundationLevels, findFoundationProduct, gradingDefault]);

  const selectedGradingProductIdsKey = useMemo(
    () => selectedGradingProducts.map(p => p.product_id).sort().join(','),
    [selectedGradingProducts],
  );

  const { data: gradingSlots = [], isLoading: gradingSlotsLoading } = useQuery({
    queryKey: ['hello-grading-slots', branchId, selectedGradingProductIdsKey, dob, matched?.current_belt],
    queryFn: () => getPublicGradingSlots(
      branchId,
      selectedGradingProducts.map(p => p.product_id),
      dob,
      matched?.current_belt ?? null,
    ),
    enabled: !!branchId && selectedGradingProducts.length > 0 && isGradingMatched,
  });

  // Default: pre-check the student's current Foundation level (the mandatory next grading).
  useEffect(() => {
    if (isSGFoundation && selectedFoundationLevels.size === 0 && matched?.current_belt) {
      setSelectedFoundationLevels(new Set([matched.current_belt]));
    }
  }, [isSGFoundation, matched, selectedFoundationLevels.size]);

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
      setGradingDefaultLogged(false);
      setSelectedGradingSlotId('');
      setSelectedFoundationLevels(new Set());
    }
    if (stage !== 'payment_products') {
      setRowDrafts({});
    }
  }, [stage, payCategory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [stage, cart.length]);

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
    () => cart.reduce((s, c) => s + (getDisplayPrice(c.product, branch?.country) * c.qty), 0),
    [cart, branch?.country],
  );
  const isSGBranch = branch?.country?.toLowerCase() === 'singapore';
  const GST_RATE = 0.09;
  const gstAmount = isSGBranch ? cartTotal * GST_RATE : 0;
  const totalWithTax = cartTotal + gstAmount;

  // Identify -> match
  const handleIdentify = async () => {
    if (!firstName.trim() || !lastName.trim() || !branchId) {
      toast.error('Please fill first name, last name and branch');
      return;
    }
    const hasAltIdentity = !!gender && (!!email.trim() || !!phone.trim());
    if (!dob && !hasAltIdentity) {
      toast.error('Please provide date of birth, or fill gender plus email or contact number');
      return;
    }
    setSubmitting(true);
    try {
      const sid = await createChatSession({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob || null,
        branch_id: branchId,
        gender: gender || null,
        email: email || null,
        phone: phone || null,
      });
      setSessionId(sid);
      await logChatEvent(sid, 'identify_submitted');
      const m = await matchStudentByIdentity(firstName, lastName, dob || null, branchId, {
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

  const addToCart = (
    p: ChatProduct,
    size: string | null,
    selectedOptions?: Record<string, string | null>,
    gradingSlotId?: string | null,
    termId?: string | null,
    termName?: string | null,
    qty?: number,
  ) => {
    if (p.requires_size && !size) {
      toast.error('Please pick a size');
      return;
    }
    if (payCategory?.id === GRADING_CATEGORY_ID && !gradingSlotId) {
      toast.error('Please pick a grading slot');
      return;
    }
    if (p.is_term_based && !termId) {
      toast.error('Please pick a term');
      return;
    }
    if (isPreorderProduct(p)) {
      setPendingPreorder({ product: p, size, selectedOptions, gradingSlotId, termId, termName, qty });
      return;
    }
    commitCartItem(p, size, selectedOptions, gradingSlotId, termId, termName, qty);
  };

  const commitCartItem = (
    p: ChatProduct,
    size: string | null,
    selectedOptions?: Record<string, string | null>,
    gradingSlotId?: string | null,
    termId?: string | null,
    termName?: string | null,
    qty: number = 1,
  ) => {
    setCart((c) => {
      const optionKey = JSON.stringify(selectedOptions || {});
      const idx = c.findIndex(x =>
        x.product.product_id === p.product_id &&
        x.size === size &&
        x.gradingSlotId === gradingSlotId &&
        x.termId === termId &&
        JSON.stringify(x.selectedOptions || {}) === optionKey
      );
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...c, { product: p, size, selectedOptions, gradingSlotId, termId, termName, qty }];
    });
  };

  const handleSubmitPayment = async () => {
    if (!sessionId || !branchId || !payCategory || cart.length === 0 || !proofFile || !matched?.id) {
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
          size_variant: c.size,
          selected_options: c.selectedOptions,
          grading_slot_id: c.gradingSlotId ?? null,
          term_id: c.termId ?? null,
          term_name: c.termName ?? null,
          qty: c.qty,
          unit_price: getDisplayPrice(c.product, branch?.country),
        })),
        amount: totalWithTax,
        payment_method: payMethod,
        matched_student_id: matched.id,
        proof_file: proofFile,
        contact_first_name: firstName,
        contact_last_name: lastName,
      });
      if (payCategory.id === GRADING_CATEGORY_ID) {
        navigate('/grading-list');
        return;
      }
      if (payCategory.id === SCHOOL_FEES_CATEGORY_ID) {
        toast.success('Payment received. Schedule your lessons below.');
        goTo('lesson_request');
        return;
      }
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

  // Reset picks + calendar position when the user switches term
  useEffect(() => {
    setNewBookings({});
    setCancellations({});
    setPickedDate(undefined);
    setCalMonth(termCtx?.start_date ? new Date(termCtx.start_date) : undefined);
  }, [selectedTermId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const now = new Date();
    return all.map(s => {
      const baseCount = capByDateSlot[`${iso}_${s.id}`] || 0;
      const pickedHere = newBookings[`${iso}_${s.id}`] ? 1 : 0;
      const studentAlreadyBooked = (bookingsByDate[iso] || []).some(b => b.timetable_id === s.id);
      const effectiveCount = baseCount + pickedHere;
      const isFull = effectiveCount >= s.max_capacity;
      const startsAt = new Date(`${iso}T${s.start_time}`);
      const isTooLate = now.getTime() >= startsAt.getTime() - 60 * 60 * 1000;
      return { ...s, baseCount, effectiveCount, isFull, studentAlreadyBooked, isTooLate };
    });
  };

  const dateHasAvailable = (date: Date) => {
    const slots = slotsForDate(date);
    return slots.some(s => !s.isFull && !s.studentAlreadyBooked && !s.isTooLate);
  };

  const dateHasBooking = (date: Date) => {
    const iso = toIso(date);
    return (bookingsByDate[iso] || []).length > 0;
  };

  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates]);

  const isDateDisabled = (date: Date) => {
    if (!termCtx) return true;
    const iso = toIso(date);
    if (iso < termCtx.start_date || iso > termCtx.end_date) return true;
    // Existing lessons/attendance: always allow opening the dialog (even past dates)
    if (dateHasBooking(date)) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return true;
    if (holidaySet.has(iso)) return true;
    if (!dateHasAvailable(date)) return true;
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
      Help
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
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value.toUpperCase())} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value.toUpperCase())} className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of birth (recommended)</Label>
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

                  {isGradingMatched && gradingDefault ? (
                    <div className="space-y-2">
                      <div className="rounded-md bg-muted/60 p-2 text-xs text-foreground">
                        {gradingDefault.message}
                      </div>
                      {gradingDefault.product || (isSGFoundation && (FOUNDATION_LEVELS as readonly string[]).some(l => !!findFoundationProduct(l))) ? (
                        <>
                          {/* Single (non-SG/non-Foundation) grading product preview */}
                          {!isSGFoundation && gradingDefault.product && (
                            <div className="border rounded-lg p-2.5">
                              <p className="text-sm font-medium">{gradingDefault.product.product_name}</p>
                              <p className="text-xs text-muted-foreground">${getDisplayPrice(gradingDefault.product, branch?.country).toFixed(2)}</p>
                            </div>
                          )}

                          {/* SG Foundation: show only the auto-selected (current belt) product */}
                          {isSGFoundation && (FOUNDATION_LEVELS as readonly string[]).map(level => {
                            if (!selectedFoundationLevels.has(level)) return null;
                            const prod = findFoundationProduct(level);
                            if (!prod) return null;
                            return (
                              <div key={level} className="border rounded-lg p-2.5">
                                <p className="text-sm font-medium">{prod.product_name}</p>
                                <p className="text-xs text-muted-foreground">${getDisplayPrice(prod, branch?.country).toFixed(2)}</p>
                              </div>
                            );
                          })}

                          {/* Grading Slot — below Foundation checkboxes, above Continue */}
                          <div className="space-y-1.5">
                            <Label className="text-xs">Grading Slot</Label>
                            <Select value={selectedGradingSlotId} onValueChange={setSelectedGradingSlotId} disabled={gradingSlotsLoading || selectedGradingProducts.length === 0}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={gradingSlotsLoading ? 'Loading slots…' : 'Pick grading slot'} /></SelectTrigger>
                              <SelectContent>
                                {gradingSlots.map(slot => (
                                  <SelectItem key={slot.id} value={slot.id}>{formatGradingSlotLabel(slot)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!gradingSlotsLoading && selectedGradingProducts.length > 0 && gradingSlots.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No eligible grading slots available right now.</p>
                            )}
                          </div>

                          {/* Live total preview */}
                          {selectedGradingProducts.length > 0 && (
                            <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t">
                              <span>Total</span>
                              <span className="tabular-nums">
                                ${selectedGradingProducts.reduce((s, p) => s + getDisplayPrice(p, branch?.country), 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No eligible grading product available right now.</p>
                      )}
                    </div>
                  ) : (
                    products.map(p => (
                      <ProductRow
                        key={p.product_id}
                        product={p}
                        branchCountry={branch?.country}
                        terms={p.is_term_based ? chatTerms : undefined}
                        defaultGender={matched?.gender || gender || ''}
                        isLessonCategory={payCategory?.id === SCHOOL_FEES_CATEGORY_ID}
                        draft={rowDrafts[p.product_id]}
                        onDraftChange={(d) => setRowDrafts(prev => ({ ...prev, [p.product_id]: d }))}
                      />
                    ))
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={goBack} className="flex-1 h-10">Back</Button>
                    <Button
                      onClick={() => {
                        if (isGradingMatched) {
                          if (selectedGradingProducts.length === 0) {
                            toast.error('Please select at least one grading level');
                            return;
                          }
                          if (!selectedGradingSlotId) {
                            toast.error('Please pick a grading slot');
                            return;
                          }
                          setCart(selectedGradingProducts.map(p => ({
                            product: p,
                            size: null,
                            qty: 1,
                            gradingSlotId: selectedGradingSlotId,
                          })));
                          goTo('payment_pay');
                          return;
                        }
                        // Non-grading: build cart from picked rows
                        const pickedEntries = products
                          .map(p => ({ p, d: rowDrafts[p.product_id] }))
                          .filter(x => x.d?.picked);
                        if (pickedEntries.length === 0) {
                          toast.error('Please select at least one item');
                          return;
                        }
                        const newCart: CartItem[] = [];
                        for (const { p, d } of pickedEntries) {
                          const sizes = p.requires_size ? (p.available_sizes || getVariantArray(p, 'sizes')) : [];
                          const colors = getVariantArray(p, 'colors');
                          const genders = getVariantArray(p, 'genders');
                          const showTerms = p.is_term_based && (chatTerms || []).some(t => !t.is_paid);
                          if (p.requires_size && sizes.length > 0 && !d.size) {
                            toast.error(`Pick size for ${p.product_name}`); return;
                          }
                          if (colors.length > 0 && !d.color) {
                            toast.error(`Pick colour for ${p.product_name}`); return;
                          }
                          if (genders.length > 0 && !d.gender) {
                            toast.error(`Pick gender for ${p.product_name}`); return;
                          }
                          if (showTerms && !d.termId) {
                            toast.error(`Pick term for ${p.product_name}`); return;
                          }
                          const selectedOptions = {
                            size: d.size || null,
                            color: d.color || null,
                            gender: d.gender || null,
                          };
                          const sizeVariant = [d.size, d.color, d.gender].filter(Boolean).join(' / ') || null;
                          const termName = showTerms
                            ? (chatTerms.find(t => t.term_id === d.termId)?.term_name ?? null)
                            : null;
                          newCart.push({
                            product: p,
                            size: sizeVariant,
                            selectedOptions,
                            gradingSlotId: null,
                            termId: showTerms ? d.termId : null,
                            termName,
                            qty: showTerms ? Math.max(1, d.qty || 1) : (payCategory?.id === SCHOOL_FEES_CATEGORY_ID ? Math.max(1, d.qty || 1) : 1),
                          });
                        }
                        setCart(newCart);
                        goTo('payment_pay');
                      }}
                      disabled={isGradingMatched
                        ? (selectedGradingProducts.length === 0 || !selectedGradingSlotId)
                        : !Object.values(rowDrafts).some(d => d?.picked)}
                      className="flex-1 h-10"
                    >
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
                  {isSGBranch ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums">${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">GST (9%)</span>
                        <span className="tabular-nums">${gstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="font-semibold">Total</span>
                        <span className="text-base font-bold tabular-nums">${totalWithTax.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">Amount to pay</span>
                      <span className="text-base font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                    </div>
                  )}
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

              {/* Term switcher: current + future invoiced terms */}
              {invoicedTerms.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {invoicedTerms.map(t => {
                    const active = t.term_id === selectedTermId;
                    return (
                      <button
                        key={t.term_id}
                        type="button"
                        onClick={() => setSelectedTermId(t.term_id)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1 text-[11px] whitespace-nowrap transition',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        )}
                      >
                        {t.term_name}{t.is_current ? ' · current' : ''}
                      </button>
                    );
                  })}
                </div>
              )}

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
                    const _today = new Date(); _today.setHours(0,0,0,0);
                    const isPastDate = pickedDate < _today;

                    return (
                      <div className="space-y-3">
                        {dayBookings.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Your booked classes</p>
                            {dayBookings.map(b => {
                              const picked = !!cancellations[b.id];
                              const now = new Date();
                              const lessonStart = new Date(`${b.scheduled_date}T${b.start_time}`);
                              const isPast = now.getTime() >= lessonStart.getTime();
                              const isAttendanceOnly = b.status === 'attended';
                              const cancellable = !isAttendanceOnly && now.getTime() < lessonStart.getTime() - 60 * 60 * 1000;
                              const att = b.attendance_status;
                              const attLabel =
                                att === 'present' ? 'Present'
                                : att === 'late' ? 'Late'
                                : att === 'absent' ? 'Absent'
                                : att === 'makeup' ? 'Makeup'
                                : att === 'trial' ? 'Trial'
                                : null;
                              const attClass =
                                att === 'present' || att === 'late' || att === 'makeup' || att === 'trial'
                                  ? 'text-emerald-600'
                                  : att === 'absent'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground';
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  disabled={!cancellable}
                                  className={cn(
                                    'w-full text-left rounded border min-h-11 px-3 py-1.5 text-sm flex items-center justify-between gap-2 transition-colors',
                                    picked
                                      ? 'border-destructive bg-destructive/10 text-destructive'
                                      : 'border-blue-500/40 bg-blue-500/5',
                                    cancellable ? 'hover:border-destructive/60' : 'cursor-default opacity-90',
                                  )}
                                  onClick={() => {
                                    if (!cancellable) return;
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
                                  <span className="flex flex-col">
                                    <span>{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}{b.class_type ? ` · ${b.class_type}` : ''}</span>
                                    {attLabel && (
                                      <span className={cn('text-[11px]', attClass)}>{attLabel}</span>
                                    )}
                                  </span>
                                  <span className="text-[11px] shrink-0">
                                    {picked
                                      ? 'Cancelling'
                                      : cancellable
                                        ? 'Tap to cancel'
                                        : isAttendanceOnly || (isPast && attLabel)
                                          ? 'Attended'
                                          : isPast
                                            ? 'Past'
                                            : 'Closed'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Available class times</p>
                          {isPastDate ? (
                            <p className="text-xs text-muted-foreground">Booking closed for past dates.</p>
                          ) : openSlots.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No open slots for this date.</p>
                          ) : null}
                          {!isPastDate && openSlots.map(s => {
                            const key = `${iso}_${s.id}`;
                            const picked = !!newBookings[key];
                            const full = s.isFull && !picked;
                            const tooLate = s.isTooLate && !picked;
                            const disabled = full || tooLate;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                  'w-full text-left rounded border h-11 px-3 text-sm flex items-center justify-between transition-colors',
                                  picked
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : disabled
                                      ? 'opacity-50 cursor-not-allowed border-border'
                                      : 'border-border hover:border-emerald-500/60'
                                )}
                                onClick={() => {
                                  if (picked) {
                                    setNewBookings(prev => { const n = { ...prev }; delete n[key]; return n; });
                                    return;
                                  }
                                  if (disabled) return;
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
                                  {picked ? 'Booking' : full ? 'Full' : tooLate ? 'Closed' : `${s.effectiveCount}/${s.max_capacity}`}
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
      <AlertDialog open={!!pendingPreorder} onOpenChange={(open) => !open && setPendingPreorder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preorder item</AlertDialogTitle>
            <AlertDialogDescription>
              Please allow 3–4 weeks for delivery. Do you want to add this preorder item to your cart?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPreorder) {
                  commitCartItem(
                    pendingPreorder.product,
                    pendingPreorder.size,
                    pendingPreorder.selectedOptions,
                    pendingPreorder.gradingSlotId,
                    pendingPreorder.termId,
                    pendingPreorder.termName,
                    pendingPreorder.qty,
                  );
                }
                setPendingPreorder(null);
              }}
            >
              Add to cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ProductRow: React.FC<{
  product: ChatProduct;
  branchCountry?: string | null;
  terms?: ChatTerm[];
  defaultGender?: string;
  isLessonCategory?: boolean;
  draft?: { picked: boolean; size: string; color: string; gender: string; termId: string; qty: number };
  onDraftChange: (d: { picked: boolean; size: string; color: string; gender: string; termId: string; qty: number }) => void;
}> = ({ product, branchCountry, terms, defaultGender, isLessonCategory, draft, onDraftChange }) => {
  const sizes = product.requires_size ? (product.available_sizes || getVariantArray(product, 'sizes')) : [];
  const colors = getVariantArray(product, 'colors');
  const genders = getVariantArray(product, 'genders');
  // Hide already-paid terms entirely
  const selectableTerms = useMemo(() => (terms || []).filter(t => !t.is_paid), [terms]);
  const showTerms = selectableTerms.length > 0;
  const defaultTerm = selectableTerms[0] || null;

  // Normalize defaultGender against allowed variant genders (case-insensitive)
  const normalizedDefaultGender = useMemo(() => {
    if (!defaultGender || genders.length === 0) return '';
    const match = genders.find(g => g.toLowerCase() === defaultGender.toLowerCase());
    return match || '';
  }, [defaultGender, genders]);

  const d = draft || {
    picked: false,
    size: '',
    color: '',
    gender: normalizedDefaultGender,
    termId: defaultTerm?.term_id || '',
    qty: Math.max(1, defaultTerm?.total_weeks || 1),
  };

  // Initialise draft on first mount so parent has a record (for defaults)
  useEffect(() => {
    if (!draft) onDraftChange(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If matched defaults arrive after first render, fill them in once
  useEffect(() => {
    if (!draft) return;
    let next = draft;
    if (!next.gender && normalizedDefaultGender) {
      next = { ...next, gender: normalizedDefaultGender };
    }
    if (showTerms && !next.termId && defaultTerm) {
      next = { ...next, termId: defaultTerm.term_id, qty: Math.max(1, defaultTerm.total_weeks || 1) };
    }
    if (next !== draft) onDraftChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedDefaultGender, defaultTerm?.term_id]);

  const update = (patch: Partial<typeof d>) => onDraftChange({ ...d, ...patch });
  const togglePicked = () => update({ picked: !d.picked });
  const selectedTerm = selectableTerms.find(t => t.term_id === d.termId) || null;
  const allTermsPaid = !!terms && terms.length > 0 && selectableTerms.length === 0;

  return (
    <div
      className={cn(
        'border rounded-lg p-2.5 space-y-2 cursor-pointer transition-colors',
        d.picked ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'hover:border-primary/40',
        allTermsPaid && 'opacity-60 cursor-not-allowed',
      )}
      onClick={(e) => {
        if (allTermsPaid) return;
        // Don't toggle when clicking on inner controls
        const target = e.target as HTMLElement;
        if (target.closest('[data-row-control]')) return;
        togglePicked();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{product.product_name}</p>
          <p className="text-xs text-muted-foreground">
            ${getDisplayPrice(product, branchCountry).toFixed(2)}{showTerms ? ' / week' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {product.requires_size && <Badge variant="secondary" className="text-[10px]">Size required</Badge>}
          {isPreorderProduct(product) && <Badge variant="outline" className="text-[10px]">Preorder</Badge>}
          {allTermsPaid && <Badge variant="outline" className="text-[10px]">All terms paid</Badge>}
        </div>
      </div>

      {d.picked && !allTermsPaid && (
        <div className="space-y-2" data-row-control onClick={(e) => e.stopPropagation()}>
          {showTerms && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={d.termId} onValueChange={(v) => {
                const t = selectableTerms.find(x => x.term_id === v);
                update({ termId: v, qty: Math.max(1, t?.total_weeks || 1) });
              }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick term" /></SelectTrigger>
                <SelectContent>
                  {selectableTerms.map(t => (
                    <SelectItem key={t.term_id} value={t.term_id}>{t.term_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={selectedTerm?.total_weeks ?? undefined}
                value={d.qty}
                onChange={(e) => update({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                className="h-9 text-xs"
                placeholder="Weeks"
              />
            </div>
          )}
          {!showTerms && isLessonCategory && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={d.qty || 1}
                onChange={(e) => update({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                className="h-9 text-xs"
                placeholder="Quantity"
              />
            </div>
          )}
          {product.requires_size && sizes.length > 0 && (
            <Select value={d.size} onValueChange={(v) => update({ size: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick size" /></SelectTrigger>
              <SelectContent>
                {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {colors.length > 0 && (
            <Select value={d.color} onValueChange={(v) => update({ color: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick colour" /></SelectTrigger>
              <SelectContent>{colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {genders.length > 0 && (
            <Select value={d.gender} onValueChange={(v) => update({ gender: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick gender" /></SelectTrigger>
              <SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicHelloChat;
