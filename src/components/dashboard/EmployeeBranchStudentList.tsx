import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, GraduationCap, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import StudentDashboard from './StudentDashboard';

interface EmployeeBranchStudentListProps {
  branchIds: string[];
}

const EmployeeBranchStudentList: React.FC<EmployeeBranchStudentListProps> = ({ branchIds }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['employee-branch-students', branchIds],
    queryFn: async () => {
      if (!branchIds.length) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, email, current_belt, status, branch_id, student_number')
        .in('branch_id', branchIds)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: branchIds.length > 0,
  });

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.student_number?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (selectedStudentId) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedStudentId(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Student Selection
        </Button>
        {selectedStudent && (
          <p className="text-sm text-muted-foreground px-1">
            Viewing: <span className="font-semibold text-foreground uppercase">{selectedStudent.first_name} {selectedStudent.last_name}</span>
          </p>
        )}
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Select a student to view their dashboard ({students.length} students)
        </p>
      </div>

      <div className="max-w-md space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={selectedStudentId || ''}
          onValueChange={(value) => setSelectedStudentId(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a student..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {filteredStudents.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                <span className="uppercase font-medium">
                  {student.first_name} {student.last_name}
                </span>
                {student.student_number && (
                  <span className="text-muted-foreground ml-2 text-xs">#{student.student_number}</span>
                )}
              </SelectItem>
            ))}
            {filteredStudents.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No students found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default EmployeeBranchStudentList;
