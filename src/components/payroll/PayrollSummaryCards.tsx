import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Clock, Calendar } from 'lucide-react';
import { usePayroll } from '@/contexts/PayrollContext';

interface PayrollSummaryCardsProps {
  currentTotal: number;
  totalEmployees: number;
  nextProcessingDays: number;
}

const PayrollSummaryCards: React.FC<PayrollSummaryCardsProps> = ({ 
  currentTotal, 
  totalEmployees, 
  nextProcessingDays 
}) => {
  const payrollContext = usePayroll();
  
  // Safety check - ensure context is available
  if (!payrollContext) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index} className="bg-white shadow-md rounded-lg overflow-hidden">
            <CardContent className="p-6 text-center">
              <div className="text-gray-500">Loading...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const { payrollState } = payrollContext;

  // Calculate encashment data from payroll state
  const encashmentTotal = 0; // Placeholder - would come from actual encashment records
  const encashmentEmployeeCount = 0; // Placeholder

  const summaryData = [
    {
      title: 'Total Payroll Amount',
      value: `S$${currentTotal.toLocaleString()}`,
      description: `For ${totalEmployees} employees`,
      icon: DollarSign,
      trend: '+12% from last month',
      color: 'text-green-600'
    },
    {
      title: 'Employees in Payroll',
      value: totalEmployees.toString(),
      description: `${payrollState.fullTimeEmployees.length} Full-time, ${payrollState.casualEmployees.length} Casual`,
      icon: Users,
      trend: '+2 new employees',
      color: 'text-blue-600'
    },
    {
      title: 'Processing Status',
      value: payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1),
      description: `Next processing in ${nextProcessingDays} days`,
      icon: Clock,
      trend: 'On schedule',
      color: 'text-purple-600'
    },
    {
      title: 'Leave Encashment',
      value: `S$${encashmentTotal.toLocaleString()}`,
      description: `${encashmentEmployeeCount} employees eligible`,
      icon: Calendar,
      trend: 'Pending review',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {summaryData.map((item, index) => (
        <Card key={index} className="bg-white shadow-md rounded-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PayrollSummaryCards;
