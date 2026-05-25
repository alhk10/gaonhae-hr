/**
 * Service for the public /guards purchase form and /guardspurchase-list admin view.
 * No-auth public submission; superadmin-only reads via RLS.
 */
import { supabase } from '@/integrations/supabase/client';

export type GuardsProductKey = 'gaonhae_set' | 'adidas_set';

export interface GuardsCatalogItem {
  key: GuardsProductKey;
  label: string;
  description: string;
  /** Price INCLUSIVE of 9% SG GST. */
  priceInc: number;
  /** Price EXCLUSIVE of GST (pre-GST). */
  priceEx: number;
}

export const GUARDS_CATALOG: GuardsCatalogItem[] = [
  {
    key: 'gaonhae_set',
    label: 'Gaonhae Protection Guard Set',
    description: 'Arm Guards + Shin Guards + Groin Guard',
    priceInc: 150.00,
    priceEx: 137.61,
  },
  {
    key: 'adidas_set',
    label: 'Adidas Chest Guard + Head Gear Set',
    description: 'Adidas Chestguard + Adidas Headgear',
    priceInc: 284.30,
    priceEx: 260.83, // 284.30 / 1.09
  },
];

export const GST_RATE = 0.09;

/** Component product IDs used to build invoice line items when matching to a student. */
export const GAONHAE_COMPONENT_IDS = {
  arm: 'bf2a6538-ac60-43d7-9184-58b926730dc5',       // Gaonhae Arm Guard
  shin: '99a35472-5ca9-4003-abe1-fae49e4252ec',      // Gaonhae Shin Guard
  groin_male: 'c77e6aa0-93bd-415e-b1c8-b3053041508c',// Gaonhae Male Groin Guard
  groin_female: '55128dd3-df62-4370-8a3f-ced0a7cc9e9a', // Gaonhae Female Groin Guard
};

export const ADIDAS_COMPONENT_IDS = {
  chestguard: '3c293381-8020-4124-bef5-9808eaf157f3', // Adidas Chestguard
  headgear: 'a403769f-946a-48f2-b0ab-6dc945c4b853',   // Adidas Headgear
};

export interface GuardsCartItem {
  key: GuardsProductKey;
  label: string;
  qty: number;
  unit_price_inc: number;
}

export interface SubmitGuardsPurchaseInput {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO yyyy-MM-dd
  branch_id: string;
  gender: string;
  current_belt: string | null;
  email: string;
  phone: string;
  items: GuardsCartItem[];
  payment_method: 'paynow' | 'bank_transfer';
  proof_file: File;
  is_singapore: boolean;
}

