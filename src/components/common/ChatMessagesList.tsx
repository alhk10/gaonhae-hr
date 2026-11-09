/** /hello messages (Others / Help) awaiting staff action. Branch-scoped for /access, all branches for superadmin. */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/utils/dateFormat';

interface Row {
  id: string; created_at: string; type: string; message: string; name: string | null; student_id: string | null;
  branch_id: string | null; branch_name: string | null; contact_phone: string | null; contact_email: string | null;
}

interface Props { lockedBranchName?: string; onOpenStudent?: (id: string) => void; title?: boolean }

export const useChatMessages = () => useQuery({
  queryKey: ['access-chat-messages'],
  queryFn: async () => {
    const { data, error } = await (supabase as any).rpc('access_list_chat_messages', { p_password: sessionStorage.getItem('access_pw_v1') || '' });
    if (error) throw error;
    return (data || []) as Row[];
  },
});

const ChatMessagesList: React.FC<Props> = ({ lockedBranchName, onOpenStudent, title = true }) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: rows = [] } = useChatMessages();
  const shown = rows.filter((r) => !lockedBranchName || r.branch_name === lockedBranchName);
  if (shown.length === 0) return null;

  const done = async (r: Row) => {
    const note = window.prompt(`Mark message from ${r.name || 'visitor'} as done. Note (optional):`, '');
    if (note === null) return;
    setBusy(r.id);
    const { error } = await (supabase as any).rpc('access_resolve_chat_message', {
      p_password: sessionStorage.getItem('access_pw_v1') || '', p_id: r.id, p_note: note,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('Marked done');
    qc.invalidateQueries({ queryKey: ['access-chat-messages'] });
  };

  return (
    <div className="space-y-1">
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4" /> Messages from /hello
          <Badge variant="destructive" className="text-[10px]">{shown.length}</Badge>
        </div>
      )}
      <ul className="divide-y rounded-md border">
        {shown.map((r) => (
          <li key={r.id} className="p-2 text-xs space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted-foreground w-[120px] shrink-0">{formatDateTime(r.created_at)}</span>
              <Badge variant="outline" className="text-[10px]">Message</Badge>
              {r.student_id && onOpenStudent
                ? <button type="button" className="font-medium text-primary hover:underline text-left" onClick={() => onOpenStudent(r.student_id!)}>{r.name}</button>
                : <span className="font-medium">{r.name || 'Unknown visitor'}</span>}
              <span className="text-muted-foreground">{r.branch_name || '—'}</span>
              <span className="text-muted-foreground">{[r.contact_phone, r.contact_email].filter(Boolean).join(' · ')}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" disabled={busy === r.id} onClick={() => done(r)}>Mark done</Button>
            </div>
            <p className="whitespace-pre-wrap break-words text-foreground">{r.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatMessagesList;
