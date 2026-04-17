/**
 * Student Header Component
 * Displays student basic information and quick stats
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarDays, Phone, Mail, MapPin, Award, Clock, MessageCircle } from 'lucide-react';
import { Student } from '@/services/studentService';
import { format } from 'date-fns';
import { formatDate } from '@/utils/dateFormat';

interface StudentHeaderProps {
  student: Student;
  stats?: {
    totalAttendance: number;
    attendanceRate: number;
    activeSessions: number;
    outstandingBalance: number;
  };
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ student, stats }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getBeltColor = (beltLevel?: string) => {
    if (!beltLevel) return 'default';
    
    const beltColors: Record<string, string> = {
      'white': 'bg-gray-100 text-gray-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'orange': 'bg-orange-100 text-orange-800',
      'green': 'bg-green-100 text-green-800',
      'blue': 'bg-blue-100 text-blue-800',
      'purple': 'bg-purple-100 text-purple-800',
      'brown': 'bg-amber-100 text-amber-800',
      'black': 'bg-gray-800 text-white'
    };

    return beltColors[beltLevel.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {getInitials(student.first_name, student.last_name)}
            </AvatarFallback>
          </Avatar>

          {/* Student Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {student.first_name} {student.last_name}
                </h1>
                <p className="text-muted-foreground font-mono">
                  Student #{student.student_number}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Badge variant={student.status === 'active' ? "default" : "secondary"}>
                  {student.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                
                {student.current_belt && (
                  <Badge className={getBeltColor(student.current_belt)}>
                    <Award className="w-3 h-3 mr-1" />
                    {student.current_belt}
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {student.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{student.email}</span>
                </div>
              )}
              
              {student.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{student.phone}</span>
                </div>
              )}
              
              {student.whatsapp && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{student.whatsapp}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>Enrolled: {formatDate(new Date(student.enrollment_date))}</span>
              </div>
              
              {student.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{student.address}</span>
                </div>
              )}
              
              {student.class_type && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{student.class_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="hidden lg:flex flex-col gap-3 min-w-[200px]">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.totalAttendance}</div>
                <div className="text-xs text-muted-foreground">Total Classes</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.attendanceRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Attendance Rate</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.activeSessions}</div>
                <div className="text-xs text-muted-foreground">Sessions Left</div>
              </div>
              
              {stats.outstandingBalance > 0 && (
                <div className="text-center p-3 bg-destructive/10 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    ${stats.outstandingBalance.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Outstanding</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};