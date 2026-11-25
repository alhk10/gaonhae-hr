import { computeNextGradingDefault } from './nextGradingProduct';
import type { ChatProduct } from '@/services/publicChatService';

const prods = [
  { product_id: 'a', product_name: 'Stage 1 - 3' },
  { product_id: 'b', product_name: 'Stage 4 - 10' },
  { product_id: 'c', product_name: 'Stage 11-26' },
] as unknown as ChatProduct[];

const check = (belt: string, done: number[], expected: string) => {
  const got = computeNextGradingDefault(belt, done, prods).product?.product_id;
  if (got !== expected) throw new Error(`${belt} ${done}: expected ${expected}, got ${got}`);
};

check('1st Poom', [1], 'a');
check('1st Poom', [1, 2], 'a');
check('2nd Poom', [4], 'b');
check('3rd Dan', [11], 'c');
console.log('nextGradingProduct: all checks passed');
