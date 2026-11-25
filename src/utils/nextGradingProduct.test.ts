import { describe, it, expect } from 'vitest';
import { computeNextGradingDefault } from './nextGradingProduct';

const prods = [
  { id: 'a', product_name: 'Stage 1 - 3' },
  { id: 'b', product_name: 'Stage 4 - 10' },
  { id: 'c', product_name: 'Stage 11-26' },
] as any;

describe('stage range products', () => {
  it('Stage 2 picks Stage 1 - 3', () => {
    expect(computeNextGradingDefault('1st Poom', [1], prods).product?.id).toBe('a');
  });
  it('Stage 3 picks Stage 1 - 3', () => {
    expect(computeNextGradingDefault('1st Poom', [1, 2], prods).product?.id).toBe('a');
  });
  it('Stage 5 picks Stage 4 - 10', () => {
    expect(computeNextGradingDefault('2nd Poom', [4], prods).product?.id).toBe('b');
  });
  it('Stage 12 picks Stage 11-26', () => {
    expect(computeNextGradingDefault('3rd Dan', [11], prods).product?.id).toBe('c');
  });
});
