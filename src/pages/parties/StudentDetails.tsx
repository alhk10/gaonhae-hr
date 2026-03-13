/**
 * Student Details Page
 * Comprehensive view of student information with scrollable sections for:
 * - Contact Information
 * - Emergency Information
 * - Sales Information
 * - Grading Information
 * - Kukkiwon Information
 * - Qualifications, Certifications & Documents
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Phone, AlertTriangle, Receipt, Award, FileText, Edit, DollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Components
import { StudentEmergencyContacts } from '@/components/sales/StudentEmergencyContacts';
import { StudentAttendance } from '@/components/sales/StudentAttendance';
import { StudentEntitlements } from '@/components/sales/StudentEntitlements';
import { StudentInvoices } from '@/components/sales/StudentInvoices';
import EditStudentDialog from '@/components/sales/EditStudentDialog';
import { StudentChangeLog } from '@/components/sales/StudentChangeLog';
import StudentPortalAccessManager from '@/components/sales/StudentPortalAccessManager';

// Services
import {
  getStudentById,
  getStudentEmergencyContacts,
  getStudentAttendance,
  getStudentEntitlements,
  getStudentInvoices,
  getStudentStats,
  Student,
  StudentEmergencyContact,
  StudentAttendance as StudentAttendanceType,
  StudentEntitlement
} from '@/services/studentService';
import { getStudentChangeLogs, StudentChangeLog as ChangeLogType } from '@/services/studentChangeLogService';
import { getStudentCreditBalance, getStudentCreditHistory, addManualCredit, type StudentCredit } from '@/services/studentCreditService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
const capitalize = (str: string | null | undefined): string => {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';

  // State
  const [student, setStudent] = useState<Student | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<StudentEmergencyContact[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceType[]>([]);
  const [entitlements, setEntitlements] = useState<StudentEntitlement[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [changeLogs, setChangeLogs] = useState<ChangeLogType[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [changeLogsLoading, setChangeLogsLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      toast.error('Student ID not provided');
      navigate('/parties');
      return;
    }

    loadStudentData();
  }, [id, navigate]);

  const loadStudentData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Load student basic info
      const studentData = await getStudentById(id);
      if (!studentData) {
        toast.error('Student not found');
        navigate('/parties');
        return;
      }

      setStudent(studentData);

      // Load student stats
      const statsData = await getStudentStats(id);
      setStats(statsData);

      // Load all data upfront for sections
      setContactsLoading(true);
      setAttendanceLoading(true);
      setEntitlementsLoading(true);
      setInvoicesLoading(true);
      setChangeLogsLoading(true);

      const [contactsData, attendanceData, entitlementsData, invoicesData, changeLogsData] = await Promise.all([
        getStudentEmergencyContacts(id),
        getStudentAttendance(id),
        getStudentEntitlements(id),
        getStudentInvoices(id),
        getStudentChangeLogs(id)
      ]);

      setEmergencyContacts(contactsData);
      setAttendance(attendanceData);
      setEntitlements(entitlementsData);
      setInvoices(invoicesData);
      setChangeLogs(changeLogsData);

    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load student information');
    } finally {
      setLoading(false);
      setContactsLoading(false);
      setAttendanceLoading(false);
      setEntitlementsLoading(false);
      setInvoicesLoading(false);
      setChangeLogsLoading(false);
    }
  };

  const handleStudentUpdated = () => {
    loadStudentData();
  };

  if (loading || !student) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
            </div>
            
            {/* Content Skeleton */}
            <div className="animate-pulse space-y-6">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Navigation Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/parties')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Party Management
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {student.first_name} {student.last_name}
                </h1>
                <Badge variant="secondary">Student</Badge>
                <Badge variant={student.status === 'active' ? 'default' : 'outline'}>
                  {student.status}
                </Badge>
                {student.current_belt && (
                  <Badge variant="outline">{student.current_belt}</Badge>
                )}
              </div>
            </div>
            
            <EditStudentDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Student
                </Button>
              }
              student={student}
              onStudentUpdated={handleStudentUpdated}
            />
          </div>

          {/* Section 1: Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-foreground">{student.first_name} {student.last_name}</p>
                  </div>
                  {student.preferred_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Preferred Name</label>
                      <p className="text-foreground">{student.preferred_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-foreground">{student.date_of_birth || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-foreground">{capitalize(student.gender)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                    <p className="text-foreground">{student.nationality || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">NRIC/Passport</label>
                    <p className="text-foreground">{student.nric_passport || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground">{student.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-foreground">{student.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-foreground">{student.address || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Postal Code</label>
                    <p className="text-foreground">{student.postal_code || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Emergency Information */}
          <StudentEmergencyContacts 
            contacts={emergencyContacts} 
            loading={contactsLoading} 
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Sales Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StudentEntitlements 
                  entitlements={entitlements} 
                  loading={entitlementsLoading} 
                />
                <StudentInvoices 
                  invoices={invoices} 
                  loading={invoicesLoading} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Grading Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Grading Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{student.current_belt || 'White'}</div>
                  <div className="text-sm text-muted-foreground">Current Belt</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{stats?.totalAttendance || 0}</div>
                  <div className="text-sm text-muted-foreground">Classes Attended</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">-</div>
                  <div className="text-sm text-muted-foreground">Last Grading</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-4">Attendance History</h4>
                <StudentAttendance 
                  attendance={attendance} 
                  loading={attendanceLoading} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Kukkiwon Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Kukkiwon Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No Kukkiwon information available</p>
                <p className="text-sm mt-2">Kukkiwon registration details will appear here once recorded</p>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Qualifications, Certifications & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded</p>
                <p className="text-sm mt-2">Upload certificates and documents for this student</p>
                <Button variant="outline" className="mt-4">
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Superadmin-only sections */}
          {isSuperadmin && (
            <>
              {/* Section 7: Portal Access */}
              <StudentPortalAccessManager
                studentId={student.id}
                studentEmail={student.email || null}
                studentName={`${student.first_name || ''} ${student.last_name || ''}`.trim()}
                onAccessChanged={loadStudentData}
              />

              {/* Section 8: Change Log */}
              <StudentChangeLog 
                changeLogs={changeLogs} 
                loading={changeLogsLoading} 
              />
            </>
          )}
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default StudentDetails;
