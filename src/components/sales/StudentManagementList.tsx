/**
 * Student Management List Component
 * Comprehensive student list with CRUD operations for Milestone 4
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  KeyRound
} from 'lucide-react';
import { 
  getStudents, 
  Student, 
  deleteStudent, 
  bulkUpdateStudentStatus, 
  bulkDeleteStudents
} from '@/services/studentService';
import { bulkEnablePortalAccess } from '@/services/studentAuthService';
import EditStudentDialog from './EditStudentDialog';
import { useAuth } from '@/contexts/AuthContext';

const StudentManagementList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const itemsPerPage = 50;

  const loadStudents = async () => {
    try {
      setLoading(true);
      const result = await getStudents(
        currentPage, 
        itemsPerPage, 
        searchQuery.trim() || undefined,
        branchFilter !== 'all' ? branchFilter : undefined
      );
      
      let filteredStudents = result.students;
      if (statusFilter !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.status === statusFilter);
      }
      
      setStudents(filteredStudents);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      loadStudents();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, statusFilter, branchFilter]);

  useEffect(() => {
    loadStudents();
  }, [currentPage]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students first');
      return;
    }
    
    try {
      switch (action) {
        case 'activate':
          await bulkUpdateStudentStatus(selectedStudents, 'active');
          toast.success(`${selectedStudents.length} students activated`);
          break;
        case 'deactivate':
          await bulkUpdateStudentStatus(selectedStudents, 'inactive');
          toast.success(`${selectedStudents.length} students deactivated`);
          break;
        case 'delete':
          await bulkDeleteStudents(selectedStudents);
          toast.success(`${selectedStudents.length} students deleted`);
          break;
        case 'enable_portal':
          const studentsWithEmails = students
            .filter(s => selectedStudents.includes(s.id) && s.email)
            .map(s => ({ id: s.id, email: s.email! }));
          
          if (studentsWithEmails.length === 0) {
            toast.error('No selected students have email addresses');
            return;
          }
          
          const result = await bulkEnablePortalAccess(studentsWithEmails);
          if (result.success > 0) {
            toast.success(`Portal access enabled for ${result.success} student(s)`);
          }
          if (result.failed > 0) {
            toast.error(`Failed to enable access for ${result.failed} student(s)`);
          }
          break;
        default:
          toast.info(`Bulk ${action} - Not implemented yet`);
          return;
      }
      
      setSelectedStudents([]);
      loadStudents();
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      toast.error(`Failed to ${action} students`);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      toast.success('Student deleted successfully');
      loadStudents(); // Reload the list
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const handleStudentUpdated = () => {
    loadStudents(); // Reload the list
    setEditingStudent(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div className="space-y-4">
      {/* Filters - Compact layout without header */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="main">Main Branch</SelectItem>
                <SelectItem value="north">North Branch</SelectItem>
                <SelectItem value="south">South Branch</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setBranchFilter('all');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('enable_portal')}
                >
                  <KeyRound className="w-4 h-4 mr-1" />
                  Enable Portal Access
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student List - No header, just count in table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students found</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-2 border-b mb-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === students.length}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                  <span className="text-xs text-muted-foreground">Select all</span>
                  <span className="ml-auto text-xs text-muted-foreground">{students.length} students</span>
                </div>
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer hover:bg-muted/50 transition-colors text-sm whitespace-nowrap"
                    onClick={() => navigate(`/parties/student/${student.id}`)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectStudent(student.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded shrink-0"
                    />
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
                      <Badge variant={getStatusBadgeVariant(student.status)} className="text-xs capitalize">
                        {student.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentManagementList;