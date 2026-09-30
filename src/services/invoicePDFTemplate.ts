import { supabase } from '@/integrations/supabase/client';
import type { InvoiceTemplate } from '@/utils/invoicePDFGenerator';

export const invoiceCountryCode = (country: string | null | undefined): 'SG' | 'AU' => {
  if (country === 'Australia' || country === 'AU') return 'AU';
  if (country === 'Singapore' || country === 'SG') return 'SG';
  throw new Error('Invoice branch country is missing or unsupported');
};

export async function getInvoicePDFTemplate(country: string | null | undefined): Promise<InvoiceTemplate> {
  const code = invoiceCountryCode(country);
  const { data, error } = await supabase
    .from('invoice_templates')
    .select('letterhead_url, logo_url, paynow_qr_url, country, default_notes, footer_text, bank_transfer_info')
    .eq('country', code)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load ${code} invoice template: ${error.message}`);
  if (!data) throw new Error(`No active ${code} invoice template is set up`);
  return data;
}