export interface GuardsPurchaseRow {
  id: string;
  reference_number: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  branch_id: string | null;
  gender: string | null;
  current_belt: string | null;
  email: string | null;
  phone: string | null;
  items: any;
  subtotal: number;
  gst_amount: number;
  total: number;
  payment_method: string | null;
  proof_url: string | null;
  sale_status: string;
  collected: boolean;
  collected_at: string | null;
  collected_by: string | null;
  matched_student_id: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const submitGuardsPurchase = async (
  input: SubmitGuardsPurchaseInput,
): Promise<{ id: string; reference_number: string | null }> => {
  if (!input.items.length) throw new Error('No items selected');
  if (!input.proof_file) throw new Error('Proof of payment required');

  const fn = input.first_name.trim().toUpperCase();
  const ln = input.last_name.trim().toUpperCase();

  // Upload proof first
  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
  const path = `public-guards/${input.branch_id}/${ts}_${safeName}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, input.proof_file, {
      upsert: false,
      contentType: input.proof_file.type,
    });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  const proofUrl = signed?.signedUrl ?? path;

  // Totals
  const totalInc = input.items.reduce((s, it) => s + it.unit_price_inc * it.qty, 0);
  const gstAmount = input.is_singapore ? totalInc - totalInc / (1 + GST_RATE) : 0;
  const subtotal = totalInc - gstAmount;

  const row = {
    first_name: fn,
    last_name: ln,
    date_of_birth: input.date_of_birth,
    branch_id: input.branch_id,
    gender: (input.gender || '').toLowerCase() || null,
    current_belt: input.current_belt || null,
    email: input.email.trim().toLowerCase() || null,
    phone: input.phone.trim() || null,
    items: input.items as any,
    subtotal: Number(subtotal.toFixed(2)),
    gst_amount: Number(gstAmount.toFixed(2)),
    total: Number(totalInc.toFixed(2)),
    payment_method: input.payment_method,
    proof_url: proofUrl,
    sale_status: 'pending_verification' as const,
  };

  const { data, error } = await supabase
    .from('guards_purchases')
    .insert(row as any)
    .select('id, reference_number')
    .single();

  if (error) throw error;
  return data as { id: string; reference_number: string | null };
};

// ---------- Admin functions ----------

export const listGuardsPurchases = async (): Promise<GuardsPurchaseRow[]> => {
  const { data, error } = await supabase
    .from('guards_purchases')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as GuardsPurchaseRow[];
};

export const updateGuardsPurchase = async (
  id: string,
  patch: Partial<GuardsPurchaseRow>,
): Promise<void> => {
  const { error } = await supabase
    .from('guards_purchases')
    .update(patch as any)
    .eq('id', id);
  if (error) throw error;
};

export const setGuardsCollected = async (id: string, collected: boolean, by: string | null): Promise<void> => {
  const { error } = await supabase
    .from('guards_purchases')
    .update({
      collected,
      collected_at: collected ? new Date().toISOString() : null,
      collected_by: collected ? by : null,
    } as any)
    .eq('id', id);
  if (error) throw error;
};

export interface StudentMatchCandidate {
  id: string;
  student_number: string | null;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  branch_id: string | null;
  current_belt: string | null;
  email: string | null;
  phone: string | null;
  score: number;
}

const norm = (s?: string | null) => (s || '').trim().toUpperCase();

export const findStudentMatches = async (purchase: GuardsPurchaseRow): Promise<StudentMatchCandidate[]> => {
  const fn = norm(purchase.first_name);
  const ln = norm(purchase.last_name);
  // Fetch students by name match (broad), then score in JS.
  const { data, error } = await supabase
    .from('students')
    .select('id, student_number, first_name, last_name, date_of_birth, branch_id, current_belt, email, phone')
    .or(`first_name.ilike.%${fn}%,last_name.ilike.%${ln}%`)
    .limit(50);
  if (error) throw error;
  const dob = purchase.date_of_birth;
  const branchId = purchase.branch_id;
  const scored = (data || []).map((s: any) => {
    let score = 0;
    const sfn = norm(s.first_name);
    const sln = norm(s.last_name);
    if (sfn === fn) score += 3;
    else if (sfn.includes(fn) || fn.includes(sfn)) score += 1;
    if (sln === ln) score += 3;
    else if (sln.includes(ln) || ln.includes(sln)) score += 1;
    if (dob && s.date_of_birth === dob) score += 4;
    if (branchId && s.branch_id === branchId) score += 1;
    if (purchase.email && s.email && norm(s.email) === norm(purchase.email)) score += 2;
    if (purchase.phone && s.phone && (s.phone || '').replace(/\D/g, '').includes(purchase.phone.replace(/\D/g, ''))) score += 1;
    return { ...s, score };
  });
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

export const createStudentFromPurchase = async (purchase: GuardsPurchaseRow): Promise<string> => {
  // Generate student_number similar to existing pattern
  const stamp = Date.now().toString().slice(-7);
  const studentNumber = `ST${stamp}`;
  const { data, error } = await supabase
    .from('students')
    .insert({
      student_number: studentNumber,
      first_name: norm(purchase.first_name),
      last_name: norm(purchase.last_name),
      email: purchase.email?.toLowerCase() || null,
      phone: purchase.phone || null,
      date_of_birth: purchase.date_of_birth,
      gender: (purchase.gender || '').toLowerCase() || null,
      current_belt: purchase.current_belt || null,
      branch_id: purchase.branch_id,
      status: 'trial',
      registered_date: new Date().toISOString().split('T')[0],
    } as any)
    .select('id')
    .single();
  if (error) throw error;
  return (data as any).id as string;
};

// ---------- Invoice creation ----------

interface BuildLineItemsResult {
  items: Array<{
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  /** Adjustment to apply so post-GST total matches collected price. */
  adjustment: number;
  /** Target post-GST total for this product line group. */
  targetInc: number;
}

const buildLinesForKey = async (
  key: GuardsProductKey,
  qty: number,
  gender: string | null,
): Promise<BuildLineItemsResult> => {
  if (key === 'gaonhae_set') {
    const groinId = (gender || '').toLowerCase() === 'female'
      ? GAONHAE_COMPONENT_IDS.groin_female
      : GAONHAE_COMPONENT_IDS.groin_male;
    const componentIds = [GAONHAE_COMPONENT_IDS.arm, GAONHAE_COMPONENT_IDS.shin, groinId];
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, base_price')
      .in('id', componentIds);
    const targetInc = 150.00 * qty;
    const items = (prods || []).map((p: any) => ({
      product_id: p.id,
      description: p.name,
      quantity: qty,
      unit_price: Number(p.base_price || 0),
    }));
    // Sum of component prices (ex-GST) plus 9% GST = sum * 1.09. Target ex-GST = 137.61.
    const sumEx = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
    const targetEx = 137.61 * qty;
    const adjustment = Number((targetEx - sumEx).toFixed(2));
    return { items, adjustment, targetInc };
  }
  // adidas_set
  const componentIds = [ADIDAS_COMPONENT_IDS.chestguard, ADIDAS_COMPONENT_IDS.headgear];
  const { data: prods } = await supabase
    .from('products')
    .select('id, name, base_price')
    .in('id', componentIds);
  const targetInc = 284.30 * qty;
  const items = (prods || []).map((p: any) => ({
    product_id: p.id,
    description: p.name,
    quantity: qty,
    unit_price: Number(p.base_price || 0),
  }));
  const sumEx = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const targetEx = 260.83 * qty;
  const adjustment = Number((targetEx - sumEx).toFixed(2));
  return { items, adjustment, targetInc };
};

export const createInvoiceForPurchase = async (
  purchase: GuardsPurchaseRow,
  studentId: string,
): Promise<string> => {
  const { createInvoice } = await import('@/services/invoiceService');
  const cart = (purchase.items || []) as GuardsCartItem[];
  const allItems: Array<{
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }> = [];
  let totalAdjustment = 0;
  for (const ci of cart) {
    const res = await buildLinesForKey(ci.key, ci.qty || 1, purchase.gender);
    allItems.push(...res.items);
    totalAdjustment += res.adjustment;
  }
  // If sum of components differs from target, add an adjustment line.
  if (Math.abs(totalAdjustment) >= 0.01) {
    // Use a real product if available, otherwise a no-product description-only line is not supported by schema.
    // Try to find an "Adjustment" / "Discount" placeholder product; fall back to first cart product to satisfy NOT NULL product_id.
    const { data: adjProd } = await supabase
      .from('products')
      .select('id, name')
      .or('name.ilike.%adjustment%,name.ilike.%bundle discount%')
      .limit(1);
    const adjProductId = (adjProd && adjProd[0]?.id) || allItems[0]?.product_id;
    if (adjProductId) {
      allItems.push({
        product_id: adjProductId,
        description: totalAdjustment >= 0
          ? 'Protection Set bundle adjustment'
          : 'Protection Set bundle discount',
        quantity: 1,
        unit_price: totalAdjustment,
      });
    }
  }

  const invoice = await createInvoice({
    student_id: studentId,
    branch_id: purchase.branch_id || undefined,
    tax_included: false, // base_prices are ex-GST; GST will be added by createInvoice
    notes: `Created from guards purchase ${purchase.reference_number || purchase.id}`,
    internal_notes: `Payment via ${purchase.payment_method}. Proof: ${purchase.proof_url || 'n/a'}`,
    items: allItems,
  });

  // Mark invoice as paid (or verified) since payment is already collected.
  const status = purchase.payment_method === 'paynow' || purchase.payment_method === 'bank_transfer'
    ? 'verified'
    : 'paid';
  await supabase
    .from('invoices')
    .update({
      status,
      amount_paid: invoice.total_amount,
      balance_due: 0,
    } as any)
    .eq('id', invoice.id);

  // Persist link on purchase
  await supabase
    .from('guards_purchases')
    .update({
      matched_student_id: studentId,
      invoice_id: invoice.id,
      sale_status: 'verified',
    } as any)
    .eq('id', purchase.id);

  return invoice.id;
};
