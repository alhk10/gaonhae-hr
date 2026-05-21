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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
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

  // Lesson schedule/reschedule
  const [lessonMode, setLessonMode] = useState<'schedule' | 'reschedule'>('schedule');
  const [lessonDay, setLessonDay] = useState('');
  const [lessonMonth, setLessonMonth] = useState('');
  const [lessonYear, setLessonYear] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [lessonExistingDesc, setLessonExistingDesc] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');


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
      const m = await matchStudentByIdentity(firstName, lastName, dob, branchId);
      if (m) {
        setMatched(m);
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
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight">Hello 👋</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Gaonhae Taekwondo</p>
            </div>
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
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 …" className="h-10" />
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
                {matched.current_belt ? <> ({matched.current_belt} belt)</> : null}. What would you like to do?
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
              <Bubble who="bot">I couldn't find a matching student record. What would you like to do?</Bubble>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <Button onClick={() => goTo('register')} variant="outline" className="w-full h-11 justify-between">
                    Register a new student <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => goTo('payment_category')} variant="outline" className="w-full h-11 justify-between">
                    Make a payment <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => goTo('trial')} variant="outline" className="w-full h-11 justify-between">
                    Sign up for a free trial <ArrowRight className="h-4 w-4" />
                  </Button>
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
