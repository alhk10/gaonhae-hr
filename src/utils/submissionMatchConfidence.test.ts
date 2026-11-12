import { describe, it, expect } from 'vitest';
import { pickAutoMatch, matchContradiction, MAX_GUARDS_MATCH_SCORE } from './submissionMatchConfidence';

const opts = (subject: any) => ({ maxScore: MAX_GUARDS_MATCH_SCORE, subject });

describe('student matching', () => {
  it('a shared first name never auto-links (FARHAN SHAIKH vs LANA FARHAN YUSOFF)', () => {
    const cand = { id: 'lana', first_name: 'LANA FARHAN', last_name: 'YUSOFF', date_of_birth: '2018-01-09', score: 13 };
    expect(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))).toBeNull();
    expect(matchContradiction({ name: 'FARHAN SHAIKH' }, cand)).not.toBeNull();
  });
  it('exact name and birth date links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: '2018-01-09', score: 13 };
    expect(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))?.match.id).toBe('f');
  });
  it('one-day birth date drift with same name links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: '2018-01-08', score: 13 };
    expect(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))).not.toBeNull();
  });
  it('missing birth date never auto-links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: null, score: 13 };
    expect(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))).toBeNull();
  });
  it('sibling with same surname but different birth date is not linked', () => {
    const cand = { id: 's', first_name: 'AISHA', last_name: 'SHAIKH', date_of_birth: '2016-05-01', score: 13 };
    expect(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))).toBeNull();
  });
});
