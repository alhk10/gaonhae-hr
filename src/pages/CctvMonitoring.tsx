import React, { useEffect, useMemo, useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Video } from 'lucide-react';
import CameraCard from '@/components/cctv/CameraCard';
import { listCameras, type CctvCamera } from '@/services/cctvService';
import { useBranches } from '@/hooks/useBranches';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const CctvMonitoring: React.FC = () => {
  const { userrole } = useAuth();
  const { branches, loading: branchesLoading } = useBranches();
  const { accessibleBranches } = useBranchAccess();
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await listCameras();
        setCameras(data);
      } catch (err) {
        console.error('Failed to load cameras:', err);
        toast({
          title: 'Failed to load cameras',
          description: (err as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter branches the user can see (superadmin sees all; others restricted by access)
  const visibleBranches = useMemo(() => {
    if (userrole === 'superadmin') return branches;
    return branches.filter((b) => accessibleBranches.includes(b.id));
  }, [branches, accessibleBranches, userrole]);

  // Group cameras by branch
  const camerasByBranch = useMemo(() => {
    const map = new Map<string, CctvCamera[]>();
    for (const cam of cameras) {
      if (!map.has(cam.branch_id)) map.set(cam.branch_id, []);
      map.get(cam.branch_id)!.push(cam);
    }
    return map;
  }, [cameras]);

  const branchesToRender = useMemo(() => {
    const filtered = branchFilter === 'all' ? visibleBranches : visibleBranches.filter((b) => b.id === branchFilter);
    return filtered.filter((b) => camerasByBranch.has(b.id));
  }, [visibleBranches, branchFilter, camerasByBranch]);

  return (
    <ResponsiveLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" />
              CCTV Monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live streams from connected branch cameras.
            </p>
          </div>
          {visibleBranches.length > 1 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {visibleBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {(loading || branchesLoading) && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !branchesLoading && branchesToRender.length === 0 && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center gap-2">
              <Video className="h-10 w-10 text-muted-foreground" />
              <h3 className="font-medium">No cameras to display</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No CCTV cameras have been configured for the branches you can access. A superadmin
                can add cameras under{' '}
                <span className="font-medium">Settings → Branches → Setup → CCTV Cameras</span>.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && branchesToRender.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branchesToRender.map((branch) => (
              <CameraCard
                key={branch.id}
                branchName={branch.name}
                cameras={camerasByBranch.get(branch.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default CctvMonitoring;
