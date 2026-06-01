import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { FILE_UPLOAD_CONSTANTS } from '@/config/constants';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  uploadPath?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Test connection to Supabase
const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    logger.debug('Testing Supabase connection');
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    
    if (error) {
      logger.error('Connection test failed', error);
      return false;
    }
    
    logger.debug('Connection test successful');
    return true;
  } catch (error) {
    logger.error('Connection test error', error);
    return false;
  }
};

// Test storage bucket access
const testStorageBucket = async (): Promise<boolean> => {
  try {
    logger.debug('Testing storage bucket access');
    const { data, error } = await supabase.storage.from('claim-receipts').list('', { limit: 1 });
    
    if (error) {
      logger.error('Storage bucket test failed', error);
      return false;
    }
    
    logger.debug('Storage bucket test successful');
    return true;
  } catch (error) {
    logger.error('Storage bucket test error', error);
    return false;
  }
};

// Validate file before upload
const validateFileForUpload = (file: File, employeeId: string): string | null => {
  logger.debug('Validating file for upload', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    employeeId: employeeId
  });

  // Check file size
  const maxSize = FILE_UPLOAD_CONSTANTS.MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return 'File size must be less than 5MB';
  }

  if (file.size === 0) {
    return 'File appears to be empty';
  }

  // Check file type
  const allowedTypes = FILE_UPLOAD_CONSTANTS.ALLOWED_DOCUMENT_TYPES as readonly string[];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, PNG, and PDF files are allowed';
  }

  // Check employee ID
  if (!employeeId || employeeId.trim() === '') {
    return 'Employee ID is required for upload';
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    return 'Invalid file name';
  }

  return null;
};

// Generate secure filename
const generateSecureFilename = (file: File, employeeId: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const sanitizedEmployeeId = employeeId.replace(/[^a-zA-Z0-9]/g, '_');
  
  const filename = `${sanitizedEmployeeId}_${timestamp}_${randomString}.${fileExtension}`;
  logger.debug('Generated secure filename', { filename });
  
  return filename;
};

