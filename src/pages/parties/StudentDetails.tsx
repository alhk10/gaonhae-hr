/**
 * Student Details Page
 * Comprehensive view of student information with sections for:
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Phone, AlertTriangle, Receipt, Award, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';

// Components
import { StudentHeader } from '@/components/sales/StudentHeader';
import { StudentEmergencyContacts } from '@/components/sales/StudentEmergencyContacts';
import { StudentAttendance } from '@/components/sales/StudentAttendance';
import { StudentEntitlements } from '@/components/sales/StudentEntitlements';
import { StudentInvoices } from '@/components/sales/StudentInvoices';

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

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [student, setStudent] = useState<Student | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<StudentEmergencyContact[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceType[]>([]);
  const [entitlements, setEntitlements] = useState<StudentEntitlement[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('contact');

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

      // Load emergency contacts
      setContactsLoading(true);
      const contactsData = await getStudentEmergencyContacts(id);
      setEmergencyContacts(contactsData);
      setContactsLoading(false);

    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load student information');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!id || attendanceLoading) return;

    try {
      setAttendanceLoading(true);
      const attendanceData = await getStudentAttendance(id);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadEntitlements = async () => {
    if (!id || entitlementsLoading) return;

    try {
      setEntitlementsLoading(true);
      const entitlementsData = await getStudentEntitlements(id);
      setEntitlements(entitlementsData);
    } catch (error) {
      console.error('Error loading entitlements:', error);
      toast.error('Failed to load session entitlements');
    } finally {
      setEntitlementsLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!id || invoicesLoading) return;

    try {
      setInvoicesLoading(true);
      const invoicesData = await getStudentInvoices(id);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices and payments');
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Handle tab changes with lazy loading
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    switch (tab) {
      case 'sales':
        if (invoices.length === 0) {
          loadInvoices();
        }
        if (entitlements.length === 0) {
          loadEntitlements();
        }
        break;
      case 'grading':
        if (attendance.length === 0) {
          loadAttendance();
        }
        break;
    }
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
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
              </div>
              <p className="text-muted-foreground">
                Student #{student.student_number}
              </p>
            </div>
            
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Student
            </Button>
          </div>

          {/* Student Header with Stats */}
          <StudentHeader student={student} stats={stats} />

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="emergency" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Emergency</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Sales</span>
              </TabsTrigger>
              <TabsTrigger value="grading" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Grading</span>
              </TabsTrigger>
              <TabsTrigger value="kukkiwon" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Kukkiwon</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            {/* Contact Information Tab */}
            <TabsContent value="contact" className="space-y-6">
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
                        <p className="text-foreground">{student.gender || '-'}</p>
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
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Parent/Guardian Name</label>
                        <p className="text-foreground">{student.parent_guardian_name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Parent/Guardian Contact</label>
                        <p className="text-foreground">{student.parent_guardian_phone || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emergency Information Tab */}
            <TabsContent value="emergency" className="space-y-6">
              <StudentEmergencyContacts 
                contacts={emergencyContacts} 
                loading={contactsLoading} 
              />
            </TabsContent>

            {/* Sales Information Tab */}
            <TabsContent value="sales" className="space-y-6">
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
            </TabsContent>

            {/* Grading Information Tab */}
            <TabsContent value="grading" className="space-y-6">
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
            </TabsContent>

            {/* Kukkiwon Information Tab */}
            <TabsContent value="kukkiwon" className="space-y-6">
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
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default StudentDetails;
