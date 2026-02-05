import { supabase } from '@/integrations/supabase/client';

export interface LetterTemplate {
  id: string;
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  body_text_2: string;
  closing_text: string;
  signatory_name: string;
  signatory_position: string;
  signature_image_url: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLetterTemplateData {
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  body_text_2?: string;
  closing_text?: string;
  signatory_name?: string;
  signatory_position?: string;
  signature_image_url?: string;
  sort_order?: number;
}

export interface UpdateLetterTemplateData {
  name?: string;
  title?: string;
  body_text?: string;
  body_text_2?: string;
  closing_text?: string;
  signatory_name?: string;
  signatory_position?: string;
  signature_image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

export const letterTemplateService = {
  async getTemplates(type?: 'student' | 'employee'): Promise<LetterTemplate[]> {
    let query = supabase
      .from('letter_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as LetterTemplate[];
  },

  async getTemplateById(id: string): Promise<LetterTemplate | null> {
    const { data, error } = await supabase
      .from('letter_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as LetterTemplate;
  },

  async createTemplate(templateData: CreateLetterTemplateData): Promise<LetterTemplate> {
    const { data, error } = await supabase
      .from('letter_templates')
      .insert({
        ...templateData,
        is_default: false,
        is_active: true,
        body_text_2: templateData.body_text_2 || '',
        closing_text: templateData.closing_text || '',
        signatory_name: templateData.signatory_name || 'Gaonhae Taekwondo LLP',
        signatory_position: templateData.signatory_position || '',
        signature_image_url: templateData.signature_image_url || '',
      })
      .select()
      .single();

    if (error) throw error;
    return data as LetterTemplate;
  },

  async updateTemplate(id: string, templateData: UpdateLetterTemplateData): Promise<LetterTemplate> {
    const { data, error } = await supabase
      .from('letter_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as LetterTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('letter_templates')
      .delete()
      .eq('id', id)
      .eq('is_default', false);

    if (error) throw error;
  },

  async duplicateTemplate(id: string, newName: string): Promise<LetterTemplate> {
    const original = await this.getTemplateById(id);
    if (!original) throw new Error('Template not found');

    return this.createTemplate({
      name: newName,
      type: original.type,
      title: original.title,
      body_text: original.body_text,
      body_text_2: original.body_text_2,
      closing_text: original.closing_text,
      signatory_name: original.signatory_name,
      signatory_position: original.signatory_position,
      signature_image_url: original.signature_image_url,
      sort_order: original.sort_order + 1,
    });
  },

  async uploadSignatureImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `signature_${Date.now()}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('education-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('education-files')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },
};