// Upload with retry logic
const uploadWithRetry = async (
  file: File, 
  filePath: string, 
  maxRetries: number = 3
): Promise<{ data: any; error: any }> => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.debug(`Upload attempt ${attempt}/${maxRetries}`, { filePath });
    
    try {
      const { data, error } = await supabase.storage
        .from('claim-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (!error) {
        logger.info('Upload successful', { attempt });
        return { data, error: null };
      }

      lastError = error;
      logger.warn(`Upload attempt ${attempt} failed`, error);

      // If it's a duplicate file error, try with a new filename
      if (error.message?.includes('already exists') && attempt < maxRetries) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const parts = filePath.split('.');
        const extension = parts.pop();
        const baseWithoutExt = parts.join('.');
        filePath = `${baseWithoutExt}_${timestamp}_${randomString}.${extension}`;
        logger.debug('Retrying with new filename', { filePath });
        continue;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        logger.debug(`Waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

    } catch (networkError) {
      logger.error(`Network error on attempt ${attempt}`, networkError);
      lastError = networkError;
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  return { data: null, error: lastError };
};

export const uploadReceipt = async (file: File, employeeId: string): Promise<UploadResult> => {
  logger.info('Starting receipt upload process', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    employeeId: employeeId
  });

  try {
    // Step 1: Validate input parameters
    const validationError = validateFileForUpload(file, employeeId);
    if (validationError) {
      logger.error('Validation failed', { error: validationError });
      return { success: false, error: validationError };
    }

    // Step 2: Test connections
    logger.debug('Testing connections');
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
      return { success: false, error: 'Cannot connect to database. Please check your internet connection.' };
    }

    const storageOk = await testStorageBucket();
    if (!storageOk) {
      return { success: false, error: 'Cannot access file storage. Please try again later.' };
    }

    // Step 3: Generate secure file path scoped to auth user (required by storage RLS)
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const authUid = userRes?.user?.id;
    if (userErr || !authUid) {
      logger.error('No auth user for upload', userErr);
      return { success: false, error: 'You are not signed in. Please sign in again and retry.' };
    }

    const fileName = generateSecureFilename(file, employeeId);
    const filePath = `${authUid}/${fileName}`;

    logger.info('Upload details', {
      originalName: file.name,
      secureFileName: fileName,
      fullPath: filePath
    });

    // Step 4: Upload file with retry logic
    logger.debug('Starting file upload');
    const { data, error } = await uploadWithRetry(file, filePath);

    if (error) {
      logger.error('Upload failed after retries', error);
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.message?.includes('Policy')) {
        errorMessage = 'Permission denied. Please contact support.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'File too large. Maximum size is 5MB.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      return { success: false, error: `${errorMessage} (${error.message})` };
    }

    logger.info('File uploaded successfully', { data });

    // Step 5: Generate signed URL (claim-receipts is a private bucket)
    logger.debug('Generating signed URL');
    const { data: signed, error: signErr } = await supabase.storage
      .from('claim-receipts')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const publicUrl = signed?.signedUrl;
    if (signErr || !publicUrl) {
      logger.error('Failed to generate signed URL', signErr);
      return { success: false, error: 'Upload completed but failed to generate file URL. Please try again.' };
    }

    logger.info('Signed URL generated successfully');

    // Step 6: Verify the uploaded file can be accessed
    logger.debug('Verifying file accessibility');
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        logger.warn('File verification failed, but upload succeeded');
      } else {
        logger.debug('File verified successfully');
      }
    } catch (verifyError) {
      logger.warn('File verification error (non-critical)', verifyError);
    }

    logger.info('Upload process completed successfully');
    return { 
      success: true, 
      url: publicUrl,
      uploadPath: filePath
    };

  } catch (error) {
    logger.error('Unexpected error during upload', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Upload failed: ${errorMessage}` };
  }
};

export const deleteReceipt = async (filePath: string): Promise<boolean> => {
  try {
    logger.info('Deleting receipt', { filePath });
    
    // Extract just the path part if a full URL is provided
    let actualPath = filePath;
    if (filePath.includes('/storage/v1/object/public/claim-receipts/')) {
      actualPath = filePath.split('/storage/v1/object/public/claim-receipts/')[1];
    }
    
    logger.debug('Actual deletion path', { actualPath });

    const { error } = await supabase.storage
      .from('claim-receipts')
      .remove([actualPath]);

    if (error) {
      logger.error('Delete error', error);
      return false;
    }

    logger.info('File deleted successfully');
    return true;
  } catch (error) {
    logger.error('Delete operation error', error);
    return false;
  }
};

// Utility function to test upload functionality
export const testUploadFunctionality = async (): Promise<{ success: boolean; message: string }> => {
  logger.info('Running upload functionality test');
  
  try {
    // Test 1: Supabase connection
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest) {
      return { success: false, message: 'Database connection failed' };
    }

    // Test 2: Storage bucket access
    const storageTest = await testStorageBucket();
    if (!storageTest) {
      return { success: false, message: 'Storage bucket access failed' };
    }

    // Test 3: Create a small test file
    const testContent = 'Test file for upload functionality';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFileObj = new File([testFile], 'test.txt', { type: 'text/plain' });

    // Test 4: Try upload with test employee ID
    const testResult = await uploadReceipt(testFileObj, 'test-employee-id');
    
    if (testResult.success && testResult.url) {
      // Clean up test file
      if (testResult.uploadPath) {
        await deleteReceipt(testResult.uploadPath);
      }
      return { success: true, message: 'Upload functionality test passed' };
    } else {
      return { success: false, message: `Upload test failed: ${testResult.error}` };
    }

  } catch (error) {
    logger.error('Test error', error);
    return { success: false, message: `Test error: ${error}` };
  }
};
