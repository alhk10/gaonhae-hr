/**
 * School-owned mailboxes that must never be used as a submitter's email on the
 * public forms (grading, competitions, events/seminars, uniforms & guards,
 * school fees). Using them sends confirmations to the school and makes it
 * impossible to match the payment to the right family.
 */

export const BLOCKED_PUBLIC_EMAILS = [
  'gaonhaetaekwondo@gmail.com',
  'management@gaonhaetaekwondo.com',
  'hello@gaonhaetaekwondo.com',
  'kem.gaonhaetaekwondo@gmail.com',
  'ysn.gaonhaetaekwondo@gmail.com',
  'bkm.gaonhaetaekwondo@gmail.com',
  'jw.gaonhaetaekwondo@gmail.com',
] as const;

export const BLOCKED_EMAIL_MESSAGE =
  'Please use your own email address, not a school address.';

export const isBlockedEmail = (value: string | null | undefined): boolean => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return false;
  return (BLOCKED_PUBLIC_EMAILS as readonly string[]).includes(v);
};
