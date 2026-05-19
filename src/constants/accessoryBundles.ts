/**
 * Hardcoded accessory bundles surfaced on /accessories.
 * Each bundle is composed of real products (UUIDs from `products` table).
 * Bundles are expanded into per-component line items before submission so the
 * downstream invoice always references real products.
 */

export type Gender = 'male' | 'female';

export interface BundleComponent {
  /** Fixed product id, OR resolved per gender */
  productId?: string;
  productIdByGender?: Record<Gender, string>;
  /** Component display label (used in invoice item name) */
  label: string;
  sizeOptions: string[];
  color?: string;
}

export interface AccessoryBundle {
  key: string;
  name: string;
  requiresGender: boolean;
  components: BundleComponent[];
}

const GUARD_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const CHEST_SIZES = ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5'];

export const ACCESSORY_BUNDLES: AccessoryBundle[] = [
  {
    key: 'gaonhae-guard-set',
    name: 'Gaonhae Arm, Shin, Groin Guard Set',
    requiresGender: true,
    components: [
      {
        productId: 'bf2a6538-ac60-43d7-9184-58b926730dc5',
        label: 'Gaonhae Arm Guard',
        sizeOptions: GUARD_SIZES,
      },
      {
        productId: '99a35472-5ca9-4003-abe1-fae49e4252ec',
        label: 'Gaonhae Shin Guard',
        sizeOptions: GUARD_SIZES,
      },
      {
        productIdByGender: {
          male: 'c77e6aa0-93bd-415e-b1c8-b3053041508c',
          female: '55128dd3-df62-4370-8a3f-ced0a7cc9e9a',
        },
        label: 'Gaonhae Groin Guard',
        sizeOptions: GUARD_SIZES,
      },
    ],
  },
  {
    key: 'adidas-guard-set',
    name: 'Adidas Arm, Shin, Groin Guard Set',
    requiresGender: true,
    components: [
      {
        productId: 'bf4681fd-2539-45c3-8040-b688870b8ef7',
        label: 'Adidas Arm Guard',
        sizeOptions: GUARD_SIZES,
      },
      {
        productId: 'ee82a52f-62f7-4aa1-b00d-99608f3ec5ac',
        label: 'Adidas Shin Guard',
        sizeOptions: GUARD_SIZES,
      },
      {
        productIdByGender: {
          male: '2ba4b453-0ad5-4419-80d3-513950102408',
          female: '48a1c3be-8490-4311-b47d-488bb34110a4',
        },
        label: 'Adidas Groin Guard',
        sizeOptions: GUARD_SIZES,
      },
    ],
  },
  {
    key: 'adidas-headgear-red-chestguard',
    name: 'Adidas Headgear (Red) & Chest Guard Set',
    requiresGender: false,
    components: [
      {
        productId: 'a403769f-946a-48f2-b0ab-6dc945c4b853',
        label: 'Adidas Headgear (Red)',
        sizeOptions: GUARD_SIZES,
        color: 'Red',
      },
      {
        productId: '3c293381-8020-4124-bef5-9808eaf157f3',
        label: 'Adidas Chestguard',
        sizeOptions: CHEST_SIZES,
      },
    ],
  },
  {
    key: 'adidas-headgear-blue-chestguard',
    name: 'Adidas Headgear (Blue) & Chest Guard Set',
    requiresGender: false,
    components: [
      {
        productId: 'a403769f-946a-48f2-b0ab-6dc945c4b853',
        label: 'Adidas Headgear (Blue)',
        sizeOptions: GUARD_SIZES,
        color: 'Blue',
      },
      {
        productId: '3c293381-8020-4124-bef5-9808eaf157f3',
        label: 'Adidas Chestguard',
        sizeOptions: CHEST_SIZES,
      },
    ],
  },
];

export const resolveComponentProductId = (
  c: BundleComponent,
  gender: Gender | null,
): string | null => {
  if (c.productId) return c.productId;
  if (c.productIdByGender && gender) return c.productIdByGender[gender];
  return null;
};
