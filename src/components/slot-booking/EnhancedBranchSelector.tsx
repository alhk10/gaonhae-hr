
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Clock } from 'lucide-react';
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
    return color || '#3b82f6';
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
        {/* Branch Selector */}
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
                      <div className="text-xs text-gray-500 truncate">{branch.address}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {branch.total_slots} slots
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Branch Info */}
        {currentBranch && (
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: `${getBranchColorStyle(currentBranch.color)}10`,
              borderColor: `${getBranchColorStyle(currentBranch.color)}30`
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" 
                style={{ backgroundColor: getBranchColorStyle(currentBranch.color) }}
              ></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{currentBranch.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{currentBranch.address}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {currentBranch.total_slots} total slots
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Daily availability varies
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedBranchSelector;
