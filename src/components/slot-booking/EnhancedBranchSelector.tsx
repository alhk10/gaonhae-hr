
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { Branch } from '@/services/slotBookingService';

interface EnhancedBranchSelectorProps {
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  currentBranch?: Branch;
  isLoading?: boolean;
}

const EnhancedBranchSelector: React.FC<EnhancedBranchSelectorProps> = ({
  branches,
  selectedBranch,
  onBranchChange,
  currentBranch,
  isLoading = false
}) => {
  const getBranchColorStyle = (color: string) => {
    return convertTailwindColorToHex(color || '#3b82f6');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5" />
          Select Branch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simplified Branch Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Choose your preferred branch
          </label>
          <Select value={selectedBranch} onValueChange={onBranchChange} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  <div className="flex items-center space-x-3 w-full">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getBranchColorStyle(branch.color) }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{branch.name}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Simplified Selected Branch Info */}
        {currentBranch && (
          <div 
            className="p-3 rounded-lg border"
            style={{ 
              backgroundColor: `${getBranchColorStyle(currentBranch.color)}10`,
              borderColor: `${getBranchColorStyle(currentBranch.color)}30`
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: getBranchColorStyle(currentBranch.color) }}
              ></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{currentBranch.name}</h3>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedBranchSelector;
