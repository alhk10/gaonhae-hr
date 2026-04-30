import { Instagram, Facebook, Music2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Platform } from '@/lib/social/platforms';
import { PLATFORM_LABELS } from '@/lib/social/platforms';

const ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
};

const COLORS: Record<Platform, string> = {
  instagram: 'bg-pink-100 text-pink-800 hover:bg-pink-100',
  facebook: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  tiktok: 'bg-zinc-900 text-white hover:bg-zinc-900',
};

interface Props {
  platform: Platform;
  className?: string;
}

const PlatformBadge = ({ platform, className = '' }: Props) => {
  const Icon = ICONS[platform];
  return (
    <Badge variant="secondary" className={`gap-1 ${COLORS[platform]} ${className}`}>
      <Icon className="h-3 w-3" />
      {PLATFORM_LABELS[platform]}
    </Badge>
  );
};

export default PlatformBadge;
