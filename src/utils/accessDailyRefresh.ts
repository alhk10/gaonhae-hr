export const ACCESS_DAILY_REFRESH_KEY = 'access_last_daily_refresh';

/** Singapore (UTC+8) calendar date key, YYYY-MM-DD. */
export function sgtDateKey(now: Date): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export function shouldRefreshToday(lastDate: string | null, now: Date): boolean {
  return lastDate !== sgtDateKey(now);
}

/** Reloads once per SGT day. Saves the date first so it can never loop. */
export function runAccessDailyRefresh(now: Date = new Date()): boolean {
  try {
    const last = localStorage.getItem(ACCESS_DAILY_REFRESH_KEY);
    if (!shouldRefreshToday(last, now)) return false;
    localStorage.setItem(ACCESS_DAILY_REFRESH_KEY, sgtDateKey(now));
    if (last === null) return false; // very first visit on this device: already fresh
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
