import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
}

const DocumentUploadZone: React.FC<Props> = ({ onFiles, accept = 'image/*,application/pdf', disabled }) => {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const files = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        hover ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · max 20 MB each</p>
    </div>
  );
};

export default DocumentUploadZone;
