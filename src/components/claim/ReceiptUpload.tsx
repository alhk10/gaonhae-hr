
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface ReceiptUploadProps {
  onFileUpload: (file: File | null) => void;
  uploadedFile: File | null;
  isRequired?: boolean;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onFileUpload,
  uploadedFile,
  isRequired = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes('image') && !file.type.includes('pdf')) {
        toast("Please upload an image or PDF file");
        return;
      }
      onFileUpload(file);
      toast("Receipt uploaded successfully");
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes('image') && !file.type.includes('pdf')) {
        toast("Please upload an image or PDF file");
        return;
      }
      onFileUpload(file);
      toast("Receipt uploaded successfully");
    }
  };

  const handleRemoveFile = () => {
    onFileUpload(null);
    toast("Receipt removed");
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-700">
        Receipt Upload {isRequired && <span className="text-red-500">*</span>}
      </Label>
      {uploadedFile ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{uploadedFile.name}</p>
              <p className="text-sm text-green-600">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveFile}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
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
            />
          </Label>
          <p className="text-xs text-gray-400 mt-2">
            JPG, PNG, PDF (Max 5MB)
          </p>
        </div>
      )}
    </div>
  );
};

export default ReceiptUpload;
