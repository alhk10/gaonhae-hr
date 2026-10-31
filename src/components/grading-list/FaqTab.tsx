import { useMemo, useState } from 'react';
import { Search, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import parentGuide from '@/assets/faq/gaonhae-hello-parent-guide.pdf.asset.json';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import student1 from '@/assets/faq/student-1.jpg';
import student1b from '@/assets/faq/student-1b.jpg';
import student2 from '@/assets/faq/student-2.jpg';
import register1 from '@/assets/faq/register-1.jpg';
import register2 from '@/assets/faq/register-2.jpg';
import invoice1 from '@/assets/faq/invoice-1.jpg';
import invoice2 from '@/assets/faq/invoice-2.jpg';
import attendance1 from '@/assets/faq/attendance-1.jpg';
import attendance2 from '@/assets/faq/attendance-2.jpg';
import timetable1 from '@/assets/faq/timetable-1.jpg';
import timetable2 from '@/assets/faq/timetable-2.jpg';
import timetable3 from '@/assets/faq/timetable-3.jpg';
import term1 from '@/assets/faq/term-1.jpg';
import term2 from '@/assets/faq/term-2.jpg';
import payment1 from '@/assets/faq/payment-1.jpg';
import payment2 from '@/assets/faq/payment-2.jpg';
import refund1 from '@/assets/faq/refund-1.jpg';
import refund2 from '@/assets/faq/refund-2.jpg';
import delete1 from '@/assets/faq/delete-1.jpg';
import delete2 from '@/assets/faq/delete-2.jpg';
import pricing1 from '@/assets/faq/pricing-1.jpg';
import pricing2 from '@/assets/faq/pricing-2.jpg';

interface FaqStep { text: string; image?: string }
interface FaqGuide { id: string; title: string; steps: FaqStep[] }
interface FaqSection { title: string; guides: FaqGuide[] }

const SECTIONS: FaqSection[] = [
  {
    title: 'Students',
    guides: [
      {
        id: 'add-student',
        title: 'How to manually add a student',
        steps: [
          { text: 'Open the Students tab and click Add Student.', image: student1 },
          { text: 'For a trial class, click Add Trial Student instead – the status is set to trial for you.', image: student1b },
          { text: 'Fill in first name (required), date of birth, gender, mobile and email. Branch is locked to your login. Pick the belt and status, then click Add student.', image: student2 },
          { text: 'The student appears in the list straight away.' },
        ],
      },
      {
        id: 'register',
        title: 'How to add a student via /register',
        steps: [
          { text: 'Send the family the link gaonhae.app/register. They choose the branch, fill in the student details and sign the form.', image: register1 },
          { text: 'After they submit, the registration waits for staff approval. Check the Approvals list in Summary, then approve it so the student shows in the Students tab.', image: register2 },
        ],
      },
    ],
  },
  {
    title: 'Classes and attendance',
    guides: [
      {
        id: 'timetable',
        title: 'How to add a timetable slot',
        steps: [
          { text: 'Open the Attendance tab and click Settings.', image: timetable1 },
          { text: 'On the Timetable tab, click Add timeslot.', image: timetable2 },
          { text: 'Choose Weekly (repeats every week) or Specific date (one-off). Set the day or date, start and end time, capacity, class, and age/belt limits if needed. Click Save timeslot.', image: timetable3 },
        ],
      },
      {
        id: 'term',
        title: 'How to add a term',
        steps: [
          { text: 'Open Attendance > Settings, go to the Terms tab and click Add term.', image: term1 },
          { text: 'Type the term name, pick the start and end dates, then click Save term. You can add school-holiday breaks under each term.', image: term2 },
        ],
      },
      {
        id: 'attendance',
        title: 'How to add attendance',
        steps: [
          { text: 'Open the Attendance tab. Use the arrows or Today to pick the day, then click Add student on the class timeslot.', image: attendance1 },
          { text: 'Search the student name and click it. Lessons left are shown next to each name. Use the copy icon to bring in last session\'s students.', image: attendance2 },
          { text: 'Mark each student Attended or Absent. A warning appears if the student has not paid for the term – trial students are exempt.' },
        ],
      },
    ],
  },
  {
    title: 'Invoices and payments',
    guides: [
      {
        id: 'add-invoice',
        title: 'How to manually add an invoice',
        steps: [
          { text: 'In the Students tab, find the student and click the Create invoice icon on their row.', image: invoice1 },
          { text: 'The student and branch are filled in. Choose a category and product, set quantity, term and class slot where asked. Use + to add more lines.', image: invoice2 },
          { text: 'Check the total, then click Create Invoice. Discounts outside the rules go to superadmin for approval.' },
        ],
      },
      {
        id: 'record-payment',
        title: 'How to record a payment',
        steps: [
          { text: 'Open the invoice (click the invoice number anywhere, or from the student profile) and click Record Payment.', image: payment1 },
          { text: 'Check the amount (the balance is filled in), date and method. For PayNow or bank transfer, add the proof picture – choose a file or paste a screenshot with Ctrl/Cmd+V. Click Record Payment.', image: payment2 },
          { text: 'Cash is verified straight away. PayNow and bank transfers wait for verification. The payment appears under Payments below the invoice.' },
        ],
      },
      {
        id: 'refund',
        title: 'How to refund as credit',
        steps: [
          { text: 'Open the invoice and click Refund as credit.', image: refund1 },
          { text: 'Tick the line(s) to refund and adjust quantity, type a reason, then click Submit Request.', image: refund2 },
          { text: 'A superadmin approves it. The credit is then added to the student and is used automatically on their next invoice.' },
        ],
      },
      {
        id: 'delete-draft',
        title: 'How to delete a draft invoice',
        steps: [
          { text: 'Open the draft invoice and click Delete.', image: delete1 },
          { text: 'Confirm. Draft invoices are deleted straight away (reason optional). For any other status the box shown below appears instead and the request goes to a superadmin for approval.', image: delete2 },
        ],
      },
    ],
  },
  {
    title: 'Settings',
    guides: [
      {
        id: 'pricing',
        title: 'How to change pricing',
        steps: [
          { text: 'Open the School Fees tab and click the gear (Class availability & pricing) button.', image: pricing1 },
          { text: 'Pick the branch, type the new weekly price next to the class (leave blank to use the base price) and turn classes on or off. Click Save at the bottom.', image: pricing2 },
        ],
      },
    ],
  },
];

export default function FaqTab() {
  const [zoom, setZoom] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const sections = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return SECTIONS;
    return SECTIONS.map((s) => ({ ...s, guides: s.guides.filter((g) => g.title.toLowerCase().includes(t) || s.title.toLowerCase().includes(t)) }))
      .filter((s) => s.guides.length);
  }, [q]);

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">FAQ</h2>
          <p className="text-sm text-muted-foreground">Step-by-step guides. Tap a picture to enlarge. Red boxes show where to click.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <a href={parentGuide.url} target="_blank" rel="noopener noreferrer" download="gaonhae-hello-parent-guide.pdf">
            <FileDown className="mr-1 h-4 w-4" /> Parent guide (PDF)
          </a>
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides" className="h-9 pl-8 text-sm" />
      </div>
      {sections.length === 0 && <p className="text-sm text-muted-foreground">No guides match.</p>}
      {sections.map((sec) => (
        <section key={sec.title} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h3>
          <Accordion type="multiple" className="rounded-md border bg-card">
            {sec.guides.map((g, gi) => (
              <AccordionItem key={g.id} value={g.id} className="px-3">
                <AccordionTrigger className="text-left text-sm font-medium">{gi + 1}. {g.title}</AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-4">
                    {g.steps.map((s, si) => (
                      <li key={si} className="space-y-2">
                        <p className="text-sm"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{si + 1}</span>{s.text}</p>
                        {s.image && (
                          <button type="button" onClick={() => setZoom(s.image!)} className="block max-w-full">
                            <img src={s.image} alt={`${g.title} – step ${si + 1}`} loading="lazy" className="max-h-80 max-w-full rounded border shadow-sm" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-[95vw] w-auto p-2">
          <DialogTitle className="sr-only">Screenshot</DialogTitle>
          {zoom && <img src={zoom} alt="Enlarged screenshot" className="max-h-[85vh] max-w-full" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
