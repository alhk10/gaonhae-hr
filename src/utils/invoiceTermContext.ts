/**
 * Shared resolver for the "term context" used by SMS and WhatsApp invoice messages.
 *
 * The invoice's term (from line-item metadata) represents the UPCOMING term
 * (the one that will commence next week). The "ending" term is the active term
 * immediately preceding it. We fall back gracefully when no term is anchored
 * to the invoice items.
 */

import {
  getCurrentTerm,
  getMostRecentTerm,
  getNextTerm,
  getPreviousTerm,
  getTermById,
  getUpcomingTerm,
} from '@/services/termCalendarService';
import type { SmsTermInfo } from '@/utils/invoicePDFGenerator';

export interface InvoiceTermContext {
  current?: SmsTermInfo | null;
  next?: SmsTermInfo | null;
}

/**
 * Resolve the SMS/WhatsApp term context for an invoice.
 *
 * @param branchId - The invoice's branch id (required to look up terms)
 * @param items - The full invoice items (used to read metadata.term_id)
 */
export const resolveInvoiceTermContext = async (
  branchId: string | null | undefined,
  items: Array<{ metadata?: { term_id?: string } | null }> | null | undefined,
): Promise<InvoiceTermContext | undefined> => {
  if (!branchId) return undefined;

  // Look for a term_id in the invoice's line items (most recent item wins)
  const itemTermId: string | undefined = (items || [])
    .map((it) => it?.metadata?.term_id)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .pop();

  let upcomingTermResolved: any = null;
  if (itemTermId) {
    upcomingTermResolved = await getTermById(itemTermId).catch(() => null);
  }
  if (!upcomingTermResolved) {
    upcomingTermResolved = await getUpcomingTerm(branchId).catch(() => null);
  }

  let endingTerm: any = null;
  if (upcomingTermResolved) {
    endingTerm = await getPreviousTerm(branchId, upcomingTermResolved.start_date).catch(() => null);
  } else {
    // Last-resort fallback: original behavior (current term as ending, next as upcoming)
    endingTerm = (await getCurrentTerm(branchId).catch(() => null))
      || (await getMostRecentTerm(branchId).catch(() => null));
    upcomingTermResolved = endingTerm
      ? await getNextTerm(branchId, endingTerm.end_date).catch(() => null)
      : null;
  }

  return {
    current: endingTerm
      ? { name: endingTerm.name, start_date: endingTerm.start_date, end_date: endingTerm.end_date }
      : null,
    next: upcomingTermResolved
      ? { name: upcomingTermResolved.name, start_date: upcomingTermResolved.start_date, end_date: upcomingTermResolved.end_date }
      : null,
  };
};
