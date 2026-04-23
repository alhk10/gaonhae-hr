import { supabase } from '@/integrations/supabase/client';
import { normalizeStoredPhone } from '@/constants/formOptions';

export interface StudentRegistrationData {
  referral_source?: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  certificate_name?: string;
  display_name?: string;
  date_of_birth?: string;
  gender?: string;
  nric_passport?: string;
  passport_no?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  nationality?: string[];
  languages_spoken?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
  current_belt?: string;
  previous_experience?: string;
  training_goals?: string;
  medical_conditions?: string;
  dietary_restrictions?: string;
  branch_id?: string;
  notes?: string;
  signature_url?: string;
}

export async function submitStudentRegistration(data: StudentRegistrationData) {
  const { error } = await supabase
    .from('student_registrations')
    .insert({
      ...data,
      phone: normalizeStoredPhone(data.phone) || null,
      whatsapp: normalizeStoredPhone(data.whatsapp) || null,
      emergency_contact_phone: normalizeStoredPhone(data.emergency_contact_phone) || null,
      emergency_contact_2_phone: normalizeStoredPhone(data.emergency_contact_2_phone) || null,
      nationality: data.nationality || [],
      languages_spoken: data.languages_spoken || [],
      status: 'pending',
    });

  if (error) throw new Error(error.message);
}

export async function getPendingRegistrations(branchId?: string) {
  let query = supabase
    .from('student_registrations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPendingRegistrationsCount(branchId?: string) {
  let query = supabase
    .from('student_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

export async function approveRegistration(registrationId: string, reviewerEmail: string, overrides?: Record<string, any>) {
  // Get the registration data
  const { data: reg, error: fetchError } = await supabase
    .from('student_registrations')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (fetchError || !reg) throw new Error('Registration not found');

  // Merge overrides from the approval dialog
  const merged = { ...reg, ...(overrides || {}) };

  // Determine belt - null if empty/invalid to satisfy DB constraint
  const beltValue = merged.current_belt && merged.current_belt.trim() !== '' ? merged.current_belt : null;

  // Create the student
  const { createStudent } = await import('@/services/studentService');
  await createStudent({
    first_name: merged.first_name,
    last_name: merged.last_name,
    preferred_name: merged.preferred_name || '',
    certificate_name: merged.certificate_name || `${merged.first_name} ${merged.last_name}`.trim(),
    display_name: merged.display_name || `${merged.first_name} ${merged.last_name}`.trim(),
    date_of_birth: merged.date_of_birth || '',
    gender: merged.gender || '',
    nric_passport: merged.nric_passport || '',
    passport_no: merged.passport_no || '',
    phone: normalizeStoredPhone(merged.phone) || '',
    whatsapp: normalizeStoredPhone(merged.whatsapp) || '',
    email: merged.email || '',
    address: merged.address || '',
    postal_code: merged.postal_code || '',
    nationality: (merged.nationality as string[]) || [],
    languages_spoken: (merged.languages_spoken as string[]) || [],
    emergency_contact_name: merged.emergency_contact_name || '',
    emergency_contact_phone: normalizeStoredPhone(merged.emergency_contact_phone) || '',
    emergency_contact_relationship: merged.emergency_contact_relationship || '',
    emergency_contact_2_name: merged.emergency_contact_2_name || '',
    emergency_contact_2_phone: normalizeStoredPhone(merged.emergency_contact_2_phone) || '',
    emergency_contact_2_relationship: merged.emergency_contact_2_relationship || '',
    current_belt: beltValue,
    previous_experience: merged.previous_experience || '',
    training_goals: merged.training_goals || '',
    medical_conditions: merged.medical_conditions || '',
    dietary_restrictions: merged.dietary_restrictions || '',
    branch_id: merged.branch_id || '',
    notes: merged.notes || '',
    referral_source: merged.referral_source || '',
    registered_date: new Date().toISOString().split('T')[0],
    status: 'active',
  });

  // Mark registration as approved
  const { error: updateError } = await supabase
    .from('student_registrations')
    .update({
      status: 'approved',
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  if (updateError) throw new Error(updateError.message);
}

export async function rejectRegistration(registrationId: string, reviewerEmail: string, reviewNotes?: string) {
  const { error } = await supabase
    .from('student_registrations')
    .update({
      status: 'rejected',
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', registrationId);

  if (error) throw new Error(error.message);
}
