import { describe, it, expect } from 'vitest';
import { isSupabaseWrite } from './accessAutoRefresh';
const B = 'https://x.supabase.co/rest/v1/';
describe('access auto refresh', () => {
  it('saving settings triggers a refresh', () => expect(isSupabaseWrite(B + 'rpc/access_grading_branch_score_settings_set', 'POST')).toBe(true));
  it('marking attendance triggers a refresh', () => expect(isSupabaseWrite(B + 'rpc/access_attendance_mark', 'POST')).toBe(true));
  it('loading the grading list does not', () => expect(isSupabaseWrite(B + 'rpc/get_public_grading_list', 'POST')).toBe(false));
  it('loading the attendance week does not', () => expect(isSupabaseWrite(B + 'rpc/access_attendance_week', 'POST')).toBe(false));
  it('table edits trigger a refresh', () => expect(isSupabaseWrite(B + 'invoices?id=eq.1', 'PATCH')).toBe(true));
  it('table reads do not', () => expect(isSupabaseWrite(B + 'invoices?select=*', 'GET')).toBe(false));
});
