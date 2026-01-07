import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, FileSpreadsheet, Percent, User, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface Branch {
  id: string;
  name: string;
}

interface PartnerBranchShare {
  branch_id: string;
  share_percentage: number;
  branch?: Branch;
}

interface ProfitLossData {
  id?: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  share_percentage: number;
  type: 'revenue' | 'expense';
}

interface EditFormData {
  id?: string;
  category: string;
  subcategory: string;
  description: string;
  amount: string;
  share_percentage: string;
  type: 'revenue' | 'expense';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_ENTRIES: ProfitLossData[] = [
  // Revenue
  { category: 'Revenue', subcategory: 'Class Fees', description: 'Monthly class fees from students', amount: 15000, share_percentage: 100, type: 'revenue' },
  { category: 'Revenue', subcategory: 'Equipment Sales', description: 'Sale of training equipment and uniforms', amount: 2500, share_percentage: 100, type: 'revenue' },
  { category: 'Revenue', subcategory: 'Grading Fees', description: 'Belt grading examination fees', amount: 1800, share_percentage: 100, type: 'revenue' },
  { category: 'Revenue', subcategory: 'Competition Registration', description: 'Competition entry fees', amount: 500, share_percentage: 100, type: 'revenue' },
  // Expenses
  { category: 'Operating Expenses', subcategory: 'Rent', description: 'Monthly rental for premises', amount: 4500, share_percentage: 100, type: 'expense' },
  { category: 'Operating Expenses', subcategory: 'Utilities', description: 'Electricity, water, internet', amount: 800, share_percentage: 100, type: 'expense' },
  { category: 'Operating Expenses', subcategory: 'Insurance', description: 'Business liability insurance', amount: 350, share_percentage: 100, type: 'expense' },
  { category: 'Staff Costs', subcategory: 'Instructor Salaries', description: 'Salaries for instructors', amount: 6000, share_percentage: 100, type: 'expense' },
  { category: 'Staff Costs', subcategory: 'CPF Contributions', description: 'Employer CPF contributions', amount: 1020, share_percentage: 100, type: 'expense' },
  { category: 'Marketing', subcategory: 'Advertising', description: 'Online and offline advertising', amount: 400, share_percentage: 100, type: 'expense' },
  { category: 'Marketing', subcategory: 'Promotions', description: 'Promotional events and offers', amount: 200, share_percentage: 100, type: 'expense' },
  { category: 'Equipment', subcategory: 'Training Equipment', description: 'Mats, pads, and training gear', amount: 500, share_percentage: 100, type: 'expense' },
  { category: 'Equipment', subcategory: 'Maintenance', description: 'Equipment repair and maintenance', amount: 150, share_percentage: 100, type: 'expense' },
];

const BranchProfitLoss = () => {
  const { user, userrole } = useAuth();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [partnerShares, setPartnerShares] = useState<PartnerBranchShare[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(true);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    share_percentage: '100',
    type: 'revenue'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperadmin = userrole === 'superadmin';

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
        
        // Load current employee and their branch shares for non-superadmin users
        if (userrole !== 'superadmin' && user?.email) {
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          setCurrentEmployee(employee);
          
          // Load partner branch shares for this employee
          if (employee && (employee.position === 'Partner' || employee.position === 'Senior Partner')) {
            const { data: sharesData, error: sharesError } = await supabase
              .from('partner_branch_shares')
              .select('branch_id, share_percentage')
              .eq('employee_id', employee.id)
              .is('effective_to', null);
            
            if (!sharesError && sharesData) {
              const sharesWithBranches = sharesData.map(share => ({
                ...share,
                branch: branchData?.find(b => b.id === share.branch_id)
              }));
              setPartnerShares(sharesWithBranches);
              
              // Auto-select first branch if partner has shares
              if (sharesData.length > 0 && !selectedBranch) {
                setSelectedBranch(sharesData[0].branch_id);
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error("Error loading data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, userrole]);

  // Load P&L data when branch/month/year changes
  useEffect(() => {
    const loadPLData = async () => {
      if (!selectedBranch) {
        setProfitLossData([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('branch_profit_loss_entries')
          .select('*')
          .eq('branch_id', selectedBranch)
          .eq('month', parseInt(selectedMonth))
          .eq('year', parseInt(selectedYear));

        if (error) {
          console.error('Error loading P&L data:', error);
          // Use default entries if no data exists
          setProfitLossData(DEFAULT_ENTRIES);
          return;
        }

        if (data && data.length > 0) {
          setProfitLossData(data.map(item => ({
            id: item.id,
            category: item.category,
            subcategory: item.subcategory,
            description: item.description || '',
            amount: Number(item.amount),
            share_percentage: Number(item.share_percentage) || 100,
            type: item.type as 'revenue' | 'expense'
          })));
        } else {
          // Use default entries if no data exists
          setProfitLossData(DEFAULT_ENTRIES);
        }
      } catch (error) {
        console.error('Error loading P&L data:', error);
        setProfitLossData(DEFAULT_ENTRIES);
      }
    };

    loadPLData();
  }, [selectedBranch, selectedMonth, selectedYear]);

  const canViewAllBranches = userrole === 'superadmin' || 
    currentEmployee?.position === 'Senior Partner';

  const getAvailableBranches = () => {
    if (canViewAllBranches) return branches;
    
    // Partners can only see branches they have shares in
    if (partnerShares.length > 0) {
      const partnerBranchIds = partnerShares.map(s => s.branch_id);
      return branches.filter(b => partnerBranchIds.includes(b.id));
    }
    return [];
  };

  // Get the partner's share percentage for the selected branch
  const getSelectedBranchShare = () => {
    if (userrole === 'superadmin') return null;
    const share = partnerShares.find(s => s.branch_id === selectedBranch);
    return share?.share_percentage || null;
  };

  const selectedShare = getSelectedBranchShare();

  const totalRevenue = profitLossData
    .filter(item => item.type === 'revenue')
    .reduce((sum, item) => sum + (item.amount * item.share_percentage / 100), 0);

  const totalExpenses = profitLossData
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + (item.amount * item.share_percentage / 100), 0);

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
    toast.info("Export functionality coming soon");
  };

  const openAddDialog = (type: 'revenue' | 'expense') => {
    setEditForm({
      category: type === 'revenue' ? 'Revenue' : '',
      subcategory: '',
      description: '',
      amount: '',
      share_percentage: '100',
      type
    });
    setIsEditing(false);
    setEditDialogOpen(true);
  };

  const openEditDialog = (item: ProfitLossData) => {
    setEditForm({
      id: item.id,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      amount: item.amount.toString(),
      share_percentage: item.share_percentage.toString(),
      type: item.type
    });
    setIsEditing(true);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.category || !editForm.subcategory || !editForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const entryData = {
        branch_id: selectedBranch,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        category: editForm.category,
        subcategory: editForm.subcategory,
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        share_percentage: parseFloat(editForm.share_percentage) || 100,
        type: editForm.type,
        updated_by: user?.email
      };

      if (isEditing && editForm.id) {
        const { error } = await supabase
          .from('branch_profit_loss_entries')
          .update(entryData)
          .eq('id', editForm.id);

        if (error) throw error;
        toast.success("Entry updated successfully");
      } else {
        const { error } = await supabase
          .from('branch_profit_loss_entries')
          .insert({ ...entryData, created_by: user?.email });

        if (error) throw error;
        toast.success("Entry added successfully");
      }

      // Reload data
      const { data } = await supabase
        .from('branch_profit_loss_entries')
        .select('*')
        .eq('branch_id', selectedBranch)
        .eq('month', parseInt(selectedMonth))
        .eq('year', parseInt(selectedYear));

      if (data) {
        setProfitLossData(data.map(item => ({
          id: item.id,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description || '',
          amount: Number(item.amount),
          share_percentage: Number(item.share_percentage) || 100,
          type: item.type as 'revenue' | 'expense'
        })));
      }

      setEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast.error(error.message || "Error saving entry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ProfitLossData) => {
    if (!item.id) return;

    if (!confirm(`Are you sure you want to delete "${item.subcategory}"?`)) return;

    try {
      const { error } = await supabase
        .from('branch_profit_loss_entries')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setProfitLossData(prev => prev.filter(p => p.id !== item.id));
      toast.success("Entry deleted successfully");
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error(error.message || "Error deleting entry");
    }
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
                        S${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        S${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        S${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* P&L Statement - Revenue first, then Expenses below */}
            <div className="space-y-6">
              {/* Revenue */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-emerald-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Revenue
                    </CardTitle>
                    {isSuperadmin && (
                      <Button size="sm" variant="outline" onClick={() => openAddDialog('revenue')} className="gap-1">
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Share %</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Partner's Share</TableHead>
                        {isSuperadmin && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitLossData.filter(item => item.type === 'revenue').map((item, idx) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="font-medium">{item.subcategory}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{item.description}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.share_percentage}%</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            S${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-700">
                            S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          {isSuperadmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => openEditDialog(item)} className="h-7 w-7">
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-7 w-7 text-red-600 hover:text-red-700">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="bg-emerald-50 font-bold">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          S${profitLossData.filter(item => item.type === 'revenue').reduce((sum, item) => sum + item.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-emerald-800">
                          S${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        {isSuperadmin && <TableCell></TableCell>}
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-red-800 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Expenses
                    </CardTitle>
                    {isSuperadmin && (
                      <Button size="sm" variant="outline" onClick={() => openAddDialog('expense')} className="gap-1">
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Share %</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Partner's Share</TableHead>
                        {isSuperadmin && <TableHead className="w-20"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedExpenses).map(([category, items]) => (
                        <React.Fragment key={category}>
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={isSuperadmin ? 6 : 5} className="font-semibold text-gray-700">
                              {category}
                            </TableCell>
                          </TableRow>
                          {items.map((item, idx) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="pl-6">{item.subcategory}</TableCell>
                              <TableCell className="text-gray-600 text-sm">{item.description}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{item.share_percentage}%</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                S${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              {isSuperadmin && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(item)} className="h-7 w-7">
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-7 w-7 text-red-600 hover:text-red-700">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableRow className="bg-red-50 font-bold">
                        <TableCell>Total Expenses</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          S${profitLossData.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-800">
                          S${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        {isSuperadmin && <TableCell></TableCell>}
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Net Summary */}
            <Card className={`shadow-lg border-2 ${netProfit >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                      S${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {profitMargin}% margin
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Share Section - Only show for partners with assigned shares */}
            {selectedShare && (
              <Card className="shadow-lg border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-indigo-100">
                        <User className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Your Partner Share</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                            <Percent className="w-3 h-3 mr-1" />
                            {selectedShare}% Share
                          </Badge>
                          of {branches.find(b => b.id === selectedBranch)?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-indigo-700 font-medium">
                        Your Share of {netProfit >= 0 ? 'Profit' : 'Loss'}
                      </p>
                      <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                        S${Math.abs(netProfit * (selectedShare / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {selectedShare}% of S${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Entry' : `Add ${editForm.type === 'revenue' ? 'Revenue' : 'Expense'}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Category *</label>
              <Input
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Revenue, Operating Expenses"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subcategory *</label>
              <Input
                value={editForm.subcategory}
                onChange={(e) => setEditForm(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="e.g., Class Fees, Rent"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (S$) *</label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Share Percentage (%)</label>
              <Input
                type="number"
                value={editForm.share_percentage}
                onChange={(e) => setEditForm(prev => ({ ...prev, share_percentage: e.target.value }))}
                placeholder="100"
                min="0"
                max="100"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage of this amount attributed to this branch</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select 
                value={editForm.type} 
                onValueChange={(value: 'revenue' | 'expense') => setEditForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
};

export default BranchProfitLoss;
