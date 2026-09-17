/**
 * Learning a family's contact details.
 *
 * A student usually has two parents, so a payment can arrive from either
 * parent's email address or mobile number. Whenever staff link a payment to a
 * student, the contact details used on that payment are saved to the student's
 * additional contacts, so the next payment from the same parent is recognised.
 *
 * The database helpers skip blanks, invalid values, duplicates and the
 * student's primary contact, so calling this repeatedly is safe.
 */
import { supabase } from '@/integrations/supabase/client';

export const rememberStudentContact = async (
  studentId: string,
  contact: { email?: string | null; phone?: string | null },
): Promise<void> => {
  if (!studentId) return;
  if (!contact.email && !contact.phone) return;
  try {
    const { error } = await supabase.rpc('admin_remember_student_contact' as any, {
      p_student_id: studentId,
      p_email: contact.email ?? null,
      p_phone: contact.phone ?? null,
    });
    if (error) console.warn('Failed to remember student contact', error);
  } catch (e) {
    // Learning contacts must never break the matching flow.
    console.warn('Failed to remember student contact', e);
  }
};

/** School fees: the payer's email and mobile live on the chat session. */
export const rememberSchoolFeesContact = async (submissionId: string, studentId: string): Promise<void> => {
  if (!submissionId || !studentId) return;
  try {
    const { error } = await supabase.rpc('admin_remember_school_fees_contact' as any, {
      p_submission_id: submissionId,
      p_student_id: studentId,
    });
    if (error) console.warn('Failed to remember school fees contact', error);
  } catch (e) {
    console.warn('Failed to remember school fees contact', e);
  }
};
