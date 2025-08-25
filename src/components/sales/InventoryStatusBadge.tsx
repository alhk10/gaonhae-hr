import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface InventoryStatusBadgeProps {
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  quantity?: number;
  reorderNeeded?: boolean;
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({
  status,
  quantity = 0,
  reorderNeeded = false
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'in_stock':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: `In Stock (${quantity})`,
          className: 'bg-green-100 text-green-800'
        };
      case 'low_stock':
        return {
          variant: 'secondary' as const,
          icon: AlertTriangle,
          text: `Low Stock (${quantity})`,
          className: 'bg-yellow-100 text-yellow-800'
        };
      case 'out_of_stock':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: 'Out of Stock',
          className: 'bg-red-100 text-red-800'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: XCircle,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
      {reorderNeeded && (
        <Badge variant="outline" className="bg-orange-100 text-orange-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reorder
        </Badge>
      )}
    </div>
  );
};