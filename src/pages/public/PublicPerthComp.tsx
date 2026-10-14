/**
 * Public Perth Seminars & Poomsae Championship 2026 page (/perthcomp).
 * Registrations go to perth_event_registrations through SECURITY DEFINER RPCs;
 * pricing, eligibility, caps and deadline are enforced server-side.
 * A discreet lock icon opens a password-checked registration log (PDF export).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, CheckCircle2, Download, Lock, MapPin, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import PaymentInfoDisplay from '@/components/payment/PaymentInfoDisplay';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import SignaturePad from '@/components/common/SignaturePad';
import { newClientRef } from '@/utils/publicPaymentValidation';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import {
  SEMINARS, COMP_EVENTS, GRADES, GAONHAE_BELTS, AGE_DIVISIONS, PERTH_BANK_INFO,
  ageByBirthYear, gradeRank, seminarIneligibility, eventIneligibility, ageDivision, eventLabel, seminarLabel, gradeLabel,
} from '@/utils/perthCompRules';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = Array.from({ length: 80 }, (_, i) => 2023 - i);

type Availability = { competition_left: number; competition_closed: boolean; seminars: Record<string, number> };

const PublicPerthComp: React.FC = () => {
  const [avail, setAvail] = useState<Availability | null>(null);
  const [first, setFirst] = useState(''); const [last, setLast] = useState('');
  const [gender, setGender] = useState('');
  const [d, setD] = useState(''); const [m, setM] = useState(''); const [y, setY] = useState('');
  const [club, setClub] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('+61 ');
  const [isGaonhae, setIsGaonhae] = useState(false);
  const [grade, setGrade] = useState('');
  const [seminars, setSeminars] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ total: number; unit: number; matched: boolean; claimed: boolean } | null>(null);
  const clientRef = useRef(newClientRef());
  const [logOpen, setLogOpen] = useState(false);

  const loadAvail = () => supabase.rpc('get_perth_event_availability' as any).then(({ data }) => data && setAvail(data as any));
  useEffect(() => { document.title = 'Perth Seminars & Poomsae Championship 2026 | Gaonhae Taekwondo'; loadAvail(); }, []);

  const dob = y && m && d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  const age = dob ? ageByBirthYear(dob) : null;
  const rank = grade ? gradeRank(grade) : null;
  const unit = isGaonhae ? 40 : 45;
  const total = unit * (seminars.length + events.length);

  // Drop selections that become ineligible when grade/DOB change.
  useEffect(() => {
    setSeminars((s) => s.filter((c) => !seminarIneligibility(c, age, rank, s)));
    setEvents((e) => e.filter((c) => !eventIneligibility(c, rank)));
  }, [age, rank]);

  const toggle = (list: string[], set: (v: string[]) => void, code: string) =>
    set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  const submit = async () => {
    if (!first.trim() || !last.trim() || !gender || !dob || !club.trim() || !email.trim() || phone.trim().length < 6 || !grade)
      return toast.error('Please complete all participant details');
    if (seminars.length + events.length === 0) return toast.error('Select at least one seminar or competition event');
    if (!agree || !signature) return toast.error('Please accept the indemnity and sign');
    if (!proof) return toast.error('Please upload your proof of payment');
    setSubmitting(true);
    try {
      const ext = proof.name.split('.').pop() || 'jpg';
      const path = `public-seminars/perth-2026/${Date.now()}_${clientRef.current}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, proof, { upsert: false, contentType: proof.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 60 * 24 * 365 * 2);
      const { data, error } = await supabase.rpc('submit_perth_event_registration' as any, {
        p: {
          client_ref: clientRef.current, first_name: first, last_name: last, gender, date_of_birth: dob,
          club, grade, email, phone, seminars, comp_events: events, is_gaonhae_student: isGaonhae,
          proof_url: signed?.signedUrl || path, signature_data_url: signature,
        },
      });
      if (error) throw error;
      const r = data as any;
      setDone({ total: Number(r.total_amount), unit: Number(r.unit_price), matched: !!r.is_gaonhae_student, claimed: isGaonhae });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast.error(e?.message || 'Submission failed, please try again');
      loadAvail();
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="perth-theme min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto" />
            <h1 className="text-xl font-bold">Registration received</h1>
            <p>Total: <strong>${done.total.toFixed(2)} AUD</strong> (GST included)</p>
            {done.claimed && !done.matched && (
              <Alert><AlertDescription>We couldn't match these details to an active Gaonhae student, so the $45 rate applies. Our staff will contact you if an adjustment is needed.</AlertDescription></Alert>
            )}
            <p className="text-sm text-muted-foreground">Thank you for your payment. Your payment will be verified by our staff.</p>
            <Button onClick={() => window.location.reload()}>Register another participant</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="perth-theme min-h-screen bg-background text-foreground">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-3">
          <img src="/lovable-uploads/gaonhae-logo-transparent.png" alt="Gaonhae Taekwondo" className="h-20 mx-auto" />
          <p className="uppercase tracking-[0.3em] text-secondary text-xs font-semibold">Gaonhae Taekwondo</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold">Perth Seminars &amp; Poomsae Championship 2026</h1>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-secondary" /> 28 to 29 November 2026</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-secondary" /> Scarborough Community Centre 2, Function Room</span>
          </div>
        </div>
        <div className="h-1.5 bg-accent" />
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Saturday 28 Nov 2026 — Seminars</CardTitle>
            <p className="text-sm text-muted-foreground">$45 per seminar · Gaonhae students $40 · GST included · 60 places per seminar</p></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {SEMINARS.map((s) => (
              <div key={s.code} className="rounded-md border p-3 border-l-4 border-l-accent">
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm">{s.time}</p>
                <p className="text-xs text-muted-foreground">{s.who}</p>
                <p className="text-xs mt-1 font-medium">{avail ? (avail.seminars[s.code] > 0 ? `${avail.seminars[s.code]} places left` : 'Full') : ''}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-secondary" /> Sunday 29 Nov 2026 — Poomsae Competition</CardTitle>
            <p className="text-sm text-muted-foreground">$45 per event · Gaonhae students $40 · GST included · No spectator fee · Registration closes 10 Nov 2026 · Max 100 participants{avail ? ` (${Math.max(0, avail.competition_left)} places left)` : ''}</p></CardHeader>
          <CardContent className="text-sm space-y-3">
            <section><h3 className="font-semibold">1. Eligibility</h3>
              <ul className="list-disc pl-5"><li>Open to competitors from invited clubs only.</li><li>Competitors compete by age category, gender and event category.</li><li>Age is determined by birth year.</li></ul></section>
            <section><h3 className="font-semibold">2. Age categories</h3><p>{AGE_DIVISIONS.join(' · ')} years</p></section>
            <section><h3 className="font-semibold">3. Poomsae events</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                <ul className="list-disc pl-5">{COMP_EVENTS.filter((e) => e.kind === 'geup').map((e) => <li key={e.code}>{e.label}</li>)}</ul>
                <ul className="list-disc pl-5">{COMP_EVENTS.filter((e) => e.kind === 'poomdan').map((e) => <li key={e.code}>{e.label}</li>)}</ul>
              </div></section>
            <section><h3 className="font-semibold">4. Event eligibility</h3>
              <ul className="list-disc pl-5"><li>Competitors may enter their own grade event and any higher grade event, but not events below their current grade.</li>
                <li>Poom/Dan holders may only enter Poom/Dan events.</li><li>Maximum of two (2) events.</li><li>Eligibility is based on rank at the time of registration.</li></ul></section>
            <section><h3 className="font-semibold">5. Competition structure</h3>
              <ul className="list-disc pl-5"><li>Single-elimination individual recognised poomsae competition.</li><li>Grouped by age category, gender and event; randomly allocated into elimination groups.</li>
                <li>Competitors perform the designated poomsae; winners advance to the next round.</li><li>Where six competitors are registered, they are randomly split into two groups of three.</li></ul></section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Register &amp; pay</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>First name</Label><Input value={first} onChange={(e) => setFirst(e.target.value.toUpperCase())} /></div>
              <div><Label>Last name</Label><Input value={last} onChange={(e) => setLast(e.target.value.toUpperCase())} /></div>
              <div><Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
              <div><Label>Date of birth</Label>
                <div className="grid grid-cols-3 gap-1">
                  <Select value={d} onValueChange={setD}><SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent></Select>
                  <Select value={m} onValueChange={setM}><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>{MONTHS.map((n, i) => <SelectItem key={n} value={String(i + 1)}>{n}</SelectItem>)}</SelectContent></Select>
                  <Select value={y} onValueChange={setY}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>{YEARS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select>
                </div>
                {age !== null && <p className="text-xs text-muted-foreground mt-1">Competition age {age}{ageDivision(age) ? ` · Division ${ageDivision(age)}` : ''}</p>}
              </div>
              <div><Label>Club</Label><Input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Your invited club" /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Mobile</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>

            <label className="flex items-center gap-2 text-sm"><Checkbox checked={isGaonhae} onCheckedChange={(v) => { setIsGaonhae(!!v); setGrade(''); }} /> I am a Gaonhae Taekwondo student ($40 rate)</label>

            <div className="sm:w-1/2"><Label>{isGaonhae ? 'Gaonhae belt' : 'Grade'}</Label>
              <Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(isGaonhae ? GAONHAE_BELTS : GRADES).map((g) => <SelectItem key={g.label} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
              {grade && <p className="text-xs text-muted-foreground mt-1">{gradeLabel(grade)}</p>}
            </div>

            <div><p className="font-semibold text-sm mb-1">Seminars (28 Nov)</p>
              <div className="space-y-1">{SEMINARS.map((s) => {
                const full = avail ? avail.seminars[s.code] <= 0 : false;
                const why = full ? 'Full' : seminarIneligibility(s.code, age, rank, seminars);
                return (
                  <label key={s.code} className={`flex items-start gap-2 text-sm ${why && !seminars.includes(s.code) ? 'opacity-50' : ''}`}>
                    <Checkbox disabled={!!why && !seminars.includes(s.code)} checked={seminars.includes(s.code)} onCheckedChange={() => toggle(seminars, setSeminars, s.code)} />
                    <span>{s.name} · {s.time}{why && !seminars.includes(s.code) ? <em className="text-muted-foreground"> — {why}</em> : null}</span>
                  </label>);
              })}</div></div>

            <div><p className="font-semibold text-sm mb-1">Competition events (29 Nov, max 2)</p>
              {avail?.competition_closed ? <p className="text-sm text-accent">Competition registration has closed.</p>
                : avail && avail.competition_left <= 0 ? <p className="text-sm text-accent">The competition is full.</p>
                : !grade ? <p className="text-xs text-muted-foreground">Select a grade to see eligible events.</p>
                : rank === -1 ? <p className="text-xs text-muted-foreground">Foundation (non-geup) competitors cannot enter the competition.</p>
                : <div className="grid sm:grid-cols-2 gap-1">{COMP_EVENTS.map((e) => {
                    if (eventIneligibility(e.code, rank)) return null;
                    const max = events.length >= 2 && !events.includes(e.code);
                    return (
                      <label key={e.code} className={`flex items-center gap-2 text-sm ${max ? 'opacity-50' : ''}`}>
                        <Checkbox disabled={max} checked={events.includes(e.code)} onCheckedChange={() => toggle(events, setEvents, e.code)} /> {e.label}
                      </label>);
                  })}</div>}
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>{seminars.length + events.length} × ${unit.toFixed(2)}</span><strong>${total.toFixed(2)} AUD</strong></div>
              <p className="text-xs text-muted-foreground">Includes GST of ${(total / 11).toFixed(2)}{isGaonhae ? ' · $40 rate confirmed against our student records on submit' : ''}</p>
            </div>

            <PaymentInfoDisplay paymentMethod="bank_transfer" bankTransferInfo={PERTH_BANK_INFO} />
            <ProofOfPaymentUpload value={proof} onChange={setProof} required />

            <div className="text-xs text-muted-foreground border rounded-md p-3 max-h-40 overflow-y-auto">
              The participant (or parent/legal guardian of a participant under 18 years of age) acknowledges that participation in Taekwondo seminars and competitions involves inherent risks of injury, and voluntarily accepts all such risks. The participant and/or parent or legal guardian releases Gaonhae Taekwondo, its instructors, officials, volunteers and venue providers from liability for any injury, loss or damage arising from participation, except where liability cannot be excluded under Australian law, and consents to photographs and videos being used for promotional and educational purposes.
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} /> I agree to the indemnity above</label>
            <div><Label>Signature (participant or parent/guardian)</Label><SignaturePad value={signature} onChange={setSignature} /></div>

            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting} onClick={submit}>
              {submitting ? 'Submitting…' : `Submit registration · $${total.toFixed(2)}`}
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="max-w-4xl mx-auto px-4 pb-6 flex justify-between items-center text-xs text-muted-foreground">
        <span>© 2026 Gaonhae Taekwondo</span>
        <button aria-label="Staff log" className="opacity-30 hover:opacity-80" onClick={() => setLogOpen(true)}><Lock className="h-3.5 w-3.5" /></button>
      </footer>
      <PerthLogDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
};

const PerthLogDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void }> = ({ open, onOpenChange }) => {
  const [pw, setPw] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const unlock = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_perth_event_log' as any, { p_password: pw });
    setLoading(false);
    if (error) return toast.error('Incorrect password');
    setRows((data as any[]) || []);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { comp: 0 };
    SEMINARS.forEach((s) => (c[s.code] = 0));
    (rows || []).forEach((r) => { if (r.comp_events?.length) c.comp++; r.seminars?.forEach((s: string) => (c[s] = (c[s] || 0) + 1)); });
    return c;
  }, [rows]);

  const downloadPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text('Perth Seminars & Poomsae Championship 2026 — Registration Log', 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated ${formatDateTime(new Date())} · Competition ${counts.comp}/100 · ${SEMINARS.map((s) => `${s.short} ${counts[s.code]}/60`).join(' · ')}`, 14, 20);
    autoTable(doc, {
      startY: 24, styles: { fontSize: 7 },
      head: [['#', 'Name', 'Gender', 'DOB', 'Div', 'Grade', 'Club', 'Contact', 'Seminars', 'Events', 'Amount', 'Gaonhae', 'Submitted']],
      body: (rows || []).map((r, i) => [i + 1, `${r.first_name} ${r.last_name}`, r.gender, formatDate(r.date_of_birth), r.age_division || '-',
        gradeLabel(r.grade), r.club, `${r.email}\n${r.phone}`, r.seminars.map(seminarLabel).join(', ') || '-',
        r.comp_events.map(eventLabel).join(', ') || '-', `$${Number(r.total_amount).toFixed(2)}`, r.is_gaonhae_student ? 'Yes' : 'No', formatDateTime(r.created_at)]),
    });
    doc.save('perth-2026-registration-log.pdf');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registration log</DialogTitle></DialogHeader>
        {!rows ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); unlock(); }}>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus />
            <Button type="submit" disabled={loading}>Unlock</Button>
          </form>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-semibold">Competition {counts.comp}/100</span>
              {SEMINARS.map((s) => <span key={s.code}>{s.short} {counts[s.code]}/60</span>)}
              <Button size="sm" className="ml-auto" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
            </div>
            {rows.length === 0 ? <p>No registrations yet.</p> : rows.map((r, i) => (
              <div key={r.id} className="border rounded p-2">
                <div className="flex flex-wrap gap-x-3"><strong>{i + 1}. {r.first_name} {r.last_name}</strong><span>{r.gender}</span><span>{formatDate(r.date_of_birth)}</span>
                  <span>{gradeLabel(r.grade)}</span><span>{r.club}</span><span>${Number(r.total_amount).toFixed(2)}{r.is_gaonhae_student ? ' (Gaonhae)' : ''}</span></div>
                <div className="flex flex-wrap gap-x-3 text-muted-foreground"><span>{r.email} · {r.phone}</span>
                  <span>Seminars: {r.seminars.map(seminarLabel).join(', ') || '-'}</span>
                  <span>Events{r.age_division ? ` (${r.age_division})` : ''}: {r.comp_events.map(eventLabel).join(', ') || '-'}</span>
                  {r.proof_url?.startsWith('http') && <a className="underline" href={r.proof_url} target="_blank" rel="noreferrer">Proof</a>}
                  <span>{formatDateTime(r.created_at)}</span></div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublicPerthComp;
