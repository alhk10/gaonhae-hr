import { describe, it, expect } from 'vitest';
import { isHomeScreenPromptDue } from './HelloAppExtras';

const DAY = 24 * 60 * 60 * 1000;

describe('Home Screen prompt every 150 days', () => {
  it('shows on first login', () => expect(isHomeScreenPromptDue(null)).toBe(true));
  it('stays hidden at 149 days', () => expect(isHomeScreenPromptDue(0, 149 * DAY)).toBe(false));
  it('shows again at 150 days', () => expect(isHomeScreenPromptDue(0, 150 * DAY)).toBe(true));
});
