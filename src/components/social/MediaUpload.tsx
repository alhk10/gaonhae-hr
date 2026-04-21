import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadSocialMedia } from '@/services/socialMediaService';
import { toast } from '@/hooks/use-toast';

interface Props {
  branchId: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  onChange: (next: { url: string | null; type: 'image' | 'video' | null }) => void;
  disabled?: boolean;
}

export const MediaUpload: React.FC<Props> = ({ branchId, mediaUrl, mediaType, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!branchId) {
      toast({ title: 'Select a branch first', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large (max 50MB)', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadSocialMedia(file, branchId);
      onChange({ url: res.url, type: res.mediaType });
      toast({ title: 'Media uploaded' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleSelect}
        disabled={disabled || uploading}
      />
      {mediaUrl ? (
        <div className="relative">
          {mediaType === 'video' ? (
            <video src={mediaUrl} controls className="w-full max-h-64 rounded-md border" />
          ) : (
            <img src={mediaUrl} alt="upload" className="w-full max-h-64 object-contain rounded-md border bg-muted" />
          )}
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={() => onChange({ url: null, type: null })}
            disabled={disabled}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? 'Uploading…' : 'Upload image or video'}
        </Button>
      )}
    </div>
  );
};
