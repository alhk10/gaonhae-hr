
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MedicalCertificateUploadProps {
  onUploadComplete: (certificateUrl: string) => void;
  currentCertificateUrl?: string;
}

const MedicalCertificateUpload: React.FC<MedicalCertificateUploadProps> = ({
  onUploadComplete,
  currentCertificateUrl
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.includes('image') && !file.type.includes('pdf')) {
        toast({
          title: "Error",
          description: "Please upload an image or PDF file",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
      // For now, we'll just pass the file name as URL
      // In a real implementation, you'd upload to storage and get the URL
      const mockUrl = `uploaded/${file.name}`;
      onUploadComplete(mockUrl);
      toast({
        title: "Success",
        description: "Medical certificate uploaded successfully",
      });
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.includes('image') && !file.type.includes('pdf')) {
        toast({
          title: "Error",
          description: "Please upload an image or PDF file",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
      const mockUrl = `uploaded/${file.name}`;
      onUploadComplete(mockUrl);
      toast({
        title: "Success",
        description: "Medical certificate uploaded successfully",
      });
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    onUploadComplete('');
    toast({
      title: "Success",
      description: "Medical certificate removed",
    });
  };

  const displayFile = uploadedFile || (currentCertificateUrl ? { name: 'Previously uploaded file', size: 0 } : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Medical Certificate</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayFile ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{displayFile.name}</p>
                {displayFile.size > 0 && (
                  <p className="text-sm text-green-600">
                    {(displayFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
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
