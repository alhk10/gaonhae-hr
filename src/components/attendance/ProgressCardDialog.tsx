import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
import { PROGRESS_SECTIONS, RATING_LABELS, READINESS_LABELS, ageOn, ratingKey, type Rating, type Readiness } from '@/utils/progressCard';
import { getProgressCard, saveProgressCard } from '@/services/progressCardService';

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void;
  student: { id: string; name: string; belt: string | null; dob: string | null };
  termId: string; termLabel: string;
}

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const ProgressCardDialog: React.FC<Props> = ({ open, onOpenChange, onSaved, student, termId, termLabel }) => {
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [ready, setReady] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const reportDate = todayIso();
  const age = ageOn(student.dob);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProgressCard(student.id, termId).then((c) => {
      setRatings(c?.ratings || {}); setReady(c?.grading_readiness || null);
    }).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [open, student.id, termId]);

  const save = async () => {
    setSaving(true);
    try {
      await saveProgressCard(student.id, termId, { term_label: termLabel, report_date: reportDate, belt_snapshot: student.belt, age_snapshot: age, ratings , grading_readiness: ready });
      if (ready === 'yes') toast.success('Ready for grading ticked');
      toast.success('Progress card saved'); onSaved(); onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const Info = ({ label, value }: { label: string; value: string }) => (
    <div className="text-xs"><span className="text-muted-foreground">{label}: </span><span className="font-medium">{value}</span></div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="text-base">Progress Report Card</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded border p-2">
          <Info label="Name" value={student.name} />
          <Info label="Current Belt" value={student.belt || 'No belt'} />
          <Info label="Age" value={age != null ? String(age) : '—'} />
          <Info label="Report Date" value={`${formatDate(reportDate)} · ${termLabel}`} />
        </div>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <div className="space-y-3">
            {PROGRESS_SECTIONS.map((s) => (
              <div key={s.key} className="rounded border">
                <div className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-center gap-1 border-b bg-muted/50 px-2 py-1 text-[10px] font-semibold">
                  <span className="text-xs">{s.title}</span>
                  {(Object.keys(RATING_LABELS) as Rating[]).map((r) => <span key={r} className="text-center">{RATING_LABELS[r]}</span>)}
                </div>
                {s.items.map((it) => {
                  const k = ratingKey(s.key, it);
                  return (
                    <div key={it} className="grid grid-cols-[1fr_repeat(3,4.5rem)] items-center gap-1 px-2 py-1 text-xs">
                      <span>{it}</span>
                      {(Object.keys(RATING_LABELS) as Rating[]).map((r) => (
                        <button key={r} type="button" aria-label={`${it} ${RATING_LABELS[r]}`}
                          onClick={() => setRatings({ ...ratings, [k]: r })}
                          className={cn('mx-auto h-5 w-5 rounded-full border', ratings[k] === r && 'border-primary bg-primary')} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="rounded border p-2">
              <p className="mb-1 text-xs font-semibold">Ready for Grading Test?</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(READINESS_LABELS) as Readiness[]).map((r) => (
                  <Button key={r} size="sm" variant={ready === r ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setReady(r)}>{READINESS_LABELS[r]}</Button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={saving || loading} onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressCardDialog;
