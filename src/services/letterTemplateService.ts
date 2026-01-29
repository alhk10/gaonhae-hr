import { supabase } from '@/integrations/supabase/client';

export interface LetterTemplate {
  id: string;
  name: string;
  type: 'student' | 'employee';
  title: string;
  body_text: string;
  closing_text: string;
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
  closing_text: string;
  sort_order?: number;
}

export interface UpdateLetterTemplateData {
  name?: string;
  title?: string;
  body_text?: string;
  closing_text?: string;
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
      closing_text: original.closing_text,
      sort_order: original.sort_order + 1,
    });
  },
};
