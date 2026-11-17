import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { listStudentBranches, setStudentBranch } from '@/services/studentBranchesService';

interface Props { studentId: string; homeBranchId: string; branches: { id: string; name: string }[] }

/** Tick the other branches this student also attends. Payments stay at the home branch. */
const ExtraBranchesEditor: React.FC<Props> = ({ studentId, homeBranchId, branches }) => {
  const qc = useQueryClient();
  const { data: links = [] } = useQuery({ queryKey: ['student-branches', studentId], queryFn: () => listStudentBranches([studentId]) });
  const on = new Set(links.map((l) => l.branch_id));
  const toggle = async (id: string, v: boolean) => {
    try {
      await setStudentBranch(studentId, id, v);
      qc.invalidateQueries({ queryKey: ['student-branches'] });
      qc.invalidateQueries({ queryKey: ['public-student-directory'] });
      toast.success(v ? 'Branch added' : 'Branch removed');
    } catch (e: any) { toast.error(e?.message || 'Could not update branches'); }
  };
  return (
    <div className="rounded-md border p-2">
      <label className="text-xs font-medium">Also attends</label>
      <p className="mb-1 text-[11px] text-muted-foreground">Invoices and payments stay at the home branch.</p>
      <div className="grid grid-cols-2 gap-1">
        {branches.filter((b) => b.id !== homeBranchId).map((b) => (
          <label key={b.id} className="flex items-center gap-1.5 text-xs">
            <Checkbox checked={on.has(b.id)} onCheckedChange={(v) => toggle(b.id, !!v)} aria-label={`Also attends ${b.name}`} />
            {b.name}
          </label>
        ))}
      </div>
    </div>
  );
};
export default ExtraBranchesEditor;
