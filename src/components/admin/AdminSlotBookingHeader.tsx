import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Settings, RefreshCw, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Branch, SlotBooking } from '@/services/slotBookingService';

interface AdminSlotBookingHeaderProps {
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  branches: Branch[];
  allBookings: SlotBooking[];
  onSettingsClick: () => void;
  onPendingApprovalsClick: () => void;
  onRefreshData: () => void;
  autoRefreshActive: boolean;
}

const AdminSlotBookingHeader: React.FC<AdminSlotBookingHeaderProps> = ({
  selectedBranch,
  onBranchChange,
  branches,
  allBookings,
  onSettingsClick,
  onPendingApprovalsClick,
  onRefreshData,
  autoRefreshActive
}) => {
  const pendingCount = allBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Slot Management</h1>
        {autoRefreshActive && (
          <p className="text-sm text-muted-foreground">Auto-refreshing every 30 seconds</p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onPendingApprovalsClick}
          className="relative"
        >
          <Users className="w-4 h-4 mr-2" />
          Pending
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2 px-2 py-1 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={onRefreshData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={onSettingsClick}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminSlotBookingHeader;