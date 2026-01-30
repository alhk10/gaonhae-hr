/**
 * Student Management List Component
 * Comprehensive student list with CRUD operations for Milestone 4
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Filter
} from 'lucide-react';
import { 
  getStudents, 
  Student, 
  deleteStudent, 
  bulkUpdateStudentStatus, 
  bulkDeleteStudents
} from '@/services/studentService';
import EditStudentDialog from './EditStudentDialog';

const StudentManagementList: React.FC = () => {
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
  
  const itemsPerPage = 20;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Student Management</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="flex gap-2">
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

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Students ({students.length})
          </CardTitle>
        </CardHeader>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Belt Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            #{student.student_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{student.phone || 'No phone'}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.current_belt || 'No Belt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(student.status)}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.enrollment_date 
                          ? new Date(student.enrollment_date).toLocaleDateString()
                          : 'Not set'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/parties/student/${student.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <EditStudentDialog
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            }
                            student={student}
                            onStudentUpdated={handleStudentUpdated}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {student.first_name} {student.last_name}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStudent(student.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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