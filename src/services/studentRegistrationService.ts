import { supabase } from '@/integrations/supabase/client';

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
}

export async function submitStudentRegistration(data: StudentRegistrationData) {
  const { error } = await supabase
    .from('student_registrations')
    .insert({
      ...data,
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

export async function approveRegistration(registrationId: string, reviewerEmail: string) {
  // Get the registration data
  const { data: reg, error: fetchError } = await supabase
    .from('student_registrations')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (fetchError || !reg) throw new Error('Registration not found');

  // Create the student
  const { createStudent } = await import('@/services/studentService');
  await createStudent({
    first_name: reg.first_name,
    last_name: reg.last_name,
    preferred_name: reg.preferred_name || '',
    certificate_name: reg.certificate_name || `${reg.first_name} ${reg.last_name}`.trim(),
    display_name: reg.display_name || `${reg.first_name} ${reg.last_name}`.trim(),
    date_of_birth: reg.date_of_birth || '',
    gender: reg.gender || '',
    nric_passport: reg.nric_passport || '',
    passport_no: reg.passport_no || '',
    phone: reg.phone || '',
    whatsapp: reg.whatsapp || '',
    email: reg.email || '',
    address: reg.address || '',
    postal_code: reg.postal_code || '',
    nationality: (reg.nationality as string[]) || [],
    languages_spoken: (reg.languages_spoken as string[]) || [],
    emergency_contact_name: reg.emergency_contact_name || '',
    emergency_contact_phone: reg.emergency_contact_phone || '',
    emergency_contact_relationship: reg.emergency_contact_relationship || '',
    emergency_contact_2_name: reg.emergency_contact_2_name || '',
    emergency_contact_2_phone: reg.emergency_contact_2_phone || '',
    emergency_contact_2_relationship: reg.emergency_contact_2_relationship || '',
    current_belt: reg.current_belt || '',
    previous_experience: reg.previous_experience || '',
    training_goals: reg.training_goals || '',
    medical_conditions: reg.medical_conditions || '',
    dietary_restrictions: reg.dietary_restrictions || '',
    branch_id: reg.branch_id || '',
    notes: reg.notes || '',
    referral_source: reg.referral_source || '',
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
