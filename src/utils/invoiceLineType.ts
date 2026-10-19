/** True for class/lesson/term/grading lines, where quantity is not shown on invoices. */
export function isClassLineItem(item: {
  description?: string | null;
  term_info?: string | null;
  grading_info?: string | null;
  metadata?: Record<string, any> | null;
}): boolean {
  const m = item.metadata || {};
  if (m.term_id || m.grading_slot_id || item.term_info || item.grading_info) return true;
  return /\b(lesson|lessons|class|classes|term|grading)\b/i.test(item.description || '');
}
