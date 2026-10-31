import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import student1 from '@/assets/faq/student-1.jpg';
import student1b from '@/assets/faq/student-1b.jpg';
import student2 from '@/assets/faq/student-2.jpg';
import invoice1 from '@/assets/faq/invoice-1.jpg';
import invoice2 from '@/assets/faq/invoice-2.jpg';
import attendance1 from '@/assets/faq/attendance-1.jpg';
import attendance2 from '@/assets/faq/attendance-2.jpg';
import refund1 from '@/assets/faq/refund-1.jpg';
import refund2 from '@/assets/faq/refund-2.jpg';
import delete1 from '@/assets/faq/delete-1.jpg';
import delete2 from '@/assets/faq/delete-2.jpg';

interface FaqStep { text: string; image?: string }
interface FaqGuide { id: string; title: string; steps: FaqStep[] }

const GUIDES: FaqGuide[] = [
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
    id: 'add-invoice',
    title: 'How to manually add an invoice',
    steps: [
      { text: 'In the Students tab, find the student and click the Create invoice icon on their row.', image: invoice1 },
      { text: 'The student and branch are filled in. Choose a category and product, set quantity, term and class slot where asked. Use + to add more lines.', image: invoice2 },
      { text: 'Check the total, then click Create Invoice. Discounts outside the rules go to superadmin for approval.' },
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
  {
    id: 'refund',
    title: 'How to refund as credit',
    steps: [
      { text: 'Open the invoice (click the invoice number anywhere, or from the student profile) and click Refund as credit.', image: refund1 },
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
];

export default function FaqTab() {
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className="space-y-3 text-left">
      <div>
        <h2 className="text-lg font-semibold">FAQ</h2>
        <p className="text-sm text-muted-foreground">Step-by-step guides. Tap a picture to enlarge. Red boxes show where to click.</p>
      </div>
      <Accordion type="multiple" className="rounded-md border bg-card">
        {GUIDES.map((g, gi) => (
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
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-[95vw] w-auto p-2">
          <DialogTitle className="sr-only">Screenshot</DialogTitle>
          {zoom && <img src={zoom} alt="Enlarged screenshot" className="max-h-[85vh] max-w-full" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
