/**
 * Clickable thumbnail that opens a dialog with the full-size signed image.
 */
import { useState } from 'react';
import { SignedImage, SignedLink } from './SignedMedia';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface Props {
  src?: string | null;
  alt?: string;
  label?: string;
  thumbClassName?: string;
}

export const SignedImagePreview = ({ src, alt, label, thumbClassName }: Props) => {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block focus:outline-none focus:ring-2 focus:ring-primary rounded"
      >
        <SignedImage
          src={src}
          alt={alt || label || 'Image'}
          className={thumbClassName || 'h-20 w-auto rounded border hover:opacity-80 transition'}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span>{label || alt || 'Preview'}</span>
              <SignedLink
                href={src}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </SignedLink>
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <SignedImage
              src={src}
              alt={alt || label || 'Image'}
              className="max-h-[80vh] w-auto rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SignedImagePreview;
