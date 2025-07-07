
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, Clock, Calculator, FileText } from 'lucide-react';
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
  const { payrollState } = usePayroll();
  
  const yearlyTotal = currentTotal * 12;
  const averagePerEmployee = totalEmployees > 0 ? currentTotal / totalEmployees : 0;
  const encashmentTotal = payrollState.encashmentData.reduce((sum, enc) => sum + enc.encashment_amount, 0);

  const summaryCards = [
    {
      title: "Current Total",
      value: `S$${currentTotal.toLocaleString()}`,
      subtitle: payrollState.currentPeriod,
      icon: DollarSign,
      gradient: "from-green-50 to-green-100",
      border: "border-green-200",
      iconColor: "text-green-600",
      textColor: "text-green-900",
      subtitleColor: "text-green-500"
    },
    {
      title: "Total Employees",
      value: totalEmployees.toString(),
      subtitle: `${payrollState.fullTimeEmployees.length} FT • ${payrollState.casualEmployees.length} Casual`,
      icon: Users,
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-200",
      iconColor: "text-blue-600",
      textColor: "text-blue-900",
      subtitleColor: "text-blue-500"
    },
    {
      title: "Estimated Yearly",
      value: `S$${yearlyTotal.toLocaleString()}`,
      subtitle: "Projection",
      icon: TrendingUp,
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      iconColor: "text-purple-600",
      textColor: "text-purple-900",
      subtitleColor: "text-purple-500"
    },
    {
      title: "Next Processing",
      value: `${nextProcessingDays} days`,
      subtitle: "2nd of month",
      icon: Clock,
      gradient: "from-orange-50 to-orange-100",
      border: "border-orange-200",
      iconColor: "text-orange-600",
      textColor: "text-orange-900",
      subtitleColor: "text-orange-500"
    },
    {
      title: "Average per Employee",
      value: `S$${averagePerEmployee.toLocaleString()}`,
      subtitle: "This period",
      icon: Calculator,
      gradient: "from-indigo-50 to-indigo-100",
      border: "border-indigo-200",
      iconColor: "text-indigo-600",
      textColor: "text-indigo-900",
      subtitleColor: "text-indigo-500"
    },
    {
      title: "Leave Encashment",
      value: `S$${encashmentTotal.toLocaleString()}`,
      subtitle: `${payrollState.encashmentData.length} employee(s)`,
      icon: FileText,
      gradient: "from-teal-50 to-teal-100",
      border: "border-teal-200",
      iconColor: "text-teal-600",
      textColor: "text-teal-900",
      subtitleColor: "text-teal-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      {summaryCards.map((card, index) => (
        <Card key={index} className={`bg-gradient-to-r ${card.gradient} ${card.border}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-xs font-medium ${card.iconColor}`}>{card.title}</p>
                <p className={`text-xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
                <p className={`text-xs ${card.subtitleColor} mt-1`}>{card.subtitle}</p>
              </div>
              <card.icon className={`w-8 h-8 ${card.iconColor} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PayrollSummaryCards;
