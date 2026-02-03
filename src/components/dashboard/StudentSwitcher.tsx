import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, User, GraduationCap } from 'lucide-react';
import { LinkedStudent } from '@/types/auth';
import { Badge } from '@/components/ui/badge';

interface StudentSwitcherProps {
  linkedStudents: LinkedStudent[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
}

const SESSION_STORAGE_KEY = 'selectedStudentId';

const StudentSwitcher: React.FC<StudentSwitcherProps> = ({
  linkedStudents,
  selectedStudentId,
  onSelectStudent,
}) => {
  // Persist selection to sessionStorage
  useEffect(() => {
    if (selectedStudentId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, selectedStudentId);
    }
  }, [selectedStudentId]);

  // If no students, don't render
  if (!linkedStudents || linkedStudents.length === 0) {
    return null;
  }

  // If only one student, don't show switcher
  if (linkedStudents.length === 1) {
    return null;
  }

  const selectedStudent = linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0];

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currently viewing</p>
              <p className="font-semibold">{selectedStudent.name}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Switch Child
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {linkedStudents.map((student) => (
                <DropdownMenuItem
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  className={`flex items-center justify-between p-3 cursor-pointer ${
                    student.id === selectedStudentId ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-1.5 rounded-full">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      {student.currentBelt && (
                        <p className="text-xs text-muted-foreground">{student.currentBelt}</p>
                      )}
                    </div>
                  </div>
                  {student.id === selectedStudentId && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSwitcher;
