import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface Branch {
  id: string;
  name: string;
}

interface ProfitLossData {
  category: string;
  subcategory: string;
  amount: number;
  type: 'revenue' | 'expense';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const BranchProfitLoss = () => {
  const { user, userrole } = useAuth();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(true);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);

  // Sample P&L categories - these would be populated from actual data
  const samplePLData: ProfitLossData[] = [
    // Revenue
    { category: 'Revenue', subcategory: 'Class Fees', amount: 15000, type: 'revenue' },
    { category: 'Revenue', subcategory: 'Equipment Sales', amount: 2500, type: 'revenue' },
    { category: 'Revenue', subcategory: 'Grading Fees', amount: 1800, type: 'revenue' },
    { category: 'Revenue', subcategory: 'Competition Registration', amount: 500, type: 'revenue' },
    // Expenses
    { category: 'Operating Expenses', subcategory: 'Rent', amount: 4500, type: 'expense' },
    { category: 'Operating Expenses', subcategory: 'Utilities', amount: 800, type: 'expense' },
    { category: 'Operating Expenses', subcategory: 'Insurance', amount: 350, type: 'expense' },
    { category: 'Staff Costs', subcategory: 'Instructor Salaries', amount: 6000, type: 'expense' },
    { category: 'Staff Costs', subcategory: 'CPF Contributions', amount: 1020, type: 'expense' },
    { category: 'Marketing', subcategory: 'Advertising', amount: 400, type: 'expense' },
    { category: 'Marketing', subcategory: 'Promotions', amount: 200, type: 'expense' },
    { category: 'Equipment', subcategory: 'Training Equipment', amount: 500, type: 'expense' },
    { category: 'Equipment', subcategory: 'Maintenance', amount: 150, type: 'expense' },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load branches
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name')
          .order('name');
        
        if (!branchError && branchData) {
          setBranches(branchData);
        }
        
        // Load current employee for non-superadmin users
        if (userrole !== 'superadmin' && user?.email) {
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          setCurrentEmployee(employee);
          
          // For partners, filter to their assigned branch
          if (employee?.position === 'Partner' && employee?.department) {
            const matchingBranch = branchData?.find(
              b => b.name.toLowerCase() === employee.department.toLowerCase() ||
                   b.id.toLowerCase() === employee.department.toLowerCase()
            );
            if (matchingBranch) {
              setSelectedBranch(matchingBranch.id);
            }
          }
        }
        
        // Load sample P&L data
        setProfitLossData(samplePLData);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast("Error loading data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, userrole]);

  const canViewAllBranches = userrole === 'superadmin' || 
    currentEmployee?.position === 'Senior Partner';

  const getAvailableBranches = () => {
    if (canViewAllBranches) return branches;
    
    // Partners can only see their assigned branch
    if (currentEmployee?.department) {
      return branches.filter(
        b => b.name.toLowerCase() === currentEmployee.department.toLowerCase() ||
             b.id.toLowerCase() === currentEmployee.department.toLowerCase()
      );
    }
    return [];
  };

  const totalRevenue = profitLossData
    .filter(item => item.type === 'revenue')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = profitLossData
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  const groupedExpenses = profitLossData
    .filter(item => item.type === 'expense')
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ProfitLossData[]>);

  const handleExport = () => {
    toast("Export functionality coming soon");
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profit & loss data...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className={`space-y-6 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto'}`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              <FileSpreadsheet className="inline-block w-6 h-6 mr-2 text-emerald-600" />
              Branch Profit & Loss
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Monthly financial overview by branch
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Branch
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableBranches().map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Month
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-32">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedBranch ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-700 font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-emerald-800">
                        S${totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-800">
                        S${totalExpenses.toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        Net {netProfit >= 0 ? 'Profit' : 'Loss'}
                      </p>
                      <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                        S${Math.abs(netProfit).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className={`w-8 h-8 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Profit Margin</p>
                      <p className="text-2xl font-bold text-purple-800">{profitMargin}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* P&L Statement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
                  <CardTitle className="text-emerald-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitLossData.filter(item => item.type === 'revenue').map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.subcategory}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-700">
                            S${item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-emerald-50 font-bold">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell className="text-right text-emerald-800">
                          S${totalRevenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedExpenses).map(([category, items]) => (
                        <React.Fragment key={category}>
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={2} className="font-semibold text-gray-700">
                              {category}
                            </TableCell>
                          </TableRow>
                          {items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="pl-6">{item.subcategory}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                S${item.amount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="bg-red-50 font-bold">
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right text-red-800">
                          S${totalExpenses.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Net Summary */}
            <Card className={`shadow-lg border-2 ${netProfit >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Net {netProfit >= 0 ? 'Profit' : 'Loss'} for {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {branches.find(b => b.id === selectedBranch)?.name || 'Selected Branch'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      S${Math.abs(netProfit).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {profitMargin}% margin
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Branch</h3>
              <p className="text-gray-500">
                Please select a branch to view its profit and loss statement.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default BranchProfitLoss;
