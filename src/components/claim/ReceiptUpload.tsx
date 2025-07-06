
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!employeeId) {
      toast("Employee ID not found. Please try again.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadReceipt(file, employeeId);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.url) {
        onFileUpload(result.url);
        toast("Receipt uploaded successfully!");
      } else {
        toast(result.error || "Upload failed. Please try again.");
        onFileUpload(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast("Upload failed. Please try again.");
      onFileUpload(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleRemoveFile = () => {
    onFileUpload(null);
    toast("Receipt removed");
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'Receipt';
  };

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
              onClick={() => window.open(uploadedFileUrl, '_blank')}
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
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
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
                Uploading receipt... {uploadProgress}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-2">
                Upload Receipt {isRequired && <span className="text-red-500">*</span>}
              </p>
              <Label htmlFor="receipt-upload">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <Input
                  id="receipt-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </Label>
              <p className="text-xs text-gray-400 mt-2">
                JPG, PNG, PDF (Max 5MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptUpload;
