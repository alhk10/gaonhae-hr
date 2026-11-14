export type VisitorCountry = 'singapore' | 'australia' | null;
const KEY = 'visitor_country_v1';

export const countryFromTimezone = (tz?: string): VisitorCountry => {
  if (!tz) return null;
  if (tz === 'Asia/Singapore') return 'singapore';
  if (tz.startsWith('Australia/')) return 'australia';
  return null;
};

export const normaliseCountry = (c?: string | null): VisitorCountry => {
  const v = (c || '').trim().toLowerCase();
  if (v === 'sg' || v === 'singapore') return 'singapore';
  if (v === 'au' || v === 'australia') return 'australia';
  return null;
};

let pending: Promise<VisitorCountry> | null = null;

/** Visitor country via IP (ipapi.co, 2s limit), falling back to browser timezone. Cached per session. */
export const getVisitorCountry = (): Promise<VisitorCountry> => {
  const cached = sessionStorage.getItem(KEY);
  if (cached !== null) return Promise.resolve((cached || null) as VisitorCountry);
  if (pending) return pending;
  pending = (async () => {
    let result: VisitorCountry = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch('https://ipapi.co/country/', { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) result = normaliseCountry(await res.text());
      else throw new Error('geo failed');
      if (!result) { sessionStorage.setItem(KEY, ''); return null; } // other country: show all
    } catch {
      result = countryFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    sessionStorage.setItem(KEY, result || '');
    return result;
  })();
  return pending;
};
