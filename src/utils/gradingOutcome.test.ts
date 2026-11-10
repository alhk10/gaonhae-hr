import { gradingOutcome, certificateBelts } from './gradingOutcome';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${rule}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

equal(gradingOutcome('Red Tip >> Red', 'pass', { from: 'Blue', to: 'Red' }), { from: 'Red Tip', to: 'Red' }, 'Red Tip >> Red pass makes a Red belt');
equal(gradingOutcome('White >> Yellow Tip', 'double').to, 'Yellow', 'White >> Yellow Tip double makes a Yellow belt');
equal(certificateBelts('White', 'double'), ['White', 'Yellow Tip'], 'double from White gives White and Yellow Tip certificates');
equal(certificateBelts('Red Tip', 'pass'), ['Red Tip'], 'pass gives one certificate');

import { chainFoundationLines as _chain } from './gradingOutcome';
import { test as _t, expect as _e } from 'vitest';
_t('combined Foundation 1-3 lines resolve to White', () => {
  _e(_chain('Foundation 1 >> Foundation 2', ['Foundation 2 >> Foundation 3', 'Foundation 3 >> White'])).toBe('Foundation 1 >> White');
});
