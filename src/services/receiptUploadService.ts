
import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadReceipt = async (file: File, employeeId: string): Promise<UploadResult> => {
  try {
    console.log('Starting receipt upload for employee:', employeeId);
    
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Only JPG, PNG, and PDF files are allowed' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${employeeId}_${timestamp}.${fileExtension}`;
    const filePath = `receipts/${fileName}`;

    console.log('Uploading file to path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('claim-receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: `Upload failed: ${error.message}` };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('claim-receipts')
      .getPublicUrl(filePath);

    console.log('Upload successful, public URL:', publicUrl);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Receipt upload error:', error);
    return { success: false, error: 'Upload failed. Please try again.' };
  }
};

export const deleteReceipt = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('claim-receipts')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Receipt delete error:', error);
    return false;
  }
};
