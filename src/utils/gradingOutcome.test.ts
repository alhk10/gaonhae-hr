import { gradingOutcome, certificateBelts } from './gradingOutcome';

describe('gradingOutcome', () => {
  it('Red Tip >> Red pass makes a Red belt', () => {
    expect(gradingOutcome('Red Tip >> Red', 'pass', { from: 'Blue', to: 'Red' })).toEqual({ from: 'Red Tip', to: 'Red' });
  });
  it('White >> Yellow Tip double makes a Yellow belt', () => {
    expect(gradingOutcome('White >> Yellow Tip', 'double').to).toBe('Yellow');
  });
});

describe('certificateBelts', () => {
  it('double from White gives White and Yellow Tip certificates', () => {
    expect(certificateBelts('White', 'double')).toEqual(['White', 'Yellow Tip']);
  });
  it('pass gives one certificate', () => {
    expect(certificateBelts('Red Tip', 'pass')).toEqual(['Red Tip']);
  });
});
