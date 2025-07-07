
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Calendar, DollarSign } from 'lucide-react';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    salaryRange: { min: string; max: string };
    joinDateRange: { start: string; end: string };
    showInactiveOnly: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const AdvancedEmployeeFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters
}) => {
  if (!isOpen) return null;

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Advanced Filters</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Range Filter */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Salary Range (S$)</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-salary" className="text-sm text-gray-600">Minimum</Label>
                <Input
                  id="min-salary"
                  type="number"
                  placeholder="0"
                  value={filters.salaryRange.min}
                  onChange={(e) => handleFilterChange('salaryRange', {
                    ...filters.salaryRange,
                    min: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="max-salary" className="text-sm text-gray-600">Maximum</Label>
                <Input
                  id="max-salary"
                  type="number"
                  placeholder="10000"
                  value={filters.salaryRange.max}
                  onChange={(e) => handleFilterChange('salaryRange', {
                    ...filters.salaryRange,
                    max: e.target.value
                  })}
                />
              </div>
            </div>
          </div>

          {/* Join Date Range Filter */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Join Date Range</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-sm text-gray-600">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.joinDateRange.start}
                  onChange={(e) => handleFilterChange('joinDateRange', {
                    ...filters.joinDateRange,
                    start: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm text-gray-600">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.joinDateRange.end}
                  onChange={(e) => handleFilterChange('joinDateRange', {
                    ...filters.joinDateRange,
                    end: e.target.value
                  })}
                />
              </div>
            </div>
          </div>

          {/* Boolean Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="inactive-only">Show Inactive Employees Only</Label>
              <Switch
                id="inactive-only"
                checked={filters.showInactiveOnly}
                onCheckedChange={(checked) => handleFilterChange('showInactiveOnly', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="has-email">Has Email Address</Label>
              <Switch
                id="has-email"
                checked={filters.hasEmail}
                onCheckedChange={(checked) => handleFilterChange('hasEmail', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="has-phone">Has Phone Number</Label>
              <Switch
                id="has-phone"
                checked={filters.hasPhone}
                onCheckedChange={(checked) => handleFilterChange('hasPhone', checked)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button onClick={onApplyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={onClearFilters} className="flex-1">
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedEmployeeFilters;
