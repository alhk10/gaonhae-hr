import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/social/exportHelpers';

interface Props {
  text: string;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost' | 'secondary';
  className?: string;
}

const CopyButton = ({ text, label = 'Copy', size = 'sm', variant = 'outline', className }: Props) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onCopy}
      disabled={!text}
      className={className}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {label}
    </Button>
  );
};

export default CopyButton;
