import { canCombineGradingItems, combinedFoundationSpan } from './foundationGrading';

const equal = (actual: unknown, expected: unknown, rule: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${rule}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

equal(canCombineGradingItems(['Foundation 1 >> Foundation 2', 'Foundation 2 >> Foundation 3']), true, 'F1 and F2 steps combine');
equal(canCombineGradingItems(['Foundation 1 >> Foundation 2', 'Foundation 2 >> Foundation 3', 'Foundation 3 >> Yellow Tag']), true, 'all three foundation steps combine');
equal(canCombineGradingItems(['Foundation 1 >> Foundation 2', 'Foundation 1 >> Foundation 2']), false, 'same step twice blocked');
equal(canCombineGradingItems(['Foundation 3 >> Yellow Tag', 'Yellow Tag >> Yellow']), false, 'non-foundation grading cannot combine');
equal(canCombineGradingItems(['Yellow Tag >> Yellow']), true, 'single grading allowed');
equal(combinedFoundationSpan(['Foundation 2 >> Foundation 3', 'Foundation 1 >> Foundation 2']), { from: 'Foundation 1', to: 'Foundation 3' }, 'combined span');
console.log('foundationGrading tests passed');
