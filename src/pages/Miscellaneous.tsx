import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Download, Printer, FileCheck, GraduationCap, Briefcase, Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  generateStudentVerificationLetterWithTemplate,
  generateEmployeeVerificationLetterWithTemplate,
  printStudentVerificationLetterWithTemplate,
  printEmployeeVerificationLetterWithTemplate,
} from '@/utils/verificationLetterPDFGenerator';
import { letterTemplateService, LetterTemplate } from '@/services/letterTemplateService';
import AddEditTemplateDialog from '@/components/miscellaneous/AddEditTemplateDialog';

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
  address: string | null;
  phone: string | null;
}

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const Miscellaneous = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [studentOpen, setStudentOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<LetterTemplate | null>(null);

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
        .select('id, name, display_name, date_of_birth, nric, position, base_salary, join_date, address, phone')
        .is('resign_date', null)
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    },
  });

  // Fetch templates
  const { data: studentTemplates = [], isLoading: studentTemplatesLoading } = useQuery({
    queryKey: ['letter-templates', 'student'],
    queryFn: () => letterTemplateService.getTemplates('student'),
  });

  const { data: employeeTemplates = [], isLoading: employeeTemplatesLoading } = useQuery({
    queryKey: ['letter-templates', 'employee'],
    queryFn: () => letterTemplateService.getTemplates('employee'),
  });

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const getStudentDisplayName = (student: Student) => {
    return student.display_name || `${student.first_name} ${student.last_name}`.trim();
  };

  const getEmployeeDisplayName = (employee: Employee) => {
    return employee.display_name || employee.name;
  };

  const handleGenerateStudentPDF = async (template: LetterTemplate) => {
    if (!selectedStudent) return;
    
    setIsGenerating(template.id);
    try {
      await generateStudentVerificationLetterWithTemplate(
        {
          firstName: selectedStudent.first_name,
          lastName: selectedStudent.last_name,
          dateOfBirth: selectedStudent.date_of_birth || '',
          nricPassport: selectedStudent.nric_passport || '',
          currentBelt: selectedStudent.current_belt || '',
          enrollmentDate: selectedStudent.enrollment_date || '',
        },
        template
      );
      toast.success(`${template.name} downloaded`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(null);
    }
  };

  const handlePrintStudentPDF = async (template: LetterTemplate) => {
    if (!selectedStudent) return;
    
    setIsGenerating(template.id);
    try {
      await printStudentVerificationLetterWithTemplate(
        {
          firstName: selectedStudent.first_name,
          lastName: selectedStudent.last_name,
          dateOfBirth: selectedStudent.date_of_birth || '',
          nricPassport: selectedStudent.nric_passport || '',
          currentBelt: selectedStudent.current_belt || '',
          enrollmentDate: selectedStudent.enrollment_date || '',
        },
        template
      );
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to open print dialog');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateEmployeePDF = async (template: LetterTemplate) => {
    if (!selectedEmployee) return;
    
    setIsGenerating(template.id);
    try {
      await generateEmployeeVerificationLetterWithTemplate(
        {
          name: selectedEmployee.name,
          dateOfBirth: selectedEmployee.date_of_birth,
          nric: selectedEmployee.nric,
          position: selectedEmployee.position || '',
          baseSalary: selectedEmployee.base_salary || 0,
          joinDate: selectedEmployee.join_date || '',
          address: selectedEmployee.address || '',
          phone: selectedEmployee.phone || '',
        },
        template
      );
      toast.success(`${template.name} downloaded`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(null);
    }
  };

  const handlePrintEmployeePDF = async (template: LetterTemplate) => {
    if (!selectedEmployee) return;
    
    setIsGenerating(template.id);
    try {
      await printEmployeeVerificationLetterWithTemplate(
        {
          name: selectedEmployee.name,
          dateOfBirth: selectedEmployee.date_of_birth,
          nric: selectedEmployee.nric,
          position: selectedEmployee.position || '',
          baseSalary: selectedEmployee.base_salary || 0,
          joinDate: selectedEmployee.join_date || '',
          address: selectedEmployee.address || '',
          phone: selectedEmployee.phone || '',
        },
        template
      );
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to open print dialog');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleEditTemplate = (template: LetterTemplate) => {
    setEditingTemplate(template);
    setIsAddEditOpen(true);
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setIsAddEditOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    
    try {
      await letterTemplateService.deleteTemplate(deleteConfirmTemplate.id);
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteConfirmTemplate(null);
    }
  };

  const handleDuplicateTemplate = async (template: LetterTemplate) => {
    try {
      await letterTemplateService.duplicateTemplate(template.id, `${template.name} (Copy)`);
      toast.success('Template duplicated');
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] });
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleTemplateSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['letter-templates'] });
  };

  const renderTemplateButtons = (
    templates: LetterTemplate[],
    isLoading: boolean,
    selectedEntity: Student | Employee | undefined,
    onGenerate: (t: LetterTemplate) => void,
    onPrint: (t: LetterTemplate) => void
  ) => {
    if (isLoading) {
      return <div className="text-sm text-muted-foreground">Loading templates...</div>;
    }

    if (templates.length === 0) {
      return <div className="text-sm text-muted-foreground">No templates available. Add one to get started.</div>;
    }

    return (
      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{template.name}</h4>
                    {template.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{template.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onGenerate(template)}
                    disabled={!selectedEntity || isGenerating === template.id}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPrint(template)}
                    disabled={!selectedEntity || isGenerating === template.id}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditTemplate(template)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!template.is_default && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirmTemplate(template)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Miscellaneous</h1>
              <p className="text-muted-foreground">Generate verification letters for students and employees</p>
            </div>
          </div>
          <Button onClick={handleAddTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
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
                    <PopoverContent className="w-full p-0 bg-background" style={{ width: 'var(--radix-popover-trigger-width)' }}>
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

                {/* Template Buttons */}
                <div className="space-y-3">
                  <Label>Available Templates</Label>
                  {renderTemplateButtons(
                    studentTemplates,
                    studentTemplatesLoading,
                    selectedStudent,
                    handleGenerateStudentPDF,
                    handlePrintStudentPDF
                  )}
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
                    <PopoverContent className="w-full p-0 bg-background" style={{ width: 'var(--radix-popover-trigger-width)' }}>
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

                {/* Template Buttons */}
                <div className="space-y-3">
                  <Label>Available Templates</Label>
                  {renderTemplateButtons(
                    employeeTemplates,
                    employeeTemplatesLoading,
                    selectedEmployee,
                    handleGenerateEmployeePDF,
                    handlePrintEmployeePDF
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Add/Edit Template Dialog */}
        <AddEditTemplateDialog
          isOpen={isAddEditOpen}
          onClose={() => {
            setIsAddEditOpen(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSaved={handleTemplateSaved}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmTemplate} onOpenChange={() => setDeleteConfirmTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirmTemplate?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
};

export default Miscellaneous;
