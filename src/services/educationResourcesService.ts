/**
 * Education Resources Service
 * Handles CRUD operations for education and reference materials
 */

import { supabase } from '@/integrations/supabase/client';

export interface EducationResource {
  id: string;
  title: string;
  description: string | null;
  links: { url: string; label: string }[];
  file_urls: { url: string; name: string }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateEducationResourceInput {
  title: string;
  description?: string;
  links?: { url: string; label: string }[];
  file_urls?: { url: string; name: string }[];
}

export interface UpdateEducationResourceInput {
  title?: string;
  description?: string;
  links?: { url: string; label: string }[];
  file_urls?: { url: string; name: string }[];
  is_active?: boolean;
}

export const getEducationResources = async (activeOnly = false): Promise<EducationResource[]> => {
  let query = supabase
    .from('education_resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching education resources:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    links: Array.isArray(item.links) ? item.links : [],
    file_urls: Array.isArray(item.file_urls) ? item.file_urls : []
  })) as EducationResource[];
};

export const createEducationResource = async (
  input: CreateEducationResourceInput,
  createdBy?: string
): Promise<EducationResource> => {
  const { data, error } = await supabase
    .from('education_resources')
    .insert({
      title: input.title,
      description: input.description || null,
      links: input.links || [],
      file_urls: input.file_urls || [],
      created_by: createdBy || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating education resource:', error);
    throw error;
  }

  return {
    ...data,
    links: Array.isArray(data.links) ? data.links : [],
    file_urls: Array.isArray(data.file_urls) ? data.file_urls : []
  } as EducationResource;
};

export const updateEducationResource = async (
  id: string,
  input: UpdateEducationResourceInput
): Promise<EducationResource> => {
  const { data, error } = await supabase
    .from('education_resources')
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.links !== undefined && { links: input.links }),
      ...(input.file_urls !== undefined && { file_urls: input.file_urls }),
      ...(input.is_active !== undefined && { is_active: input.is_active })
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating education resource:', error);
    throw error;
  }

  return {
    ...data,
    links: Array.isArray(data.links) ? data.links : [],
    file_urls: Array.isArray(data.file_urls) ? data.file_urls : []
  } as EducationResource;
};

export const deleteEducationResource = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('education_resources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting education resource:', error);
    throw error;
  }
};

export const uploadEducationFile = async (file: File): Promise<{ url: string; name: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `resources/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('education-files')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('education-files')
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    name: file.name
  };
};

export const deleteEducationFile = async (fileUrl: string): Promise<void> => {
  const path = fileUrl.split('/education-files/')[1];
  if (path) {
    const { error } = await supabase.storage
      .from('education-files')
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
    }
  }
};
