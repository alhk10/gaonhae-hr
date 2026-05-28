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
    description: 'Arm Guards + Shin Guards + Groin Guard + Canvas Carry Bag',
    priceInc: 174.40,
    priceEx: 160.00,
  },
  {
    key: 'adidas_set',
    label: 'Preorder - Adidas Chest Guard + Head Gear Set',
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

export interface VariantSelection {
  size?: string;
  color?: string;
  gender?: 'male' | 'female';
}

export type VariantSelectionsMap = Record<string, VariantSelection>;

/** Sentinel key used for the Gaonhae Groin Guard component which requires gender selection. */
export const GAONHAE_GROIN_KEY = 'gaonhae_groin';

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
  variant_selections: VariantSelectionsMap | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseComponentSpec {
  product_id: string;
  name: string;
  sizes: string[];
  colors: string[]; // empty array => no color choice required
  genderChoice?: boolean; // when true, staff must pick male/female
}

/** Build the list of components that need a size/color choice for a purchase. */
export const getComponentsForCart = (
  items: GuardsCartItem[] | any[],
  _gender: string | null,
): PurchaseComponentSpec[] => {
  const out: PurchaseComponentSpec[] = [];
  for (const it of items || []) {
    if (it.key === 'gaonhae_set') {
      out.push({ product_id: GAONHAE_COMPONENT_IDS.arm, name: 'Gaonhae Arm Guard', sizes: ['XS','S','M','L','XL'], colors: [] });
      out.push({ product_id: GAONHAE_COMPONENT_IDS.shin, name: 'Gaonhae Shin Guard', sizes: ['XS','S','M','L','XL'], colors: [] });
      out.push({
        product_id: GAONHAE_GROIN_KEY,
        name: 'Gaonhae Groin Guard',
        sizes: ['XS','S','M','L','XL'],
        colors: [],
        genderChoice: true,
      });
    } else if (it.key === 'adidas_set') {
      out.push({ product_id: ADIDAS_COMPONENT_IDS.chestguard, name: 'Adidas Chestguard', sizes: ['Size 1','Size 2','Size 3','Size 4','Size 5'], colors: [] });
      out.push({ product_id: ADIDAS_COMPONENT_IDS.headgear, name: 'Adidas Headgear', sizes: ['XS','S','M','L','XL'], colors: ['Red','Blue'] });
    }
  }
  return out;
};

export const isVariantSelectionComplete = (
  items: GuardsCartItem[] | any[],
  gender: string | null,
  selections: VariantSelectionsMap | null,
): boolean => {
  const specs = getComponentsForCart(items, gender);
  if (!specs.length) return false;
  const sel = selections || {};
  return specs.every((s) => {
    const v = sel[s.product_id];
    if (!v?.size) return false;
    if (s.colors.length > 0 && !v.color) return false;
    if (s.genderChoice && !v.gender) return false;
    return true;
  });
};

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s — please check your connection and try again`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });

const toUserFacingError = (stage: string, err: unknown): Error => {
  const message = err instanceof Error ? err.message : String((err as any)?.message || 'unknown error');
  if (/row-level security|permission denied|42501/i.test(message)) {
    return new Error(`${stage} is blocked by access rules. Please refresh and try again.`);
  }
  return new Error(`${stage} failed: ${message}`);
};

export const submitGuardsPurchase = async (
  input: SubmitGuardsPurchaseInput,
): Promise<{ id: string; reference_number: string | null }> => {
  if (!input.items.length) throw new Error('No items selected');
  if (!input.proof_file) throw new Error('Proof of payment required');
  if (!input.proof_file.type.startsWith('image/')) throw new Error('Proof of payment must be an image file');

  const fn = input.first_name.trim().toUpperCase();
  const ln = input.last_name.trim().toUpperCase();

  // Upload proof first
  const ext = input.proof_file.name.split('.').pop() || 'jpg';
  const ts = Date.now();
  const safeName = `${fn}_${ln}`.replace(/[^a-z0-9_]/gi, '_');
  const path = `public-guards/${input.branch_id}/${ts}_${safeName}.${ext}`;
  console.info('[/guards] uploading proof', { path, size: input.proof_file.size, type: input.proof_file.type });
  const { error: uploadError } = await withTimeout(
    supabase.storage
      .from('payment-proofs')
      .upload(path, input.proof_file, {
        upsert: false,
        contentType: input.proof_file.type,
      }),
    30000,
    'Proof upload',
  );
  if (uploadError) {
    console.error('[/guards] proof upload error', uploadError);
    throw toUserFacingError('Proof upload', uploadError);
  }

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

  console.info('[/guards] calling submit_guards_purchase RPC');
  const { data, error } = await withTimeout(
    Promise.resolve(supabase.rpc('submit_guards_purchase' as any, { _row: row as any })),
    15000,
    'Submission',
  );
  if (error) {
    console.error('[/guards] RPC error', error);
    throw toUserFacingError('Submission', error);
  }
  const inserted = Array.isArray(data) ? data[0] : data;
  if (!inserted) throw new Error('Submission failed: no record returned');
  console.info('[/guards] submitted', inserted);

  // Fire-and-forget confirmation email
  if (input.email?.trim()) {
    void supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'guards-order-received',
        recipientEmail: input.email.trim().toLowerCase(),
        idempotencyKey: `guards-received-${(inserted as any).id}`,
        templateData: {
          firstName: fn,
          referenceNumber: (inserted as any).reference_number || '',
        },
      },
    }).catch(() => { /* non-blocking */ });
  }

  return inserted as { id: string; reference_number: string | null };
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

  if (collected) {
    // Look up buyer email + name + ref to send the collection email
    const { data: row } = await supabase
      .from('guards_purchases')
      .select('email, first_name, reference_number')
      .eq('id', id)
      .maybeSingle();
    const email = (row as any)?.email as string | null;
    if (email) {
      void supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'guards-collected',
          recipientEmail: email,
          idempotencyKey: `guards-collected-${id}`,
          templateData: {
            firstName: (row as any)?.first_name || '',
            referenceNumber: (row as any)?.reference_number || '',
          },
        },
      }).catch(() => { /* non-blocking */ });
    }
  }
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
    size_variant?: string;
    metadata?: Record<string, any>;
  }>;
  /** Adjustment to apply so post-GST total matches collected price. */
  adjustment: number;
  /** Target post-GST total for this product line group. */
  targetInc: number;
}

const variantLabel = (sel?: VariantSelection): string | undefined => {
  if (!sel) return undefined;
  if (sel.color && sel.size) return `${sel.color} / ${sel.size}`;
  return sel.size || sel.color || undefined;
};

const buildLinesForKey = async (
  key: GuardsProductKey,
  qty: number,
  gender: string | null,
  selections: VariantSelectionsMap | null,
): Promise<BuildLineItemsResult> => {
  if (key === 'gaonhae_set') {
    const groinSel = selections?.[GAONHAE_GROIN_KEY];
    const chosenGender = groinSel?.gender || ((gender || '').toLowerCase() === 'female' ? 'female' : 'male');
    const groinId = chosenGender === 'female'
      ? GAONHAE_COMPONENT_IDS.groin_female
      : GAONHAE_COMPONENT_IDS.groin_male;
    const componentIds = [GAONHAE_COMPONENT_IDS.arm, GAONHAE_COMPONENT_IDS.shin, groinId];
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, base_price')
      .in('id', componentIds);
    const targetInc = 174.40 * qty;
    const items = (prods || []).map((p: any) => {
      // Groin component selection is keyed by sentinel, not by product id
      const sel = p.id === groinId ? groinSel : selections?.[p.id];
      return {
        product_id: p.id,
        description: p.name,
        quantity: qty,
        unit_price: Number(p.base_price || 0),
        size_variant: variantLabel(sel),
        metadata: sel ? { size: sel.size, color: sel.color, gender: sel.gender } : undefined,
      };
    });
    const sumEx = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
    const targetEx = 160.00 * qty;
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
  const items = (prods || []).map((p: any) => {
    const sel = selections?.[p.id];
    return {
      product_id: p.id,
      description: p.name,
      quantity: qty,
      unit_price: Number(p.base_price || 0),
      size_variant: variantLabel(sel),
      metadata: sel ? { size: sel.size, color: sel.color } : undefined,
    };
  });
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
  const selections = purchase.variant_selections || {};
  const allItems: Array<{
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    size_variant?: string;
    metadata?: Record<string, any>;
  }> = [];
  let totalAdjustment = 0;
  for (const ci of cart) {
    const res = await buildLinesForKey(ci.key, ci.qty || 1, purchase.gender, selections);
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

export const adminDeleteGuardsPurchase = async (id: string) => {
  const { error } = await supabase.rpc('admin_delete_guards_purchase' as any, { p_id: id });
  if (error) throw error;
};

export const getGuardsPurchaseDeleteContext = async (id: string) => {
  const { data, error } = await supabase.rpc('admin_guards_purchase_delete_context' as any, { p_id: id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    student_matched: !!row?.student_matched,
    student_name: (row?.student_name ?? null) as string | null,
    invoice_number: (row?.invoice_number ?? null) as string | null,
  };
};
