import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import StudentDashboard from './StudentDashboard';

interface EmployeeBranchStudentListProps {
  branchIds: string[];
}

const EmployeeBranchStudentList: React.FC<EmployeeBranchStudentListProps> = ({ branchIds }) => {
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['employee-branch-students', branchIds],
    queryFn: async () => {
      if (!branchIds.length) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, email, current_belt, status, branch_id')
        .in('branch_id', branchIds)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: branchIds.length > 0,
  });

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  if (selectedStudentId) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedStudentId(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Student List
        </Button>
        <StudentDashboard studentId={selectedStudentId} isSimulated={true} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} students</div>

      <div className="space-y-1">
        {filtered.map((student) => (
          <div
            key={student.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors text-sm whitespace-nowrap"
            onClick={() => setSelectedStudentId(student.id)}
          >
            <span className="font-semibold uppercase tracking-wide truncate w-48 shrink-0">
              {student.first_name} {student.last_name}
            </span>
            <span className="text-muted-foreground text-xs truncate w-28 shrink-0">
              {student.phone || '—'}
            </span>
            <span className="text-muted-foreground text-xs truncate flex-1 min-w-0">
              {student.email || '—'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={student.current_belt ? 'default' : 'outline'} className="text-xs">
                {student.current_belt || 'No Belt'}
              </Badge>
              <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                {student.status || 'unknown'}
              </Badge>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">No students found</p>
        )}
      </div>
    </div>
  );
};

export default EmployeeBranchStudentList;
