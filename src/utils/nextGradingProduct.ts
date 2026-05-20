/**
 * Compute the next grading product for a matched student based on
 * their current belt and which Stage gradings they have already passed.
 *
 * Rules:
 *  - Coloured belts: pick "<currentBelt> >> <next>" product.
 *  - 1st Poom / 1st Dan: must complete Stages 1-3 (3 total) before advancing.
 *  - 2nd Poom / 2nd Dan: must complete Stages 4-10 (7 total) before advancing.
 *  - 3rd Poom / 3rd Dan: must complete Stages 11-26 (16 total). After all done, no auto.
 */
import type { ChatProduct } from '@/services/publicChatService';

export interface GradingDefaultResult {
  product: ChatProduct | null;
  reason:
    | 'stage_next'
    | 'belt_transition'
    | 'no_current_belt'
    | 'no_match'
    | 'all_stages_done';
  message: string;
  nextStageNumber?: number;
  completedInBand?: number;
  totalInBand?: number;
}

const STAGE_BANDS: Record<string, { from: number; to: number; nextBelt: string }> = {
  '1st Poom': { from: 1, to: 3, nextBelt: '2nd Poom' },
  '1st Dan': { from: 1, to: 3, nextBelt: '2nd Dan' },
  '2nd Poom': { from: 4, to: 10, nextBelt: '3rd Poom' },
  '2nd Dan': { from: 4, to: 10, nextBelt: '3rd Dan' },
  '3rd Poom': { from: 11, to: 26, nextBelt: '' },
  '3rd Dan': { from: 11, to: 26, nextBelt: '' },
};

const parseStageNumber = (name: string): number | null => {
  const m = name.trim().match(/^stage\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
};

const findStageProduct = (products: ChatProduct[], stageNum: number): ChatProduct | null => {
  return products.find(p => parseStageNumber(p.product_name) === stageNum) ?? null;
};

const findBeltTransitionProduct = (products: ChatProduct[], fromBelt: string): ChatProduct | null => {
  const target = fromBelt.toLowerCase();
  return products.find(p => {
    const idx = p.product_name.indexOf('>>');
    if (idx <= 0) return null;
    return p.product_name.slice(0, idx).trim().toLowerCase() === target;
  }) ?? null;
};

export const computeNextGradingDefault = (
  currentBelt: string | null,
  completedStageNumbers: number[],
  products: ChatProduct[],
): GradingDefaultResult => {
  if (!currentBelt) {
    return {
      product: null,
      reason: 'no_current_belt',
      message: "We don't have your current belt on file — please pick the grading that applies.",
    };
  }

  const band = STAGE_BANDS[currentBelt];
  if (band) {
    const inBand = completedStageNumbers.filter(n => n >= band.from && n <= band.to);
    const total = band.to - band.from + 1;
    if (inBand.length < total) {
      // Lowest stage not yet done.
      let next = band.from;
      const done = new Set(inBand);
      while (next <= band.to && done.has(next)) next++;
      const product = findStageProduct(products, next);
      if (product) {
        return {
          product,
          reason: 'stage_next',
          message: `Current belt: ${currentBelt}. Next grading: Stage ${next} (${inBand.length + 1} of ${total}).`,
          nextStageNumber: next,
          completedInBand: inBand.length,
          totalInBand: total,
        };
      }
      return {
        product: null,
        reason: 'no_match',
        message: `No Stage ${next} grading slot found at this branch — please pick the closest option.`,
      };
    }
    // All stages in band done → belt transition (if any).
    if (band.nextBelt) {
      const product = findBeltTransitionProduct(products, currentBelt);
      if (product) {
        return {
          product,
          reason: 'belt_transition',
          message: `Current belt: ${currentBelt}. All ${total} stages complete — next: ${currentBelt} >> ${band.nextBelt}.`,
        };
      }
      return {
        product: null,
        reason: 'no_match',
        message: `No "${currentBelt} >> ${band.nextBelt}" grading found at this branch — please pick the closest option.`,
      };
    }
    return {
      product: null,
      reason: 'all_stages_done',
      message: `All ${total} stages complete for ${currentBelt}. Please pick the appropriate grading.`,
    };
  }

  // Coloured belt → belt transition product.
  const product = findBeltTransitionProduct(products, currentBelt);
  if (product) {
    return {
      product,
      reason: 'belt_transition',
      message: `Current belt: ${currentBelt}. Next grading: ${product.product_name}.`,
    };
  }
  return {
    product: null,
    reason: 'no_match',
    message: `No grading slot found for ${currentBelt} at this branch — please pick the closest option.`,
  };
};
