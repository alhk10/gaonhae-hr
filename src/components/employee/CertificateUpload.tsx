
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { CertificateUpload } from '@/types/employee';

interface CertificateUploadProps {
  certificates: CertificateUpload[];
  onCertificateUpload: (certificate: CertificateUpload) => void;
  onCertificateRemove: (certificateId: string) => void;
}

const CertificateUploadComponent: React.FC<CertificateUploadProps> = ({
  certificates,
  onCertificateUpload,
  onCertificateRemove
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast("File size must be less than 10MB");
      return;
    }
    
    const allowedTypes = ['image/', 'application/pdf', '.doc', '.docx'];
    if (!allowedTypes.some(type => file.type.includes(type) || file.name.includes(type.replace('.', '')))) {
      toast("Please upload an image, PDF, or Word document");
      return;
    }

    const newCertificate: CertificateUpload = {
      id: Date.now().toString(),
      name: file.name.split('.')[0],
      fileName: file.name,
      uploadDate: new Date().toISOString().split('T')[0],
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream'
    };

    onCertificateUpload(newCertificate);
    toast("Certificate uploaded successfully");
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Certificates & Documents</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
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
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Upload Certificate or Document
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Drag and drop your file here, or click to browse
          </p>
          <Label htmlFor="certificate-upload">
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
            <Input
              id="certificate-upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </Label>
          <p className="text-xs text-gray-400 mt-2">
            Supported: Images, PDF, Word documents (Max 10MB)
          </p>
        </div>

        {/* Certificate List */}
        {certificates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Uploaded Certificates</h4>
            {certificates.map((certificate) => (
              <div key={certificate.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-900">{certificate.name}</p>
                    <p className="text-xs text-gray-500">
                      {certificate.fileName} • {formatFileSize(certificate.fileSize)} • {certificate.uploadDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast("Download functionality would be implemented here")}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCertificateRemove(certificate.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CertificateUploadComponent;
