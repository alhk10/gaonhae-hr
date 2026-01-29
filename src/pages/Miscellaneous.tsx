import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Download, Printer, FileCheck, GraduationCap, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  generateStudentVerificationLetter,
  generateEmploymentVerificationLetter,
  printStudentVerificationLetter,
  printEmploymentVerificationLetter,
} from '@/utils/verificationLetterPDFGenerator';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  date_of_birth: string | null;
  nric_passport: string | null;
  current_belt: string | null;
  enrollment_date: string | null;
}

interface Employee {
  id: string;
  name: string;
  display_name: string | null;
  date_of_birth: string;
  nric: string;
  position: string | null;
  base_salary: number | null;
  join_date: string | null;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const Miscellaneous = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [studentOpen, setStudentOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-for-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, display_name, date_of_birth, nric_passport, current_belt, enrollment_date')
        .order('first_name');
      
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, display_name, date_of_birth, nric, position, base_salary, join_date')
        .is('resign_date', null)
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    },
  });

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const getStudentDisplayName = (student: Student) => {
    return student.display_name || `${student.first_name} ${student.last_name}`.trim();
  };

  const getEmployeeDisplayName = (employee: Employee) => {
    return employee.display_name || employee.name;
  };

  const handleGenerateStudentPDF = async () => {
    if (!selectedStudent) return;
    
    setIsGenerating(true);
    try {
      await generateStudentVerificationLetter({
        firstName: selectedStudent.first_name,
        lastName: selectedStudent.last_name,
        dateOfBirth: selectedStudent.date_of_birth || '',
        nricPassport: selectedStudent.nric_passport || '',
        currentBelt: selectedStudent.current_belt || '',
        enrollmentDate: selectedStudent.enrollment_date || '',
      });
      toast.success('Student verification letter downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintStudentPDF = async () => {
    if (!selectedStudent) return;
    
    setIsGenerating(true);
    try {
      await printStudentVerificationLetter({
        firstName: selectedStudent.first_name,
        lastName: selectedStudent.last_name,
        dateOfBirth: selectedStudent.date_of_birth || '',
        nricPassport: selectedStudent.nric_passport || '',
        currentBelt: selectedStudent.current_belt || '',
        enrollmentDate: selectedStudent.enrollment_date || '',
      });
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to open print dialog');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEmployeePDF = async () => {
    if (!selectedEmployee) return;
    
    setIsGenerating(true);
    try {
      await generateEmploymentVerificationLetter({
        name: selectedEmployee.name,
        dateOfBirth: selectedEmployee.date_of_birth,
        nric: selectedEmployee.nric,
        position: selectedEmployee.position || '',
        baseSalary: selectedEmployee.base_salary || 0,
        joinDate: selectedEmployee.join_date || '',
      });
      toast.success('Employment verification letter downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintEmployeePDF = async () => {
    if (!selectedEmployee) return;
    
    setIsGenerating(true);
    try {
      await printEmploymentVerificationLetter({
        name: selectedEmployee.name,
        dateOfBirth: selectedEmployee.date_of_birth,
        nric: selectedEmployee.nric,
        position: selectedEmployee.position || '',
        baseSalary: selectedEmployee.base_salary || 0,
        joinDate: selectedEmployee.join_date || '',
      });
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to open print dialog');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Miscellaneous</h1>
            <p className="text-muted-foreground">Generate verification letters for students and employees</p>
          </div>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Student Letters
                </TabsTrigger>
                <TabsTrigger value="employee" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employee Letters
                </TabsTrigger>
              </TabsList>

              {/* Student Tab */}
              <TabsContent value="student" className="space-y-6">
                <div className="space-y-4">
                  <Label>Select Student</Label>
                  <Popover open={studentOpen} onOpenChange={setStudentOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={studentOpen}
                        className="w-full justify-between"
                        disabled={studentsLoading}
                      >
                        {selectedStudent 
                          ? getStudentDisplayName(selectedStudent)
                          : studentsLoading 
                            ? 'Loading students...' 
                            : 'Select a student...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Search students..." />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup>
                            {students.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={getStudentDisplayName(student)}
                                onSelect={() => {
                                  setSelectedStudentId(student.id);
                                  setStudentOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedStudentId === student.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {getStudentDisplayName(student)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Student Preview Card */}
                {selectedStudent && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Student Details Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Full Name:</span>
                          <p className="font-semibold">{`${selectedStudent.first_name} ${selectedStudent.last_name}`.trim()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Date of Birth:</span>
                          <p className="font-semibold">{formatDate(selectedStudent.date_of_birth)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">NRIC/Passport:</span>
                          <p className="font-semibold">{selectedStudent.nric_passport || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Current Belt:</span>
                          <p className="font-semibold">{selectedStudent.current_belt || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Member Since:</span>
                          <p className="font-semibold">{formatDate(selectedStudent.enrollment_date)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerateStudentPDF}
                    disabled={!selectedStudent || isGenerating}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintStudentPDF}
                    disabled={!selectedStudent || isGenerating}
                    className="flex-1"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </TabsContent>

              {/* Employee Tab */}
              <TabsContent value="employee" className="space-y-6">
                <div className="space-y-4">
                  <Label>Select Employee</Label>
                  <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeeOpen}
                        className="w-full justify-between"
                        disabled={employeesLoading}
                      >
                        {selectedEmployee 
                          ? getEmployeeDisplayName(selectedEmployee)
                          : employeesLoading 
                            ? 'Loading employees...' 
                            : 'Select an employee...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                          <CommandEmpty>No employees found.</CommandEmpty>
                          <CommandGroup>
                            {employees.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={getEmployeeDisplayName(employee)}
                                onSelect={() => {
                                  setSelectedEmployeeId(employee.id);
                                  setEmployeeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedEmployeeId === employee.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {getEmployeeDisplayName(employee)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Employee Preview Card */}
                {selectedEmployee && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Employee Details Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Full Name:</span>
                          <p className="font-semibold">{selectedEmployee.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Date of Birth:</span>
                          <p className="font-semibold">{formatDate(selectedEmployee.date_of_birth)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">NRIC:</span>
                          <p className="font-semibold">{selectedEmployee.nric}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Position:</span>
                          <p className="font-semibold">{selectedEmployee.position || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Monthly Salary:</span>
                          <p className="font-semibold">{formatCurrency(selectedEmployee.base_salary)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Join Date:</span>
                          <p className="font-semibold">{formatDate(selectedEmployee.join_date)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerateEmployeePDF}
                    disabled={!selectedEmployee || isGenerating}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintEmployeePDF}
                    disabled={!selectedEmployee || isGenerating}
                    className="flex-1"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default Miscellaneous;
