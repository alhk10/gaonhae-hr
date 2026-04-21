import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building,
  Clock,
  GraduationCap,
  Package,
  Settings as SettingsIcon,
  Users,
  Warehouse,
  Video,
} from 'lucide-react';
import type { Branch } from '@/services/settingsService';
import { GeneralTab } from './branch-setup/GeneralTab';
import { OperatingHoursTab } from './branch-setup/OperatingHoursTab';
import { ClassTimetableTab } from './branch-setup/ClassTimetableTab';
import { ProductsPricingTab } from './branch-setup/ProductsPricingTab';
import { InventoryTab } from './branch-setup/InventoryTab';
import { EmployeeAccessTab } from './branch-setup/EmployeeAccessTab';
import { CctvCamerasTab } from './branch-setup/CctvCamerasTab';

interface BranchSetupDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const BranchSetupDialog: React.FC<BranchSetupDialogProps> = ({
  branch,
  open,
  onOpenChange,
  onSaved,
}) => {
  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[95vw] max-h-[95vh] overflow-y-auto p-3 sm:p-6 top-[3%] translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Branch Setup — {branch.name}
          </DialogTitle>
          <DialogDescription>
            Manage all configuration for this branch in one place.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Building className="w-4 h-4" /> General
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Operating Hours
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Class Timetable
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5">
              <Package className="w-4 h-4" /> Products & Pricing
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1.5">
              <Warehouse className="w-4 h-4" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Employee Access
            </TabsTrigger>
            <TabsTrigger value="cctv" className="flex items-center gap-1.5">
              <Video className="w-4 h-4" /> CCTV Cameras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab branch={branch} onSaved={() => onSaved?.()} />
          </TabsContent>
          <TabsContent value="hours">
            <OperatingHoursTab branchId={branch.id} />
          </TabsContent>
          <TabsContent value="timetable">
            <ClassTimetableTab branchId={branch.id} branchName={branch.name} />
          </TabsContent>
          <TabsContent value="products">
            <ProductsPricingTab
              branchId={branch.id}
              branchName={branch.name}
              branchCurrency={branch.currency || 'SGD'}
            />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryTab branchId={branch.id} branchName={branch.name} />
          </TabsContent>
          <TabsContent value="access">
            <EmployeeAccessTab branchId={branch.id} />
          </TabsContent>
          <TabsContent value="cctv">
            <CctvCamerasTab branchId={branch.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BranchSetupDialog;
