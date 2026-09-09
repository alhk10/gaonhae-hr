/**
 * School fee payment plans.
 *
 * Fees can be paid one of two ways:
 *  - four_weeks: weekly price x 4, no discounts
 *  - term:       weekly price x term teaching weeks, discounts apply
 *
 * Once a student has paid a 4-week plan inside a term, the same plan applies
 * for the rest of that term.
 */
import { supabase } from '@/integrations/supabase/client';

export type FeePaymentPlan = 'four_weeks' | 'term';

export const FOUR_WEEK_WEEKS = 4;
export const EARLY_PAYMENT_DISCOUNT = 10;
export const SIBLING_DISCOUNT_DEFAULT = 20;
export const SIBLING_DISCOUNT_YISHUN = 10;

export const FOUR_WEEK_NOTE =
  'Paying for 4 weeks means you continue on the 4-week plan for the rest of this term.';

export const siblingDiscountForBranch = (branchId?: string | null): number =>
  (branchId || '').toLowerCase().includes('yishun')
    ? SIBLING_DISCOUNT_YISHUN
    : SIBLING_DISCOUNT_DEFAULT;

/** $10 off when paying on or before the term start date. */
export const earlyPaymentDiscountFor = (termStartDate?: string | null): number => {
  if (!termStartDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(termStartDate);
  start.setHours(0, 0, 0, 0);
  return today <= start ? EARLY_PAYMENT_DISCOUNT : 0;
};

export interface PlanQuoteInput {
  weeklyPrice: number;
  termWeeks: number;
  termStartDate?: string | null;
  /** $20 / $10 sibling discount already resolved for this student, or 0. */
  siblingDiscount?: number;
}

export interface PlanQuote {
  plan: FeePaymentPlan;
  weeks: number;
  subtotal: number;
  earlyPaymentDiscount: number;
  siblingDiscount: number;
  total: number;
}

export const quotePlan = (plan: FeePaymentPlan, input: PlanQuoteInput): PlanQuote => {
  const weeks = plan === 'four_weeks' ? FOUR_WEEK_WEEKS : Math.max(1, input.termWeeks || 1);
  const subtotal = Number(input.weeklyPrice || 0) * weeks;
  // Discounts are term-plan only.
  const early = plan === 'term' ? earlyPaymentDiscountFor(input.termStartDate) : 0;
  const sibling = plan === 'term' ? Math.max(0, input.siblingDiscount || 0) : 0;
  return {
    plan,
    weeks,
    subtotal,
    earlyPaymentDiscount: early,
    siblingDiscount: sibling,
    total: Math.max(0, subtotal - early - sibling),
  };
};

/**
 * Returns 'four_weeks' when the student already paid a 4-week plan for this
 * term (so only that plan may be offered), otherwise null.
 */
export const getLockedPlanForTerm = async (
  studentId?: string | null,
  termId?: string | null,
): Promise<FeePaymentPlan | null> => {
  if (!studentId || !termId) return null;
  try {
    const { data, error } = await supabase.rpc('get_student_fee_plan_for_term' as any, {
      p_student_id: studentId,
      p_term_id: termId,
    });
    if (error) throw error;
    return (data as any) === 'four_weeks' ? 'four_weeks' : null;
  } catch (e) {
    console.warn('getLockedPlanForTerm failed', e);
    return null;
  }
};
