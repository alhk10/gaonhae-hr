/** Competition registration deadlines are entered and shown in GMT+8 (Singapore / Perth). */
const OFFSET_MS = 8 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

/** "DD/MM/YYYY" + "HH:MM" (GMT+8) → ISO string; '' date → null; invalid → undefined. */
export const parseDeadline = (date: string, time: string): string | null | undefined => {
  if (!date.trim()) return null;
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec((time || '23:59').trim());
  if (!d || !t) return undefined;
  const [dd, mm, yyyy, hh, mi] = [+d[1], +d[2], +d[3], +t[1], +t[2]];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59) return undefined;
  const utc = Date.UTC(yyyy, mm - 1, dd, hh, mi) - OFFSET_MS;
  const check = new Date(utc + OFFSET_MS);
  if (check.getUTCDate() !== dd) return undefined;
  return new Date(utc).toISOString();
};

/** ISO → { date: "DD/MM/YYYY", time: "HH:MM" } in GMT+8. */
export const splitDeadline = (iso: string | null | undefined) => {
  if (!iso) return { date: '', time: '' };
  const x = new Date(new Date(iso).getTime() + OFFSET_MS);
  return {
    date: `${pad(x.getUTCDate())}/${pad(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`,
    time: `${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`,
  };
};

export const formatDeadline = (iso: string | null | undefined) => {
  const s = splitDeadline(iso);
  return s.date ? `${s.date} ${s.time} (GMT+8)` : '';
};

export const isPastDeadline = (iso: string | null | undefined, now: Date = new Date()) =>
  !!iso && new Date(iso).getTime() <= now.getTime();
