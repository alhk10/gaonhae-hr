import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Video } from 'lucide-react';
import HlsPlayer from './HlsPlayer';
import type { CctvCamera } from '@/services/cctvService';

interface CameraCardProps {
  branchName: string;
  cameras: CctvCamera[];
}

export const CameraCard: React.FC<CameraCardProps> = ({ branchName, cameras }) => {
  const sorted = useMemo(
    () => [...cameras].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
    [cameras],
  );
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? '');
  const selected = sorted.find((c) => c.id === selectedId) ?? sorted[0];

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{branchName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No cameras configured for this branch.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{branchName}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{selected.name}</p>
          </div>
          {sorted.length > 1 && (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((cam) => (
                  <SelectItem key={cam.id} value={cam.id} className="text-xs">
                    {cam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sorted.length === 1 && (
            <Badge variant="secondary" className="text-[10px]">
              1 camera
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <HlsPlayer cameraId={selected.id} />
      </CardContent>
    </Card>
  );
};

export default CameraCard;
