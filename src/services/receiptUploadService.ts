
import { supabase } from '@/integrations/supabase/client';

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
    console.log('ReceiptUploadService: Testing Supabase connection...');
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    
    if (error) {
      console.error('ReceiptUploadService: Connection test failed:', error);
      return false;
    }
    
    console.log('ReceiptUploadService: Connection test successful');
    return true;
  } catch (error) {
    console.error('ReceiptUploadService: Connection test error:', error);
    return false;
  }
};

// Test storage bucket access
const testStorageBucket = async (): Promise<boolean> => {
  try {
    console.log('ReceiptUploadService: Testing storage bucket access...');
    const { data, error } = await supabase.storage.from('claim-receipts').list('', { limit: 1 });
    
    if (error) {
      console.error('ReceiptUploadService: Storage bucket test failed:', error);
      return false;
    }
    
    console.log('ReceiptUploadService: Storage bucket test successful');
    return true;
  } catch (error) {
    console.error('ReceiptUploadService: Storage bucket test error:', error);
    return false;
  }
};

// Validate file before upload
const validateFileForUpload = (file: File, employeeId: string): string | null => {
  console.log('ReceiptUploadService: Validating file for upload:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    employeeId: employeeId
  });

  // Check file size
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return 'File size must be less than 5MB';
  }

  if (file.size === 0) {
    return 'File appears to be empty';
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
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
  console.log('ReceiptUploadService: Generated secure filename:', filename);
  
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
    console.log(`ReceiptUploadService: Upload attempt ${attempt}/${maxRetries} for path:`, filePath);
    
    try {
      const { data, error } = await supabase.storage
        .from('claim-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (!error) {
        console.log('ReceiptUploadService: Upload successful on attempt', attempt);
        return { data, error: null };
      }

      lastError = error;
      console.log(`ReceiptUploadService: Upload attempt ${attempt} failed:`, error);

      // If it's a duplicate file error, try with a new filename
      if (error.message?.includes('already exists') && attempt < maxRetries) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const parts = filePath.split('.');
        const extension = parts.pop();
        const baseWithoutExt = parts.join('.');
        filePath = `${baseWithoutExt}_${timestamp}_${randomString}.${extension}`;
        console.log('ReceiptUploadService: Retrying with new filename:', filePath);
        continue;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`ReceiptUploadService: Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

    } catch (networkError) {
      console.error(`ReceiptUploadService: Network error on attempt ${attempt}:`, networkError);
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
  console.log('ReceiptUploadService: Starting receipt upload process');
  console.log('ReceiptUploadService: Upload parameters:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    employeeId: employeeId,
    supabaseUrl: supabase.supabaseUrl,
    timestamp: new Date().toISOString()
  });

  try {
    // Step 1: Validate input parameters
    const validationError = validateFileForUpload(file, employeeId);
    if (validationError) {
      console.error('ReceiptUploadService: Validation failed:', validationError);
      return { success: false, error: validationError };
    }

    // Step 2: Test connections
    console.log('ReceiptUploadService: Testing connections...');
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
      return { success: false, error: 'Cannot connect to database. Please check your internet connection.' };
    }

    const storageOk = await testStorageBucket();
    if (!storageOk) {
      return { success: false, error: 'Cannot access file storage. Please try again later.' };
    }

    // Step 3: Generate secure file path
    const fileName = generateSecureFilename(file, employeeId);
    const filePath = `receipts/${fileName}`;
    
    console.log('ReceiptUploadService: Upload details:', {
      originalName: file.name,
      secureFileName: fileName,
      fullPath: filePath,
      bucketName: 'claim-receipts'
    });

    // Step 4: Upload file with retry logic
    console.log('ReceiptUploadService: Starting file upload...');
    const { data, error } = await uploadWithRetry(file, filePath);

    if (error) {
      console.error('ReceiptUploadService: Upload failed after retries:', error);
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

    console.log('ReceiptUploadService: File uploaded successfully:', data);

    // Step 5: Generate public URL
    console.log('ReceiptUploadService: Generating public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('claim-receipts')
      .getPublicUrl(filePath);

    if (!publicUrl) {
      console.error('ReceiptUploadService: Failed to generate public URL');
      return { success: false, error: 'Upload completed but failed to generate file URL. Please try again.' };
    }

    console.log('ReceiptUploadService: Public URL generated successfully:', publicUrl);

    // Step 6: Verify the uploaded file can be accessed
    console.log('ReceiptUploadService: Verifying file accessibility...');
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn('ReceiptUploadService: File verification failed, but upload succeeded');
      } else {
        console.log('ReceiptUploadService: File verified successfully');
      }
    } catch (verifyError) {
      console.warn('ReceiptUploadService: File verification error (non-critical):', verifyError);
    }

    console.log('ReceiptUploadService: Upload process completed successfully');
    return { 
      success: true, 
      url: publicUrl,
      uploadPath: filePath
    };

  } catch (error) {
    console.error('ReceiptUploadService: Unexpected error during upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Upload failed: ${errorMessage}` };
  }
};

export const deleteReceipt = async (filePath: string): Promise<boolean> => {
  try {
    console.log('ReceiptUploadService: Deleting receipt at path:', filePath);
    
    // Extract just the path part if a full URL is provided
    let actualPath = filePath;
    if (filePath.includes('/storage/v1/object/public/claim-receipts/')) {
      actualPath = filePath.split('/storage/v1/object/public/claim-receipts/')[1];
    }
    
    console.log('ReceiptUploadService: Actual deletion path:', actualPath);

    const { error } = await supabase.storage
      .from('claim-receipts')
      .remove([actualPath]);

    if (error) {
      console.error('ReceiptUploadService: Delete error:', error);
      return false;
    }

    console.log('ReceiptUploadService: File deleted successfully');
    return true;
  } catch (error) {
    console.error('ReceiptUploadService: Delete operation error:', error);
    return false;
  }
};

// Utility function to test upload functionality
export const testUploadFunctionality = async (): Promise<{ success: boolean; message: string }> => {
  console.log('ReceiptUploadService: Running upload functionality test...');
  
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
    console.error('ReceiptUploadService: Test error:', error);
    return { success: false, message: `Test error: ${error}` };
  }
};
