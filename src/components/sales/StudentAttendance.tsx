/**
 * Student Attendance Component
 * Displays student attendance history and statistics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { StudentAttendance as StudentAttendanceType } from '@/services/studentService';
import { format } from 'date-fns';

interface StudentAttendanceProps {
  attendance: StudentAttendanceType[];
  loading?: boolean;
}

export const StudentAttendance: React.FC<StudentAttendanceProps> = ({
  attendance,
  loading = false
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'excused':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      present: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
      absent: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200" },
      late: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      excused: { variant: "outline", className: "bg-blue-100 text-blue-800 border-blue-200" }
    };

    const config = variants[status] || variants.present;
    
    return (
      <Badge variant={config.variant} className={`${config.className} capitalize`}>
        {status}
      </Badge>
    );
  };

  const calculateStats = () => {
    if (!attendance.length) return { total: 0, present: 0, absent: 0, late: 0, rate: 0 };

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    return { total, present, absent, late, rate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Class Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse text-center p-3 bg-muted/50 rounded-lg">
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
            
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Class Attendance
          <Badge variant="outline" className="ml-auto">
            {attendance.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-lg text-foreground">{stats.rate.toFixed(1)}%</span>
            </div>
            <div className="text-xs text-muted-foreground">Attendance Rate</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-lg text-green-700">{stats.present}</span>
            </div>
            <div className="text-xs text-green-600">Present</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-lg text-red-700">{stats.absent}</span>
            </div>
            <div className="text-xs text-red-600">Absent</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-lg text-yellow-700">{stats.late}</span>
            </div>
            <div className="text-xs text-yellow-600">Late</div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {attendance.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No attendance records found</p>
            </div>
          ) : (
            attendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium text-foreground">
                      {format(new Date(record.class_date), 'EEEE, MMM dd, yyyy')}
                    </div>
                    {record.branch_id && (
                      <div className="text-sm text-muted-foreground">
                        Branch: {record.branch_id}
                      </div>
                    )}
                    {record.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {record.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.status)}
                  {record.recorded_by && (
                    <div className="text-xs text-muted-foreground">
                      by {record.recorded_by}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {attendance.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Showing {Math.min(50, attendance.length)} most recent records
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};