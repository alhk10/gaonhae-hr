import React from 'react';
import { useFinanceBasis } from '@/contexts/FinanceBasisContext';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Props {
  className?: string;
  showLabel?: boolean;
}

const FinanceBasisToggle: React.FC<Props> = ({ className, showLabel = true }) => {
  const { basis, setBasis } = useFinanceBasis();
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {showLabel && <Label className="text-xs text-muted-foreground">Basis</Label>}
      <ToggleGroup
        type="single"
        value={basis}
        onValueChange={(v) => v && setBasis(v as 'accrual' | 'cash')}
        size="sm"
      >
        <ToggleGroupItem value="accrual" className="h-7 px-3 text-xs">Accrual</ToggleGroupItem>
        <ToggleGroupItem value="cash" className="h-7 px-3 text-xs">Cash</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default FinanceBasisToggle;
