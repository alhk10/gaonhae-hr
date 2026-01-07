import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, FileSpreadsheet, Percent, User, Plus, Edit2, Trash2, Save, X, Check, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

interface InlineEditData {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  amount: string;
  share_percentage: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_REVENUE_CATEGORIES: string[] = [];
const DEFAULT_EXPENSE_CATEGORIES: string[] = [];

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
  
  // Categories state
  const [revenueCategories, setRevenueCategories] = useState<string[]>(DEFAULT_REVENUE_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState<'revenue' | 'expense' | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<InlineEditData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState<'revenue' | 'expense' | null>(null);
  const [newEntryData, setNewEntryData] = useState({
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    share_percentage: '100'
  });

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
          setProfitLossData([]);
          return;
        }

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
          
          // Extract unique categories from existing data
          const uniqueRevenueCategories = new Set([...DEFAULT_REVENUE_CATEGORIES]);
          const uniqueExpenseCategories = new Set([...DEFAULT_EXPENSE_CATEGORIES]);
          
          data.forEach(item => {
            if (item.type === 'revenue' && item.subcategory) {
              uniqueRevenueCategories.add(item.subcategory);
            } else if (item.type === 'expense' && item.subcategory) {
              uniqueExpenseCategories.add(item.subcategory);
            }
          });
          
