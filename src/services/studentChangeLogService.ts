/**
 * Student Change Log Service
 * Handles logging and retrieving changes made to students
 */

import { supabase } from '@/integrations/supabase/client';

export interface StudentChangeLog {
  id: string;
  student_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changes: Record<string, any> | null;
  changed_by: string | null;
  changed_by_email: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface CreateChangeLogData {
  student_id: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, any>;
}

/**
 * Get change logs for a specific student
 */
export const getStudentChangeLogs = async (studentId: string): Promise<StudentChangeLog[]> => {
  const { data, error } = await supabase
    .from('student_change_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student change logs:', error);
    throw new Error('Failed to fetch change logs');
  }

  return (data || []) as StudentChangeLog[];
};

/**
 * Log a change to a student record
 */
export const logStudentChange = async (changeData: CreateChangeLogData): Promise<void> => {
  try {
    // Get current user email
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || null;

    // Get employee ID if available
    let employeeId: string | null = null;
    if (userEmail) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();
      
      employeeId = employee?.id || null;
    }

    const { error } = await supabase
      .from('student_change_logs')
      .insert({
        student_id: changeData.student_id,
        action: changeData.action,
        field_name: changeData.field_name || null,
        old_value: changeData.old_value || null,
        new_value: changeData.new_value || null,
        changes: changeData.changes || null,
        changed_by: employeeId,
        changed_by_email: userEmail
      });

    if (error) {
      console.error('Error logging student change:', error);
      // Don't throw - logging should not break the main operation
    }
  } catch (error) {
    console.error('Error in logStudentChange:', error);
    // Don't throw - logging should not break the main operation
  }
};

/**
 * Log multiple field changes at once
 */
export const logStudentFieldChanges = async (
  studentId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
): Promise<void> => {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Compare fields and identify changes
  const fieldsToTrack = [
    'first_name', 'last_name', 'preferred_name', 'certificate_name', 'display_name',
    'date_of_birth', 'gender', 'nationality', 'nric_passport', 'email', 'phone',
    'address', 'postal_code', 'current_belt', 'status', 'branch_id', 'referral_source',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
    'emergency_contact_2_name', 'emergency_contact_2_phone', 'emergency_contact_2_relationship',
    'medical_conditions', 'dietary_restrictions', 'training_goals', 'previous_experience', 'notes'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldData[field];
    const newValue = newData[field];
    
    // Handle arrays (like languages_spoken)
    const oldStr = Array.isArray(oldValue) ? JSON.stringify(oldValue) : String(oldValue || '');
    const newStr = Array.isArray(newValue) ? JSON.stringify(newValue) : String(newValue || '');
    
    if (oldStr !== newStr) {
      changes[field] = { old: oldValue, new: newValue };
    }
  }

  // Also check languages_spoken
  const oldLangs = JSON.stringify(oldData.languages_spoken || []);
  const newLangs = JSON.stringify(newData.languages_spoken || []);
  if (oldLangs !== newLangs) {
    changes['languages_spoken'] = { old: oldData.languages_spoken, new: newData.languages_spoken };
  }

  if (Object.keys(changes).length > 0) {
    await logStudentChange({
      student_id: studentId,
      action: 'update',
      changes
    });
  }
};

/**
 * Format field name for display
 */
export const formatFieldName = (fieldName: string): string => {
  const fieldLabels: Record<string, string> = {
    first_name: 'First Name',
    last_name: 'Last Name',
    preferred_name: 'Preferred Name',
    certificate_name: 'Certificate Name',
    display_name: 'Display Name',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    nationality: 'Nationality',
    nric_passport: 'NRIC/Passport',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    postal_code: 'Postal Code',
    current_belt: 'Current Belt',
    status: 'Status',
    branch_id: 'Branch',
    referral_source: 'Referral Source',
    emergency_contact_name: 'Emergency Contact 1 Name',
    emergency_contact_phone: 'Emergency Contact 1 Phone',
    emergency_contact_relationship: 'Emergency Contact 1 Relationship',
    emergency_contact_2_name: 'Emergency Contact 2 Name',
    emergency_contact_2_phone: 'Emergency Contact 2 Phone',
    emergency_contact_2_relationship: 'Emergency Contact 2 Relationship',
    medical_conditions: 'Medical Conditions',
    dietary_restrictions: 'Dietary Restrictions',
    training_goals: 'Training Goals',
    previous_experience: 'Previous Experience',
    notes: 'Notes',
    languages_spoken: 'Languages Spoken',
    registered_date: 'Registered Date'
  };

  return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format action for display
 */
export const formatAction = (action: string): string => {
  const actionLabels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    status_change: 'Status Changed'
  };

  return actionLabels[action] || action;
};
