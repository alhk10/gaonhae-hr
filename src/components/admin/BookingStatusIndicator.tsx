import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

interface BookingStatusIndicatorProps {
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const BookingStatusIndicator: React.FC<BookingStatusIndicatorProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
          icon: <Check className="w-3 h-3" />,
          label: 'Approved'
        };
      case 'pending':
        return {
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending'
        };
      case 'rejected':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
          icon: <X className="w-3 h-3" />,
          label: 'Rejected'
        };
      case 'cancelled':
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Cancelled'
        };
      default:
        return {
          variant: 'outline' as const,
          className: '',
          icon: <AlertCircle className="w-3 h-3" />,
          label: status
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1`}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

export default BookingStatusIndicator;