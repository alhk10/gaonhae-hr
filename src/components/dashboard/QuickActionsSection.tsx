import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, GraduationCap, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getActiveTermsForSelection } from '@/services/termCalendarService';
import { getGradingSlots } from '@/services/gradingService';
import { formatBeltLevel, BELT_LEVELS } from '@/constants/beltLevels';

import { useIsMobile } from '@/hooks/use-mobile';

interface QuickActionsSectionProps {
  studentId: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    branch_id?: string;
    current_belt?: string;
    date_of_birth?: string;
  };
  onOpenSchoolFees: () => void;
  onOpenGrading: () => void;
  
}

// Normalize belt for comparison
const normalizeBelt = (belt: string): string => {
  return belt.replace(/-/g, ' ').trim().toLowerCase();
};

// Get next belt in progression
export const getNextBelt = (currentBelt: string | null | undefined): string | null => {
  if (!currentBelt) return null;
  const normalizedCurrent = normalizeBelt(currentBelt);
  const idx = BELT_LEVELS.findIndex(b => normalizeBelt(b) === normalizedCurrent);
  return idx >= 0 && idx < BELT_LEVELS.length - 1 ? BELT_LEVELS[idx + 1] : null;
};

const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  studentId,
  student,
  onOpenSchoolFees,
  onOpenGrading,
  
}) => {
  const isMobile = useIsMobile();
  // Check if student has branch
  const hasBranch = !!student.branch_id;

  // Check for available terms
  const { data: availableTerms = [] } = useQuery({
    queryKey: ['available-terms-for-student', student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return [];
      const terms = await getActiveTermsForSelection();
      // Only filter by branch - getActiveTermsForSelection() already 
      // returns terms where end_date >= today
      return terms.filter(t => t.branch_id === student.branch_id);
    },
    enabled: hasBranch,
  });

  // Check for previous enrollment
  const { data: previousEnrollment } = useQuery({
    queryKey: ['student-previous-enrollment', studentId, student.branch_id],
    queryFn: async () => {
      if (!student.branch_id) return null;
      const { data } = await supabase
        .from('student_class_enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('branch_id', student.branch_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: hasBranch,
  });

  // Check for grading slots matching student's belt
  // Fetch ALL active future slots and filter to those accessible by student's branch
  // (either created in their branch OR their branch is in available_branch_ids)
  const { data: gradingSlots = [] } = useQuery({
    queryKey: ['grading-slots-for-belt', student.branch_id, student.current_belt],
    queryFn: async () => {
      if (!student.branch_id || !student.current_belt) return [];
      const today = new Date().toISOString().split('T')[0];

      // Fetch all active future slots (no branch filter - we'll filter client-side)
      const slots = await getGradingSlots({
        status: 'active',
        from_date: today,
      });

      // Filter to slots accessible by the student's branch
      const branchAccessible = slots.filter(slot => {
        // Slot belongs to student's branch
        if (slot.branch_id === student.branch_id) return true;
        // Slot is available to student's branch via available_branch_ids
        const availableBranchIds = (slot as any).available_branch_ids as string[] | null;
        if (availableBranchIds && availableBranchIds.length > 0) {
          return availableBranchIds.includes(student.branch_id!);
        }
        return false;
      });

      // Filter by matching belt level
      const normalizedStudentBelt = normalizeBelt(student.current_belt || '');
      const beltFiltered = branchAccessible.filter(slot => {
        if (!slot.belt_levels || slot.belt_levels.length === 0) return true;
        return slot.belt_levels.some(beltLevel =>
          normalizeBelt(beltLevel) === normalizedStudentBelt
        );
      });

      // Filter by student age
      const studentDob = student.date_of_birth;
      if (studentDob) {
        const today = new Date();
        const dob = new Date(studentDob);
        const ageInYears = (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return beltFiltered.filter(slot => {
          const s = slot as any;
          if (s.min_age != null && ageInYears < s.min_age) return false;
          if (s.max_age != null && ageInYears > s.max_age) return false;
          return true;
        });
      }
      return beltFiltered;
    },
    enabled: hasBranch && !!student.current_belt,
  });


  const { data: isReadyForGrading } = useQuery({
    queryKey: ['student-ready-for-grading', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('grading_registrations')
        .select('id, ready_for_grading')
        .eq('student_id', student.id)
        .eq('ready_for_grading', true)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: !!student.id,
  });

  // Check for paid grading registration
  const { data: paidGrading } = useQuery({
    queryKey: ['paid-grading-registration', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('grading_registrations')
        .select('id, current_belt, target_belt, grading_slot_id, grading_slots(grading_date, start_time, end_time, location, title)')
        .eq('student_id', student.id)
        .eq('ready_for_grading', true)
        .not('invoice_item_id', 'is', null)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!student.id,
  });

  const canPaySchoolFees = hasBranch && availableTerms.length > 0;
  const canPayGrading = hasBranch && !!student.current_belt && gradingSlots.length > 0 && !!isReadyForGrading && !paidGrading;
  const nextBelt = getNextBelt(student.current_belt);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pay School Fees */}
        <Card className={`cursor-pointer transition-all hover:shadow-md ${!canPaySchoolFees ? 'opacity-60' : ''}`}>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-start gap-3 md:gap-4">
              <div className="bg-primary/10 p-2.5 md:p-3 rounded-lg flex-shrink-0">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Pay School Fees</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {canPaySchoolFees 
                    ? 'Renew your class enrollment for the next term'
                    : !hasBranch 
                      ? 'No branch assigned'
                      : 'No upcoming terms available'}
                </p>
                {canPaySchoolFees ? (
                  <Button 
                    size="sm" 
                    onClick={onOpenSchoolFees}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Select Term
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    Contact academy for assistance
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grading Registered - shown when grading is paid */}
        {paidGrading && (
          <Card className="transition-all border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-start gap-3 md:gap-4">
                <div className="bg-green-500/10 p-2.5 md:p-3 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} text-green-700 dark:text-green-400`}>Grading Registered ✓</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {formatBeltLevel(paidGrading.current_belt)} → {formatBeltLevel(paidGrading.target_belt)}
                  </p>
                  {(paidGrading as any).grading_slots && (
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p className="font-medium text-foreground">
                        {format(new Date((paidGrading as any).grading_slots.grading_date), 'dd MMM yyyy')}
                        {(paidGrading as any).grading_slots.start_time && ` • ${(paidGrading as any).grading_slots.start_time.slice(0, 5)}`}
                        {(paidGrading as any).grading_slots.end_time && ` - ${(paidGrading as any).grading_slots.end_time.slice(0, 5)}`}
                      </p>
                      {((paidGrading as any).grading_slots.location || (paidGrading as any).grading_slots.title) && (
                        <p>{(paidGrading as any).grading_slots.title || (paidGrading as any).grading_slots.location}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pay Grading - only shown when student is marked ready and NOT yet paid */}
        {canPayGrading && (
          <Card className="cursor-pointer transition-all hover:shadow-md">
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="flex items-start gap-3 md:gap-4">
                <div className="bg-purple-500/10 p-2.5 md:p-3 rounded-lg flex-shrink-0">
                  <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Pay Grading</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {`Register for ${formatBeltLevel(student.current_belt)} → ${formatBeltLevel(nextBelt)} exam`}
                  </p>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={onOpenGrading}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Select Grading Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

    </div>
  );
};

export default QuickActionsSection;
