import { describe, it, expect } from 'vitest';
import { shouldRefreshToday, sgtDateKey } from './accessDailyRefresh';

describe('access daily refresh', () => {
  it('does not refresh again on the same SGT day', () => {
    const now = new Date('2026-11-21T09:31:00Z'); // 17:31 SGT
    expect(shouldRefreshToday('2026-11-21', now)).toBe(false);
  });
  it('refreshes after SGT midnight', () => {
    const before = new Date('2026-11-21T15:59:00Z'); // 23:59 SGT
    const after = new Date('2026-11-21T16:01:00Z'); // 00:01 SGT next day
    expect(sgtDateKey(before)).toBe('2026-11-21');
    expect(shouldRefreshToday(sgtDateKey(before), after)).toBe(true);
  });
});
