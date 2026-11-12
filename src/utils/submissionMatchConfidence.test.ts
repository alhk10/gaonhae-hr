import { pickAutoMatch, matchContradiction, MAX_GUARDS_MATCH_SCORE } from './submissionMatchConfidence';

const opts = (subject: any) => ({ maxScore: MAX_GUARDS_MATCH_SCORE, subject });

const it = (n: string, f: () => void) => f();
const ok = (c: boolean, m: string) => { if (!c) throw new Error(m); };
{
  it('a shared first name never auto-links (FARHAN SHAIKH vs LANA FARHAN YUSOFF)', () => {
    const cand = { id: 'lana', first_name: 'LANA FARHAN', last_name: 'YUSOFF', date_of_birth: '2018-01-09', score: 13 };
    ok(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' })) === null, 'null');
    ok(matchContradiction({ name: 'FARHAN SHAIKH' }, cand) !== null, 'notnull');
  });
  it('exact name and birth date links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: '2018-01-09', score: 13 };
    ok(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' }))?.match.id === 'f', 'exact');
  });
  it('one-day birth date drift with same name links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: '2018-01-08', score: 13 };
    ok(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' })) !== null, 'notnull');
  });
  it('missing birth date never auto-links', () => {
    const cand = { id: 'f', first_name: 'FARHAN', last_name: 'SHAIKH', date_of_birth: null, score: 13 };
    ok(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' })) === null, 'null');
  });
  it('sibling with same surname but different birth date is not linked', () => {
    const cand = { id: 's', first_name: 'AISHA', last_name: 'SHAIKH', date_of_birth: '2016-05-01', score: 13 };
    ok(pickAutoMatch([cand], opts({ name: 'FARHAN SHAIKH', dateOfBirth: '2018-01-09' })) === null, 'null');
  });
}
console.log('submissionMatchConfidence tests passed');
