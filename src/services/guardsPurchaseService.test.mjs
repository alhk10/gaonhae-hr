import { readFileSync } from 'node:fs';
import { deepStrictEqual, rejects } from 'node:assert/strict';

// Exercise the actual service function without loading browser-only dependencies.
const source = readFileSync(new URL('./guardsPurchaseService.ts', import.meta.url), 'utf8');
const start = source.indexOf('export const getPublicGuardsProducts =');
const end = source.indexOf('export const getGuardsProductsForBranchAdmin =', start);
if (start < 0 || end < 0) throw new Error('Public guards catalogue function could not be located');
const functionSource = new Bun.Transpiler({ loader: 'ts' }).transformSync(
  source.slice(start, end).replace('export const', 'const'),
);
const createService = new Function(
  'supabase', 'accessPassword',
  `${functionSource}\nreturn getPublicGuardsProducts;`,
);
const getProducts = createService({
  rpc: async (name, args) => {
    deepStrictEqual(name, 'get_public_guards_products');
    deepStrictEqual(args, { p_branch_id: 'kembangan' });
    return {
      data: [{
        item_key: 'gaonhae_set', item_type: 'package', name: 'Gaonhae Protection Guard Set',
        price: '174.40', available_sizes: null, category_name: 'Packages',
      }, {
        item_key: 'uniform', item_type: 'product', name: 'White Uniform',
        price: '80.00', available_sizes: ['120', '130'], category_name: 'Uniforms & Apparels',
      }],
      error: null,
    };
  },
}, () => { throw new Error('Public catalogue must not read a staff password'); });
const products = await getProducts('kembangan');
deepStrictEqual(products.map(({ item_key, price, available_sizes, category_name }) => ({
  item_key, price, available_sizes, category_name,
})), [{
  item_key: 'gaonhae_set', price: 174.4, available_sizes: null, category_name: 'Packages',
}, {
  item_key: 'uniform', price: 80, available_sizes: ['120', '130'], category_name: 'Uniforms & Apparels',
}]);

const emptyProducts = createService({ rpc: async () => ({ data: null, error: null }) });
deepStrictEqual(await emptyProducts('kembangan'), []);

const requestError = new Error('Catalogue unavailable');
const failingProducts = createService({ rpc: async () => ({ data: null, error: requestError }) });
await rejects(() => failingProducts('kembangan'), (error) => error === requestError);
console.log('guardsPurchaseService tests passed');