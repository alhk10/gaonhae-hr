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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import kyorugiPoster from '@/assets/perth-kyorugi-seminar.png.asset.json';
import poomsaePoster from '@/assets/perth-poomsae-seminar.png.asset.json';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = Array.from({ length: 80 }, (_, i) => 2023 - i);

type Availability = { competition_left: number; competition_closed: boolean; seminars: Record<string, number> };

const PublicPerthComp: React.FC = () => {
  const [avail, setAvail] = useState<Availability | null>(null);
  const [first, setFirst] = useState(''); const [last, setLast] = useState('');
  const [gender, setGender] = useState('');
  const [d, setD] = useState(''); const [m, setM] = useState(''); const [y, setY] = useState('');
  const [club, setClub] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('+61 ');
  const [clubs, setClubs] = useState<string[]>([]);
  const [clubOther, setClubOther] = useState('');
  const [isGaonhae, setIsGaonhae] = useState(false);
  const [grade, setGrade] = useState('');
  const [seminars, setSeminars] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    id: string; total: number; unit: number; matched: boolean; claimed: boolean;
    name: string; club: string; grade: string; email: string; phone: string;
    seminars: string[]; events: string[]; division: string;
  } | null>(null);
  const clientRef = useRef(newClientRef());
  const [logOpen, setLogOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);

  const loadAvail = () => supabase.rpc('get_perth_event_availability' as any).then(({ data }) => data && setAvail(data as any));
  const loadClubs = () => supabase.rpc('get_perth_event_clubs' as any).then(({ data }) => {
    if (data) setClubs(['Gaonhae Taekwondo', ...(data as any[]).map((r) => r.club).filter((c) => c !== 'Gaonhae Taekwondo')]);
  });
  useEffect(() => { document.title = 'Perth Seminars & Poomsae Championship 2026 | Gaonhae Taekwondo'; loadAvail(); loadClubs(); }, []);

  const effectiveClub = club === '__other__' ? clubOther : club;

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
    if (!first.trim() || !last.trim() || !gender || !dob || !effectiveClub.trim() || !email.trim() || phone.trim().length < 6 || !grade)
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
          club: effectiveClub, grade, email, phone, seminars, comp_events: events, is_gaonhae_student: isGaonhae,
          proof_url: signed?.signedUrl || path, signature_data_url: signature,
        },
      });
      if (error) throw error;
      const r = data as any;
      setDone({
        id: String(r.id), total: Number(r.total_amount), unit: Number(r.unit_price),
        matched: !!r.is_gaonhae_student, claimed: isGaonhae,
        name: `${first.trim()} ${last.trim()}`, club: effectiveClub.trim(), grade, email: email.trim(), phone: phone.trim(),
        seminars: [...seminars], events: [...events], division: age ? ageDivision(age) : '',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast.error(e?.message || 'Submission failed, please try again');
      loadAvail();
    } finally { setSubmitting(false); }
  };

  const downloadConfirmation = async () => {
    if (!done) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let yPos = 18;
    try {
      const img = new Image();
      img.src = '/lovable-uploads/gaonhae-logo-transparent.png';
      await img.decode();
      const h = 22;
      doc.addImage(img, 'PNG', 105 - (h * (img.width / img.height)) / 2, yPos, h * (img.width / img.height), h);
      yPos += h + 8;
    } catch { yPos += 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('Gaonhae Taekwondo Perth Seminars & Poomsae Championship 2026', 105, yPos, { align: 'center' }); yPos += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('28 to 29 November 2026 · Scarborough Community Centre 2, Function Room', 105, yPos, { align: 'center' }); yPos += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('REGISTRATION CONFIRMATION', 105, yPos, { align: 'center' }); yPos += 9;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const line = (label: string, value: string) => { doc.setFont('helvetica', 'bold'); doc.text(label, 20, yPos); doc.setFont('helvetica', 'normal'); doc.text(value, 70, yPos); yPos += 6; };
    line('Reference:', done.id);
    line('Submitted:', formatDateTime(new Date().toISOString()));
    line('Name:', done.name);
    line('Club:', done.club);
    line('Grade / Belt:', gradeLabel(done.grade));
    line('Email:', done.email);
    line('Mobile:', done.phone);
    yPos += 4;
    doc.setFont('helvetica', 'bold'); doc.text('Registered for:', 20, yPos); yPos += 6; doc.setFont('helvetica', 'normal');
    done.seminars.forEach((c) => { doc.text(`• ${seminarLabel(c)} — $${done.unit.toFixed(2)}`, 24, yPos); yPos += 5.5; });
    done.events.forEach((c) => { doc.text(`• Competition: ${done.division} · ${eventLabel(c)} — $${done.unit.toFixed(2)}`, 24, yPos); yPos += 5.5; });
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total paid: $${done.total.toFixed(2)} AUD (GST included)`, 20, yPos); yPos += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    if (done.matched) { doc.text('Gaonhae student rate applied.', 20, yPos); yPos += 5; }
    doc.text('Payment is pending verification by our staff. Please keep this confirmation for your records.', 20, yPos);
    doc.save(`perth-2026-confirmation-${done.id.slice(0, 8)}.pdf`);
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
            <Button onClick={downloadConfirmation} className="w-full"><Download className="h-4 w-4 mr-2" /> Download Confirmation (PDF)</Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">Register another participant</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="perth-theme min-h-screen bg-background text-foreground">
      <header className="bg-background text-foreground border-b border-border">
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

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 text-left">
        <div className="grid sm:grid-cols-2 gap-3">
          <img src={poomsaePoster.url} alt="Poomsae Seminar — Master Kang Hyeonman" className="w-full rounded-md border border-border" loading="lazy" />
          <img src={kyorugiPoster.url} alt="Kyorugi Seminar — Master Jang Heejae" className="w-full rounded-md border border-border" loading="lazy" />
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Saturday 28 Nov 2026 — Seminars</CardTitle>
            <p className="text-sm text-muted-foreground">$45 per seminar · Gaonhae students $40 · GST included</p></CardHeader>
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
                <li>Competitors perform the designated poomsae; winners advance to the next round.</li></ul></section>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-10" onClick={() => setRegOpen(true)}>Register & pay</Button>
        </div>

        <Dialog open={regOpen} onOpenChange={setRegOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register & pay</DialogTitle>
              <DialogDescription className="sr-only">Complete participant details, select seminars or events, upload payment proof and submit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
              <div><Label>Club</Label>
                <Select value={club} onValueChange={setClub}>
                  <SelectTrigger><SelectValue placeholder="Select your invited club" /></SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__other__">Other / add a new club</SelectItem>
                  </SelectContent>
                </Select>
                {club === '__other__' && <Input className="mt-2" value={clubOther} onChange={(e) => setClubOther(e.target.value)} placeholder="Type your club name" />}
              </div>
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
            </div>
          </DialogContent>
        </Dialog>
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

  const [tab, setTab] = useState<'seminars' | 'comp'>('seminars');

  const seminarSections = useMemo(() => SEMINARS.map((s) => ({
    key: s.code, title: s.name, cap: s.cap, rows: (rows || []).filter((r) => r.seminars?.includes(s.code)),
  })), [rows]);

  const compRows = useMemo(() => (rows || []).filter((r) => r.comp_events?.length), [rows]);

  // Groups: age (youngest first) → event (lowest belt first) → gender (Female, Male)
  const compGroups = useMemo(() => {
    const divOrder = (d: string | null) => { const n = parseInt(d || ''); return isNaN(n) ? 999 : n; };
    const evOrder = (c: string) => { const i = COMP_EVENTS.findIndex((e) => e.code === c); return i < 0 ? 999 : i; };
    const gOrder = (g: string) => (/^f/i.test(g || '') ? 0 : /^m/i.test(g || '') ? 1 : 2);
    const map = new Map<string, { div: string; event: string; gender: string; rows: any[] }>();
    compRows.forEach((r) => (r.comp_events as string[]).forEach((ev) => {
      const key = `${r.age_division}|${ev}|${r.gender}`;
      if (!map.has(key)) map.set(key, { div: r.age_division || '-', event: ev, gender: r.gender || '-', rows: [] });
      map.get(key)!.rows.push(r);
    }));
    const list = [...map.values()];
    list.forEach((g) => g.rows.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)));
    return list.sort((a, b) => divOrder(a.div) - divOrder(b.div) || evOrder(a.event) - evOrder(b.event) || gOrder(a.gender) - gOrder(b.gender));
  }, [compRows]);

  const groupTitle = (g: { div: string; event: string; gender: string; rows: any[] }) =>
    `${g.div} Years · ${g.gender} · ${eventLabel(g.event)} — ${g.rows.length} competitor${g.rows.length === 1 ? '' : 's'}`;

  const loadPdf = async (title: string) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text(`Perth Seminars & Poomsae Championship 2026 — ${title}`, 14, 14);
    doc.setFontSize(9); doc.text(`Generated ${formatDateTime(new Date())}`, 14, 20);
    return { doc, autoTable };
  };

  const downloadSeminarPdf = async () => {
    const { doc, autoTable } = await loadPdf('Seminar Registration Log');
    let y = 24;
    seminarSections.forEach((sec) => {
      doc.setFontSize(11); doc.text(`${sec.title} — ${sec.rows.length}/60`, 14, y + 6);
      autoTable(doc, {
        startY: y + 8, styles: { fontSize: 7 },
        head: [['#', 'Name', 'Gender', 'DOB', 'Grade', 'Club', 'Contact', 'Amount', 'Gaonhae', 'Submitted']],
        body: sec.rows.length ? sec.rows.map((r, i) => [i + 1, `${r.first_name} ${r.last_name}`, r.gender, formatDate(r.date_of_birth), gradeLabel(r.grade), r.club,
          `${r.email}\n${r.phone}`, `$${Number(r.total_amount).toFixed(2)}`, r.is_gaonhae_student ? 'Yes' : 'No', formatDateTime(r.created_at)]) : [['', 'No registrations', '', '', '', '', '', '', '', '']],
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });
    doc.save('perth-2026-seminar-log.pdf');
  };

  const downloadCompetitionPdf = async () => {
    const { doc, autoTable } = await loadPdf(`Competition Registration Log (${compRows.length}/100)`);
    let y = 24;
    if (!compGroups.length) doc.text('No registrations yet.', 14, 30);
    compGroups.forEach((g) => {
      if (y > 180) { doc.addPage(); y = 10; }
      doc.setFontSize(11); doc.text(groupTitle(g), 14, y + 6);
      autoTable(doc, {
        startY: y + 8, styles: { fontSize: 8 },
        head: [['#', 'Name', 'DOB', 'Grade', 'Club', 'Contact', 'Gaonhae']],
        body: g.rows.map((r, i) => [i + 1, `${r.first_name} ${r.last_name}`, formatDate(r.date_of_birth), gradeLabel(r.grade), r.club, `${r.email}\n${r.phone}`, r.is_gaonhae_student ? 'Yes' : 'No']),
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });
    doc.save('perth-2026-competition-log.pdf');
  };

  const personLine = (r: any, i: number) => (
    <div key={`${r.id}-${i}`} className="border rounded p-2">
      <div className="flex flex-wrap gap-x-3"><strong>{i + 1}. {r.first_name} {r.last_name}</strong><span>{r.gender}</span><span>{formatDate(r.date_of_birth)}</span>
        <span>{gradeLabel(r.grade)}</span><span>{r.club}</span><span>${Number(r.total_amount).toFixed(2)}{r.is_gaonhae_student ? ' (Gaonhae)' : ''}</span></div>
      <div className="flex flex-wrap gap-x-3 text-muted-foreground"><span>{r.email} · {r.phone}</span>
        {r.proof_url?.startsWith('http') && <a className="underline" href={r.proof_url} target="_blank" rel="noreferrer">Proof</a>}
        <span>{formatDateTime(r.created_at)}</span></div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[85vh] overflow-y-auto text-left">
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
              {SEMINARS.map((s) => <span key={s.code}>{s.short} {counts[s.code]}/{s.cap}</span>)}
            </div>
            <div className="flex flex-wrap gap-2 items-center border-b pb-2">
              <Button size="sm" variant={tab === 'seminars' ? 'default' : 'outline'} onClick={() => setTab('seminars')}>Seminars</Button>
              <Button size="sm" variant={tab === 'comp' ? 'default' : 'outline'} onClick={() => setTab('comp')}>Competition</Button>
              {tab === 'seminars'
                ? <Button size="sm" variant="secondary" className="ml-auto" onClick={downloadSeminarPdf}><Download className="h-4 w-4 mr-1" /> Seminar Log PDF</Button>
                : <Button size="sm" variant="secondary" className="ml-auto" onClick={downloadCompetitionPdf}><Download className="h-4 w-4 mr-1" /> Competition Log PDF</Button>}
            </div>
            {tab === 'seminars' ? seminarSections.map((sec) => (
              <div key={sec.key} className="space-y-1">
                <p className="font-semibold text-sm border-b pb-1">{sec.title} — {sec.rows.length}/{sec.cap}</p>
                {sec.rows.length === 0 ? <p className="text-muted-foreground">No registrations yet.</p> : sec.rows.map(personLine)}
              </div>
            )) : compGroups.length === 0 ? <p>No competition registrations yet.</p> : compGroups.map((g) => (
              <div key={`${g.div}|${g.event}|${g.gender}`} className="space-y-1">
                <p className="font-semibold text-sm border-b pb-1">{groupTitle(g)}</p>
                {g.rows.map(personLine)}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublicPerthComp;
