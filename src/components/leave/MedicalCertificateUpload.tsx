
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface MedicalCertificateUploadProps {
  onFileUpload: (file: File | null) => void;
  uploadedFile: File | null;
}

const MedicalCertificateUpload: React.FC<MedicalCertificateUploadProps> = ({
  onFileUpload,
  uploadedFile
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
      toast("Medical certificate uploaded successfully");
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
      toast("Medical certificate uploaded successfully");
    }
  };

  const handleRemoveFile = () => {
    onFileUpload(null);
    toast("Medical certificate removed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Medical Certificate</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Upload Medical Certificate
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <Label htmlFor="medical-cert-upload">
              <Button variant="outline" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <Input
                id="medical-cert-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </Label>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: JPG, PNG, PDF (Max 5MB)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalCertificateUpload;
