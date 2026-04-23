/**
 * ProofOfPaymentUpload
 * Reusable upload surface supporting click-to-browse, drag-and-drop,
 * clipboard paste (Ctrl/Cmd+V), and direct camera capture.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProofOfPaymentUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  acceptPdf?: boolean;
  maxSizeMB?: number;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const ProofOfPaymentUpload: React.FC<ProofOfPaymentUploadProps> = ({
  value,
  onChange,
  required = false,
  acceptPdf = false,
  maxSizeMB = 5,
  label = 'Proof of Payment',
  compact = false,
  disabled = false,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const accept = acceptPdf ? 'image/*,application/pdf' : 'image/*';

  // Manage object URL for preview
  useEffect(() => {
    if (value && value.type.startsWith('image/')) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [value]);

  const validateAndSet = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !(acceptPdf && isPdf)) {
        toast.error(
          acceptPdf
            ? 'Only image or PDF files are accepted for payment proof'
            : 'Only image files are accepted for payment proof'
        );
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`File must be smaller than ${maxSizeMB}MB`);
        return;
      }
      onChange(file);
    },
    [acceptPdf, maxSizeMB, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files?.[0]);
    if (e.target) e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    const file = e.clipboardData.files?.[0];
    if (file) {
      e.preventDefault();
      validateAndSet(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const clear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(null);
  };

  const openCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className={cn(compact ? 'text-xs' : 'text-sm')}>
          {label} {required && '*'}
        </Label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div
          className={cn(
            'flex items-center gap-3 rounded-md border bg-muted/50',
            compact ? 'p-2' : 'p-3'
          )}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={value.name}
              className={cn(
                'rounded object-cover border',
                compact ? 'h-10 w-10' : 'h-14 w-14'
              )}
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded bg-background border',
                compact ? 'h-10 w-10' : 'h-14 w-14'
              )}
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}>
              {value.name}
            </p>
            <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
              {formatBytes(value.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={compact ? 'h-6 w-6' : 'h-8 w-8'}
            onClick={clear}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </Button>
        </div>
      ) : (
        <div
          ref={dropzoneRef}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload proof of payment. Click, drag a file, or paste from clipboard."
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          className={cn(
            'relative cursor-pointer rounded-md border-2 border-dashed text-center transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            compact ? 'p-3' : 'p-4 sm:p-6',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-input hover:border-primary/50 hover:bg-muted/30',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <div className={cn('flex flex-col items-center gap-1', compact ? 'gap-1' : 'gap-2')}>
            <div className="flex items-center gap-2">
              <Upload
                className={cn(
                  'text-muted-foreground',
                  compact ? 'h-5 w-5' : 'h-7 w-7'
                )}
              />
            </div>
            <p className={cn(compact ? 'text-xs' : 'text-sm', 'font-medium')}>
              {isDragging ? 'Drop image here' : 'Click, drag, or paste an image'}
            </p>
            <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
              {acceptPdf ? 'Images or PDF' : 'Images only'} · Max {maxSizeMB}MB · Tip: paste with Ctrl/Cmd+V
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('mt-1', compact ? 'h-7 text-xs' : 'h-8 text-xs')}
              onClick={openCamera}
              disabled={disabled}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Take Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProofOfPaymentUpload;