          setRevenueCategories(Array.from(uniqueRevenueCategories).sort());
          setExpenseCategories(Array.from(uniqueExpenseCategories).sort());
        }
      } catch (error) {
        console.error('Error loading P&L data:', error);
        setProfitLossData([]);
      }
    };

    loadPLData();
  }, [selectedBranch, selectedMonth, selectedYear]);
  
  // Get default share percentage from partner's branch share
  const getDefaultSharePercentage = () => {
    const partnerShare = partnerShares.find(s => s.branch_id === selectedBranch);
    return partnerShare?.share_percentage?.toString() || '100';
  };
  
  // Handle adding new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    if (showAddCategoryDialog === 'revenue') {
      if (revenueCategories.includes(newCategoryName.trim())) {
        toast.error("Category already exists");
        return;
      }
      setRevenueCategories(prev => [...prev, newCategoryName.trim()].sort());
    } else if (showAddCategoryDialog === 'expense') {
      if (expenseCategories.includes(newCategoryName.trim())) {
        toast.error("Category already exists");
        return;
      }
      setExpenseCategories(prev => [...prev, newCategoryName.trim()].sort());
    }
    
    setNewCategoryName('');
    setShowAddCategoryDialog(null);
    toast.success("Category added");
  };
  
  // Start adding with default share percentage
  const startAddingEntry = (type: 'revenue' | 'expense') => {
    setIsAdding(type);
    setNewEntryData({
      category: '',
      subcategory: '',
      description: '',
      amount: '',
      share_percentage: getDefaultSharePercentage()
    });
  };

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

  // Start inline editing
  const startEdit = (item: ProfitLossData) => {
    if (!item.id) return;
    setEditingId(item.id);
    setEditData({
      id: item.id,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      amount: item.amount.toString(),
      share_percentage: item.share_percentage.toString()
    });
  };

  // Cancel inline editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  // Save inline edit
  const saveEdit = async () => {
    if (!editData || !editData.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('branch_profit_loss_entries')
        .update({
          category: editData.category,
          subcategory: editData.subcategory,
          description: editData.description,
          amount: parseFloat(editData.amount) || 0,
          share_percentage: parseFloat(editData.share_percentage) || 100,
          updated_by: user?.email
        })
        .eq('id', editData.id);

      if (error) throw error;

      // Update local state
      setProfitLossData(prev => prev.map(item => 
        item.id === editData.id 
          ? {
              ...item,
              category: editData.category,
              subcategory: editData.subcategory,
              description: editData.description,
              amount: parseFloat(editData.amount) || 0,
              share_percentage: parseFloat(editData.share_percentage) || 100
            }
          : item
      ));

      setEditingId(null);
      setEditData(null);
      toast.success("Entry updated successfully");
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast.error(error.message || "Error saving entry");
    } finally {
      setIsSaving(false);
    }
  };

  // Add new entry
  const handleAddEntry = async (type: 'revenue' | 'expense') => {
    if (!newEntryData.subcategory || !newEntryData.amount) {
      toast.error("Please fill in category and amount");
      return;
    }

    setIsSaving(true);
    try {
      const entryData = {
        branch_id: selectedBranch,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        category: newEntryData.category || (type === 'revenue' ? 'Revenue' : 'Other'),
        subcategory: newEntryData.subcategory,
        description: newEntryData.description,
        amount: parseFloat(newEntryData.amount) || 0,
        share_percentage: parseFloat(newEntryData.share_percentage) || 100,
        type,
        created_by: user?.email
      };

      const { data, error } = await supabase
        .from('branch_profit_loss_entries')
        .insert(entryData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setProfitLossData(prev => [...prev, {
        id: data.id,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description || '',
        amount: Number(data.amount),
        share_percentage: Number(data.share_percentage) || 100,
        type: data.type as 'revenue' | 'expense'
      }]);

      setIsAdding(null);
      setNewEntryData({ category: '', subcategory: '', description: '', amount: '', share_percentage: '100' });
      toast.success("Entry added successfully");
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast.error(error.message || "Error adding entry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ProfitLossData) => {
    if (!item.id) {
      toast.error("Cannot delete unsaved entry");
      return;
    }

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

  // Render editable row
  const renderEditableRow = (item: ProfitLossData, isExpense: boolean = false) => {
    const isEditing = editingId === item.id;
    const categories = isExpense ? expenseCategories : revenueCategories;
    
    if (isEditing && editData) {
      return (
        <TableRow key={item.id} className="bg-blue-50">
          <TableCell className={isExpense ? "pl-6" : ""}>
            <Select
              value={editData.subcategory}
              onValueChange={(value) => {
                if (value === '__add_new__') {
                  setShowAddCategoryDialog(isExpense ? 'expense' : 'revenue');
                } else {
                  setEditData({ ...editData, subcategory: value });
                }
              }}
            >
              <SelectTrigger className="h-8 text-sm min-w-[140px] bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <SelectItem value="__add_new__" className="text-primary">
                  <span className="flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" />
                    Add New Category
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Input
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="h-8 text-sm"
              placeholder="Description"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editData.share_percentage}
              onChange={(e) => setEditData({ ...editData, share_percentage: e.target.value })}
              className="h-8 text-sm w-20"
              min="0"
              max="100"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className="h-8 text-sm w-28"
              step="0.01"
            />
          </TableCell>
          <TableCell className={`text-right font-medium ${isExpense ? 'text-red-600' : 'text-emerald-700'}`}>
            S${((parseFloat(editData.amount) || 0) * (parseFloat(editData.share_percentage) || 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
          {isSuperadmin && (
            <TableCell>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSaving} className="h-7 w-7 text-green-600 hover:text-green-700">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7 text-gray-600 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    }

    return (
      <TableRow key={item.id || `temp-${item.subcategory}`}>
        <TableCell className={`font-medium ${isExpense ? "pl-6" : ""}`}>{item.subcategory}</TableCell>
        <TableCell className="text-gray-600 text-sm">{item.description}</TableCell>
        <TableCell className="text-right">
          <Badge variant="secondary">{item.share_percentage}%</Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          S${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className={`text-right font-medium ${isExpense ? 'text-red-600' : 'text-emerald-700'}`}>
          S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        {isSuperadmin && (
          <TableCell>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7" disabled={!item.id}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-7 w-7 text-red-600 hover:text-red-700" disabled={!item.id}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  };

  // Render add new row
  const renderAddRow = (type: 'revenue' | 'expense') => {
    if (isAdding !== type) return null;
    
    const categories = type === 'revenue' ? revenueCategories : expenseCategories;
    
    return (
      <TableRow className="bg-green-50">
        <TableCell className={type === 'expense' ? "pl-6" : ""}>
          <div className="flex gap-1 items-center">
            <Select
              value={newEntryData.subcategory}
              onValueChange={(value) => {
                if (value === '__add_new__') {
                  setShowAddCategoryDialog(type);
                } else {
                  setNewEntryData({ ...newEntryData, subcategory: value });
                }
              }}
            >
              <SelectTrigger className="h-8 text-sm min-w-[140px] bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <SelectItem value="__add_new__" className="text-primary">
                  <span className="flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" />
                    Add New Category
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TableCell>
        <TableCell>
          <Input
            value={newEntryData.description}
            onChange={(e) => setNewEntryData({ ...newEntryData, description: e.target.value })}
            className="h-8 text-sm"
            placeholder="Description"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={newEntryData.share_percentage}
            onChange={(e) => setNewEntryData({ ...newEntryData, share_percentage: e.target.value })}
            className="h-8 text-sm w-20"
            min="0"
            max="100"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={newEntryData.amount}
            onChange={(e) => setNewEntryData({ ...newEntryData, amount: e.target.value })}
            className="h-8 text-sm w-28"
            step="0.01"
            placeholder="0.00"
          />
        </TableCell>
        <TableCell className={`text-right font-medium ${type === 'expense' ? 'text-red-600' : 'text-emerald-700'}`}>
          S${((parseFloat(newEntryData.amount) || 0) * (parseFloat(newEntryData.share_percentage) || 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleAddEntry(type)} disabled={isSaving} className="h-7 w-7 text-green-600 hover:text-green-700">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setIsAdding(null); setNewEntryData({ category: '', subcategory: '', description: '', amount: '', share_percentage: '100' }); }} className="h-7 w-7 text-gray-600 hover:text-gray-700">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

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
                      <Button size="sm" variant="outline" onClick={() => startAddingEntry('revenue')} className="gap-1" disabled={isAdding !== null}>
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
                      {profitLossData.filter(item => item.type === 'revenue').map((item) => renderEditableRow(item, false))}
                      {renderAddRow('revenue')}
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
                      <Button size="sm" variant="outline" onClick={() => startAddingEntry('expense')} className="gap-1" disabled={isAdding !== null}>
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
                          {items.map((item) => renderEditableRow(item, true))}
                        </React.Fragment>
                      ))}
                      {renderAddRow('expense')}
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
        
        {/* Add Category Dialog */}
        <Dialog open={showAddCategoryDialog !== null} onOpenChange={(open) => !open && setShowAddCategoryDialog(null)}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>Add New {showAddCategoryDialog === 'revenue' ? 'Revenue' : 'Expense'} Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category Name</label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCategoryDialog(null)}>Cancel</Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
};

export default BranchProfitLoss;
