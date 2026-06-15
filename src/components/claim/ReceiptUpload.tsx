
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { uploadReceipt } from '@/services/receiptUploadService';

interface ReceiptUploadProps {
  onFileUpload: (url: string | null) => void;
  uploadedFileUrl: string | null;
  employeeId: string;
  isRequired?: boolean;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onFileUpload,
  uploadedFileUrl,
  employeeId,
  isRequired = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('ReceiptUpload: Component rendered with props:', {
    employeeId,
    isRequired,
    uploadedFileUrl,
    hasOnFileUpload: !!onFileUpload
  });

  // Enhanced file validation
  const validateFile = (file: File): string | null => {
    console.log('ReceiptUpload: Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      return 'File size must be less than 15MB';
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
    ];
    // Some phones report empty/odd MIME types — fall back to extension check
    const lowerName = (file.name || '').toLowerCase();
    const allowedExt = /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(lowerName);
    if (!allowedTypes.includes(file.type) && !allowedExt) {
      return 'Only JPG, PNG, HEIC, WEBP and PDF files are allowed';
    }

    if (!file.name || file.name.length > 255) {
      return 'Invalid file name';
    }

    return null;
  };

  // Check browser compatibility
  const checkBrowserSupport = (): boolean => {
    const hasFileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);
    const hasFetch = !!window.fetch;
    
    console.log('ReceiptUpload: Browser support check:', {
      hasFileAPI,
      hasFetch,
      userAgent: navigator.userAgent
    });

    return hasFileAPI && hasFetch;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('ReceiptUpload: File selection triggered');
    const file = event.target.files?.[0];
    if (file) {
      console.log('ReceiptUpload: File selected from input:', file.name);
      await handleFileUpload(file);
    } else {
      console.log('ReceiptUpload: No file selected from input');
    }
  };

  const handleChooseFileClick = () => {
    console.log('ReceiptUpload: Choose file button clicked');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('ReceiptUpload: File input ref is null');
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('ReceiptUpload: Starting file upload process');
    setError(null);

    // Check browser support
    if (!checkBrowserSupport()) {
      const errorMsg = 'Your browser does not support file uploads. Please use a modern browser.';
      console.error('ReceiptUpload: Browser not supported');
      setError(errorMsg);
      toast.error("Upload not supported", { description: errorMsg });
      return;
    }

    // Validate employee ID
    if (!employeeId || employeeId.trim() === '') {
      const errorMsg = 'Employee ID is missing. Please refresh the page and try again.';
      console.error('ReceiptUpload: Missing employee ID:', { employeeId });
      setError(errorMsg);
      toast.error("Cannot upload receipt", { description: errorMsg });
      return;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      console.error('ReceiptUpload: File validation failed:', validationError);
      setError(validationError);
      toast.error("Invalid file", { description: validationError });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('ReceiptUpload: Calling uploadReceipt service');
      
      // Real progress tracking with intervals
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 15, 90);
          console.log('ReceiptUpload: Progress update:', newProgress);
          return newProgress;
        });
      }, 300);

      const result = await uploadReceipt(file, employeeId);
      
      clearInterval(progressInterval);
      console.log('ReceiptUpload: Upload service result:', result);

      if (result.success && result.url) {
        setUploadProgress(100);
        console.log('ReceiptUpload: Upload successful, URL:', result.url);
        onFileUpload(result.url);
        toast.success("Receipt uploaded successfully!");
        setRetryCount(0);
      } else {
        const errorMsg = result.error || "Upload failed. Please try again.";
        console.error('ReceiptUpload: Upload failed:', errorMsg);
        setError(errorMsg);
        toast.error("Receipt upload failed", { description: errorMsg });
        onFileUpload(null);
      }
    } catch (error) {
      console.error('ReceiptUpload: Upload error caught:', error);
      const errorMsg = error instanceof Error ? error.message : "Upload failed. Please try again.";
      setError(errorMsg);
      toast.error("Receipt upload failed", { description: errorMsg });
      onFileUpload(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    console.log('ReceiptUpload: Drop event triggered');
    event.preventDefault();
    setIsDragOver(false);
    
    try {
      const file = event.dataTransfer.files[0];
      if (file) {
        console.log('ReceiptUpload: File dropped:', file.name);
        await handleFileUpload(file);
      } else {
        console.log('ReceiptUpload: No file in drop event');
      }
    } catch (error) {
      console.error('ReceiptUpload: Drop handling error:', error);
      setError('Failed to process dropped file');
    }
  };

  const handleRetry = async () => {
    console.log('ReceiptUpload: Retry triggered, count:', retryCount);
    setRetryCount(prev => prev + 1);
    setError(null);
    
    // If we have a file input, try to get the last selected file
    if (fileInputRef.current?.files?.[0]) {
      await handleFileUpload(fileInputRef.current.files[0]);
    } else {
      toast("Please select a file to upload");
    }
  };

  const handleRemoveFile = () => {
    console.log('ReceiptUpload: Removing uploaded file');
    onFileUpload(null);
    setError(null);
    toast("Receipt removed");
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileName = (url: string) => {
    try {
      const fileName = url.split('/').pop() || 'Receipt';
      console.log('ReceiptUpload: Extracted filename:', fileName);
      return fileName;
    } catch (error) {
      console.error('ReceiptUpload: Error extracting filename:', error);
      return 'Receipt';
    }
  };

  // Show error state if employee ID is missing
  if (!employeeId) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700">
          Receipt Upload {isRequired && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex items-center justify-center p-6 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 font-medium">Unable to load upload component</p>
            <p className="text-xs text-red-500 mt-1">Employee information is not available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-700">
        Receipt Upload {isRequired && <span className="text-red-500">*</span>}
      </Label>
      
      {uploadedFileUrl ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{getFileName(uploadedFileUrl)}</p>
              <p className="text-sm text-green-600">Upload complete</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('ReceiptUpload: Opening file in new tab:', uploadedFileUrl);
                window.open(uploadedFileUrl, '_blank');
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-red-600 hover:text-red-700"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : error
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
                <p className="text-sm font-medium text-gray-700">
                  Uploading receipt... {Math.round(uploadProgress)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-medium text-red-700 mb-2">{error}</p>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Retry Upload
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleChooseFileClick}
                    className="cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose New File
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Upload Receipt {isRequired && <span className="text-red-500">*</span>}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleChooseFileClick}
                  className="cursor-pointer"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  JPG, PNG, HEIC, WEBP, PDF (Max 15MB) • Drag & drop supported
                </p>
              </>
            )}
          </div>
          {retryCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Retry attempt: {retryCount}
            </p>
          )}
        </div>
      )}
      
      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default ReceiptUpload;
