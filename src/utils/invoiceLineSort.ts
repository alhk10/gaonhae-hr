import { SG_FOUNDATION, COMMON_BELTS } from '@/constants/beltLevels';

const BELT_ORDER = ['Foundation', ...SG_FOUNDATION, ...COMMON_BELTS].map(b => b.toLowerCase());

/** Belt grade index found in text, longest name wins (so "Yellow Tip" beats "Yellow"). */
const beltIndex = (text: string): number => {
  const t = text.toLowerCase();
  let best = -1, bestLen = 0;
  BELT_ORDER.forEach((b, i) => {
    if (b.length > bestLen && new RegExp(`\\b${b}\\b`).test(t)) { best = i; bestLen = b.length; }
  });
  return best;
};

export function getInvoiceLineSortKey(description?: string | null): [number, number, number, string] {
  const d = (description || '').trim();
  const l = d.toLowerCase();
  const size = Number((d.match(/\b(\d{2,3})\b/) || [])[1] ?? 0);
  let group = 8, sub = 0;
  if (/\btrial\b/.test(l)) group = 0;
  else if (/\bregistration\b/.test(l)) group = 1;
  else if (/\bgrading\b|>>|^stage \d/.test(l)) group = 3;
  else if (/\b(lesson|lessons|class|classes|klass|term|school fee|weekly|weekday|weekend)\b/.test(l)) group = 2;
  else if (/\bcompetition|poomsae entry|kyorugi entry\b/.test(l)) group = 4;
  else if (/\b(uniform|dobok)\b/.test(l)) {
    group = 5;
    sub = /\b(dan|black)\b/.test(l) ? 2 : /\bpoom\b/.test(l) ? 1 : 0;
  } else if (/\bbelt\b/.test(l)) {
    group = 6;
    const inner = (d.match(/\(([^)]*)\)/) || [])[1] || d.replace(/belt/i, '');
    sub = beltIndex(inner);
    if (sub < 0) sub = 999;
  } else if (/\b(guard|guards|headgear|mouth|shield|protector|hogu|glove|bag|accessor|chest|groin|foot)\b/.test(l)) group = 7;
  return [group, sub, size, l];
}

export function compareInvoiceLines(a?: string | null, b?: string | null): number {
  const ka = getInvoiceLineSortKey(a), kb = getInvoiceLineSortKey(b);
  for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return (ka[i] as number) - (kb[i] as number);
  return ka[3].localeCompare(kb[3]);
}

/** Returns a new array in display order; never mutates the input. */
export function sortInvoiceLines<T extends { description?: string | null }>(items: T[]): T[] {
  return items.map((it, i) => ({ it, i }))
    .sort((x, y) => compareInvoiceLines(x.it.description, y.it.description) || x.i - y.i)
    .map(x => x.it);
}
