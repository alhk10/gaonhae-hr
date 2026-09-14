/**
 * Shows how payments ended up on student accounts: every automatic and manual
 * link, with who did it and when. Staff corrections are recorded here too.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { listMatchEvents, type MatchEvent } from '@/services/submissionMatchHistoryService';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/utils/dateFormat';

interface Props {
  scope?: string;
  title?: string;
}

const useStudentNames = (events: MatchEvent[]) => {
  const ids = Array.from(
    new Set(events.flatMap((e) => [e.student_id, e.previous_student_id]).filter(Boolean) as string[]),
  );
  return useQuery({
    queryKey: ['match-history-students', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .in('id', ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        map[s.id] = `${[s.first_name, s.last_name].filter(Boolean).join(' ')}${s.student_number ? ` (${s.student_number})` : ''}`;
      });
      return map;
    },
  });
};

export const MatchHistoryDialog: React.FC<Props> = ({ scope, title = 'Match history' }) => {
  const [open, setOpen] = React.useState(false);
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['match-history', scope],
    enabled: open,
    queryFn: () => listMatchEvents({ scope, limit: 200 }),
  });
  const { data: names = {} } = useStudentNames(events);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <History className="h-3.5 w-3.5" /> Match history
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="rounded border p-2 text-xs space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={e.method === 'auto' ? 'secondary' : 'default'} className="text-[10px]">
                    {e.method === 'auto' ? 'Automatic' : 'Staff'}
                  </Badge>
                  {!scope && <span className="text-muted-foreground">{e.scope}</span>}
                  {e.confidence != null && <span className="text-muted-foreground">{Math.round(e.confidence)}%</span>}
                  <span className="text-muted-foreground ml-auto">{formatDateTime(e.created_at)}</span>
                </div>
                <p className="font-medium">
                  {e.student_id ? names[e.student_id] || e.student_id : 'Unlinked'}
                </p>
                {e.previous_student_id && (
                  <p className="text-muted-foreground">
                    Moved from {names[e.previous_student_id] || e.previous_student_id}
                  </p>
                )}
                {e.actor && <p className="text-muted-foreground">By {e.actor}</p>}
                {e.note && <p className="text-muted-foreground">{e.note}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MatchHistoryDialog;
