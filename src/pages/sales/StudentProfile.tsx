/**
 * Student Profile Page
 * Comprehensive 360-degree view of student information
 */

import React, { useState, useEffect } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useParams, useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Calendar, Ticket, Receipt, Settings } from 'lucide-react';
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

const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
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

  // Active tab (per-student, persisted across refresh)
  const [activeTab, setActiveTab] = useSessionState(`student-profile:${studentId || 'none'}:tab`, 'overview');
  useScrollRestoration(studentId || '');

  useEffect(() => {
    if (!studentId) {
      toast.error('Student ID not provided');
      navigate('/sales/dashboard');
      return;
    }

    loadStudentData();
  }, [studentId, navigate]);

  const loadStudentData = async () => {
    if (!studentId) return;

    try {
      setLoading(true);

      // Load student basic info
      const studentData = await getStudentById(studentId);
      if (!studentData) {
        toast.error('Student not found');
        navigate('/sales/dashboard');
        return;
      }

      setStudent(studentData);

      // Load student stats
      const statsData = await getStudentStats(studentId);
      setStats(statsData);

      // Load emergency contacts
      setContactsLoading(true);
      const contactsData = await getStudentEmergencyContacts(studentId);
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
    if (!studentId || attendanceLoading) return;

    try {
      setAttendanceLoading(true);
      const attendanceData = await getStudentAttendance(studentId);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadEntitlements = async () => {
    if (!studentId || entitlementsLoading) return;

    try {
      setEntitlementsLoading(true);
      const entitlementsData = await getStudentEntitlements(studentId);
      setEntitlements(entitlementsData);
    } catch (error) {
      console.error('Error loading entitlements:', error);
      toast.error('Failed to load session entitlements');
    } finally {
      setEntitlementsLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!studentId || invoicesLoading) return;

    try {
      setInvoicesLoading(true);
      const invoicesData = await getStudentInvoices(studentId);
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
      case 'attendance':
        if (attendance.length === 0) {
          loadAttendance();
        }
        break;
      case 'entitlements':
        if (entitlements.length === 0) {
          loadEntitlements();
        }
        break;
      case 'invoices':
        if (invoices.length === 0) {
          loadInvoices();
        }
        break;
    }
  };

  if (loading || !student) {
    return (
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
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/sales/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Student Profile</h1>
            <p className="text-muted-foreground">
              Complete overview of {student.first_name} {student.last_name}
            </p>
          </div>
          
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Edit Student
          </Button>
        </div>

        {/* Student Header */}
        <StudentHeader student={student} stats={stats} />

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="entitlements" className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StudentEmergencyContacts 
                contacts={emergencyContacts} 
                loading={contactsLoading} 
              />
              
              <div className="space-y-6">
                {/* Quick Stats */}
                {stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{stats.totalAttendance}</div>
                      <div className="text-sm text-muted-foreground">Classes Attended</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{stats.activeSessions}</div>
                      <div className="text-sm text-muted-foreground">Sessions Remaining</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <StudentAttendance 
              attendance={attendance} 
              loading={attendanceLoading} 
            />
          </TabsContent>

          <TabsContent value="entitlements" className="space-y-6">
            <StudentEntitlements 
              entitlements={entitlements} 
              loading={entitlementsLoading} 
            />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <StudentInvoices 
              invoices={invoices} 
              loading={invoicesLoading} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default StudentProfile;