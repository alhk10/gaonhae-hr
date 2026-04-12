import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import jsPDF from 'jspdf';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCategorySelect } from '@/components/ui/searchable-category-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, FileSpreadsheet, Percent, User, Plus, Edit2, Trash2, Save, X, Check, PlusCircle, Settings, GripVertical, Send, CheckCircle } from 'lucide-react';
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

interface PLCategory {
  id: string;
  name: string;
  type: 'revenue' | 'expense';
  default_cost_price: number | null;
  sort_order: number;
}

interface ProfitLossData {
  id?: string;
  category: string;
  subcategory: string;
  description: string;
  cost_price: number | null;
  quantity: number;
  sales_amount: number | null;
  discount_percentage: number | null;
  amount: number;
  share_percentage: number;
  type: 'revenue' | 'expense';
}

interface InlineEditData {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  cost_price: string;
  quantity: string;
  sales_amount: string;
  discount_percentage: string;
  amount: string;
  share_percentage: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_REVENUE_CATEGORIES: PLCategory[] = [];
const DEFAULT_EXPENSE_CATEGORIES: PLCategory[] = [];
// Sortable category row component for drag-and-drop
const SortableCategoryRow = ({ category, isRevenue, editingCategory, setEditingCategory, onSaveEdit, onDelete }: {
  category: PLCategory;
  isRevenue: boolean;
  editingCategory: any;
  setEditingCategory: (v: any) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 hover:bg-muted/50 bg-background">
      {editingCategory?.id === category.id ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editingCategory.name}
            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
            className="h-8 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') setEditingCategory(null);
            }}
          />
          {isRevenue && (
            <Input
              type="number"
              value={editingCategory.cost_price}
              onChange={(e) => setEditingCategory({ ...editingCategory, cost_price: e.target.value })}
              className="h-8 w-28"
              step="0.01"
              placeholder="Cost Price"
            />
          )}
          <Button size="icon" variant="ghost" onClick={onSaveEdit} className="h-8 w-8 text-green-600">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditingCategory(null)} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none">
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-sm flex-1 ml-2">{category.name}</span>
          {isRevenue && (
            <span className="text-sm text-muted-foreground w-28 text-right">
              {category.default_cost_price ? `S$${category.default_cost_price.toFixed(2)}` : '-'}
            </span>
          )}
          <div className="flex gap-0.5 items-center">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditingCategory({
                id: category.id,
                name: category.name,
                cost_price: category.default_cost_price?.toString() || ''
              })}
              className="h-8 w-8"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

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
  const [revenueCategories, setRevenueCategories] = useState<PLCategory[]>(DEFAULT_REVENUE_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<PLCategory[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState<'revenue' | 'expense' | null>(null);
  const [showManageCategoriesDialog, setShowManageCategoriesDialog] = useState<'revenue' | 'expense' | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; cost_price: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCostPrice, setNewCategoryCostPrice] = useState('');
  const [branchDefaultShare, setBranchDefaultShare] = useState<number | null>(null);
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<InlineEditData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState<'revenue' | 'expense' | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newEntryData, setNewEntryData] = useState({
    category: '',
    subcategory: '',
    cost_price: '',
    quantity: '1',
    sales_amount: '',
    discount_percentage: '0',
    description: '',
    amount: '',
    share_percentage: '100'
  });

  const [publishedReports, setPublishedReports] = useState<{ branch_id: string; month: number; year: number }[]>([]);

  const isSuperadmin = userrole === 'superadmin';
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  const sensors = useSensors(pointerSensor, keyboardSensor);

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
        
        // Load global categories ordered by sort_order
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('pl_categories')
          .select('*')
          .order('sort_order')
          .order('name');
        
        if (!categoriesError && categoriesData) {
          setRevenueCategories(categoriesData.filter(c => c.type === 'revenue') as PLCategory[]);
          setExpenseCategories(categoriesData.filter(c => c.type === 'expense') as PLCategory[]);
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
              
              // Load published reports for partner's branches
              const branchIds = sharesData.map(s => s.branch_id);
              const { data: publishedData } = await supabase
                .from('published_pl_reports')
                .select('branch_id, month, year')
                .in('branch_id', branchIds);
              
              if (publishedData) {
                setPublishedReports(publishedData);
                
                // Auto-select first published report if available
                if (publishedData.length > 0) {
                  const firstPublished = publishedData[0];
                  setSelectedBranch(firstPublished.branch_id);
                  setSelectedMonth(firstPublished.month.toString());
                  setSelectedYear(firstPublished.year.toString());
                }
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

  // Load P&L data when branch/month/year changes - only when not editing
  useEffect(() => {
    // Prevent auto-refresh while user is editing or adding entries
    if (editingId || isAdding) {
      return;
    }

    const loadPLData = async () => {
      if (!selectedBranch) {
        setProfitLossData([]);
        setBranchDefaultShare(null);
        return;
      }

      try {
        // For non-superadmins, check if report is published first
        if (userrole !== 'superadmin') {
          const { data: publishedData } = await supabase
            .from('published_pl_reports')
            .select('id')
            .eq('branch_id', selectedBranch)
            .eq('month', parseInt(selectedMonth))
            .eq('year', parseInt(selectedYear))
            .maybeSingle();

          if (!publishedData) {
            // Report not published, don't load data
            setProfitLossData([]);
            setIsPublished(false);
            return;
          }
          setIsPublished(true);
        }

        // Load P&L entries
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
            cost_price: item.cost_price ? Number(item.cost_price) : null,
            quantity: Number(item.quantity) || 1,
            sales_amount: item.sales_amount ? Number(item.sales_amount) : null,
            discount_percentage: item.discount_percentage ? Number(item.discount_percentage) : null,
            amount: Number(item.amount),
            share_percentage: Number(item.share_percentage) || 100,
            type: item.type as 'revenue' | 'expense'
          })));
        }
        
        // Load default share percentage for this branch
        const { data: sharesData } = await supabase
          .from('partner_branch_shares')
          .select('share_percentage')
          .eq('branch_id', selectedBranch)
          .is('effective_to', null)
          .limit(1)
          .maybeSingle();
        
        if (sharesData?.share_percentage) {
          setBranchDefaultShare(Number(sharesData.share_percentage));
        } else {
          setBranchDefaultShare(100); // Default to 100% if no share configured
        }
      } catch (error) {
        console.error('Error loading P&L data:', error);
        setProfitLossData([]);
      }
    };

    loadPLData();
  }, [selectedBranch, selectedMonth, selectedYear, userrole, editingId, isAdding]);

  // Check if report is published
  useEffect(() => {
    const checkPublishStatus = async () => {
      if (!selectedBranch || !selectedMonth || !selectedYear) {
        setIsPublished(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('published_pl_reports')
          .select('id')
          .eq('branch_id', selectedBranch)
          .eq('month', parseInt(selectedMonth))
          .eq('year', parseInt(selectedYear))
          .maybeSingle();

        if (error) throw error;
        setIsPublished(!!data);
      } catch (error) {
        console.error('Error checking publish status:', error);
        setIsPublished(false);
      }
    };

    checkPublishStatus();
  }, [selectedBranch, selectedMonth, selectedYear]);

  // Handle publish/unpublish report
  const handlePublishToggle = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch first');
      return;
    }

    setIsPublishing(true);
    try {
      if (isPublished) {
        // Unpublish
        const { error } = await supabase
          .from('published_pl_reports')
          .delete()
          .eq('branch_id', selectedBranch)
          .eq('month', parseInt(selectedMonth))
          .eq('year', parseInt(selectedYear));

        if (error) throw error;
        setIsPublished(false);
        toast.success('Report unpublished successfully');
      } else {
        // Publish
        const { error } = await supabase
          .from('published_pl_reports')
          .insert({
            branch_id: selectedBranch,
            month: parseInt(selectedMonth),
            year: parseInt(selectedYear),
            published_by: user?.email
          });

        if (error) throw error;
        setIsPublished(true);
        toast.success('Report published! Partners can now view this report.');
      }
    } catch (error: any) {
      console.error('Error toggling publish status:', error);
      toast.error(error.message || 'Failed to update publish status');
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Get default share percentage from branch share config
  const getDefaultSharePercentage = () => {
    if (branchDefaultShare !== null) {
      return branchDefaultShare.toString();
    }
    const partnerShare = partnerShares.find(s => s.branch_id === selectedBranch);
    return partnerShare?.share_percentage?.toString() || '100';
  };
  
  // Get default cost price for a category
  const getDefaultCostPrice = (categoryName: string, type: 'revenue' | 'expense') => {
    const categories = type === 'revenue' ? revenueCategories : expenseCategories;
    const category = categories.find(c => c.name === categoryName);
    return category?.default_cost_price?.toString() || '';
  };
  
  // Handle adding new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    const type = showAddCategoryDialog || showManageCategoriesDialog;
    if (!type) return;
    
    const categories = type === 'revenue' ? revenueCategories : expenseCategories;
    if (categories.some(c => c.name === newCategoryName.trim())) {
      toast.error("Category already exists");
      return;
    }
    
    try {
      const costPrice = newCategoryCostPrice ? parseFloat(newCategoryCostPrice) : null;
      
      const { data, error } = await supabase
        .from('pl_categories')
        .insert({
          name: newCategoryName.trim(),
          type,
          default_cost_price: costPrice,
          created_by: user?.email
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newCategory: PLCategory = {
        id: data.id,
        name: data.name,
        type: data.type as 'revenue' | 'expense',
        default_cost_price: data.default_cost_price ? Number(data.default_cost_price) : null,
        sort_order: data.sort_order || 0
      };
      
      if (type === 'revenue') {
        setRevenueCategories(prev => [...prev, newCategory].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
      } else {
        setExpenseCategories(prev => [...prev, newCategory].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
      }
      
      setNewCategoryName('');
      setNewCategoryCostPrice('');
      if (showAddCategoryDialog) {
        setShowAddCategoryDialog(null);
      }
      toast.success("Category added");
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(error.message || "Error adding category");
    }
  };
  
  // Handle deleting category
  const handleDeleteCategory = async (categoryId: string, type: 'revenue' | 'expense') => {
    try {
      const { error } = await supabase
        .from('pl_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      
      if (type === 'revenue') {
        setRevenueCategories(prev => prev.filter(c => c.id !== categoryId));
      } else {
        setExpenseCategories(prev => prev.filter(c => c.id !== categoryId));
      }
      toast.success("Category deleted");
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || "Error deleting category");
    }
  };
  
  // Handle editing category
  const handleSaveEditCategory = async (type: 'revenue' | 'expense') => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    const categories = type === 'revenue' ? revenueCategories : expenseCategories;
    const originalCategory = categories.find(c => c.id === editingCategory.id);
    
    if (originalCategory?.name !== editingCategory.name && categories.some(c => c.name === editingCategory.name.trim())) {
      toast.error("Category already exists");
      return;
    }
    
    try {
      const costPrice = editingCategory.cost_price ? parseFloat(editingCategory.cost_price) : null;
      
      const { error } = await supabase
        .from('pl_categories')
        .update({
          name: editingCategory.name.trim(),
          default_cost_price: costPrice,
          updated_by: user?.email
        })
        .eq('id', editingCategory.id);
      
      if (error) throw error;
      
      const updateFn = (prev: PLCategory[]) => 
        prev.map(c => c.id === editingCategory.id 
          ? { ...c, name: editingCategory.name.trim(), default_cost_price: costPrice } 
          : c
        ).sort((a, b) => a.name.localeCompare(b.name));
      
      if (type === 'revenue') {
        setRevenueCategories(updateFn);
      } else {
        setExpenseCategories(updateFn);
      }
      
      setEditingCategory(null);
      toast.success("Category updated");
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(error.message || "Error updating category");
    }
  };
  
  // Drag-and-drop reorder handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !showManageCategoriesDialog) return;

    const type = showManageCategoriesDialog;
    const categories = type === 'revenue' ? [...revenueCategories] : [...expenseCategories];
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex).map((cat, i) => ({ ...cat, sort_order: i }));

    // Optimistic update
    if (type === 'revenue') setRevenueCategories(reordered);
    else setExpenseCategories(reordered);

    try {
      for (const cat of reordered) {
        const { error } = await supabase
          .from('pl_categories')
          .update({ sort_order: cat.sort_order, updated_by: user?.email })
          .eq('id', cat.id);
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      toast.error(error.message || "Error reordering categories");
      // Reload on failure
      // Revert by reloading from DB
      const { data } = await supabase.from('pl_categories').select('*').order('sort_order').order('name');
      if (data) {
        setRevenueCategories(data.filter(c => c.type === 'revenue') as PLCategory[]);
        setExpenseCategories(data.filter(c => c.type === 'expense') as PLCategory[]);
      }
    }
  }, [showManageCategoriesDialog, revenueCategories, expenseCategories, user]);
  
  // Start adding with default share percentage
  const startAddingEntry = (type: 'revenue' | 'expense') => {
    setIsAdding(type);
    setNewEntryData({
      category: '',
      subcategory: '',
      cost_price: '',
      quantity: '1',
      sales_amount: '',
      discount_percentage: '0',
      description: '',
      amount: '',
      share_percentage: getDefaultSharePercentage()
    });
  };
  
  // Calculate revenue amount: (Sales Amount * (1 - discount%/100)) - (cost_price * qty)
  const calculateRevenueAmount = (salesAmount: string, discountPct: string, costPrice: string, qty: string) => {
    const sales = parseFloat(salesAmount) || 0;
    const discount = parseFloat(discountPct) || 0;
    const cost = parseFloat(costPrice) || 0;
    const quantity = parseFloat(qty) || 1;
    const discountedSales = sales * (1 - discount / 100);
    return discountedSales - (cost * quantity);
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

  const groupedRevenue = profitLossData
    .filter(item => item.type === 'revenue')
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ProfitLossData[]>);

  const groupedExpenses = profitLossData
    .filter(item => item.type === 'expense')
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ProfitLossData[]>);

  const handleExport = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    let yPos = 15;

    // Helper function for currency formatting
    const formatCurrency = (amount: number) => 
      `S$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Add logo and header
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error('Failed to load logo'));
        logoImg.src = '/images/company-logo.jpg';
      });
      const logoWidth = 25;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      doc.addImage(logoImg, 'JPEG', margin, yPos, logoWidth, Math.min(logoHeight, 15));
    } catch (error) {
      console.warn('Could not load logo for PDF:', error);
    }

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Branch Profit & Loss Report', margin + 30, yPos + 8);
    
    yPos += 20;

    // Branch and Period info
    const branchName = branches.find(b => b.id === selectedBranch)?.name || 'All Branches';
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Branch: ${branchName}`, margin, yPos);
    doc.text(`Period: ${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear}`, margin + 80, yPos);
    
    yPos += 10;

    // Summary section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Partner's Share of Total Revenue: ${formatCurrency(totalRevenue)}`, margin, yPos);
    yPos += 5;
    doc.text(`Partner's Share of Total Expenses: ${formatCurrency(totalExpenses)}`, margin, yPos);
    yPos += 5;
    
    const netProfit = totalRevenue - totalExpenses;
    doc.setFont('helvetica', 'bold');
    doc.text(`Partner's Share of Net Profit: ${formatCurrency(netProfit)}`, margin, yPos);
    
    yPos += 10;

    // Revenue Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text('Revenue', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;

    // Revenue table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const revenueHeaders = ['Category', 'Description', 'Cost', 'Qty', 'Sales', 'Disc%', 'Amount', "Partner's Share"];
    const revColWidths = [55, 25, 18, 12, 22, 15, 22, 26];
    let xPos = margin;
    revenueHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += revColWidths[i];
    });
    yPos += 4;

    // Draw line under header
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;

    // Revenue entries - sorted by category sort_order
    doc.setFont('helvetica', 'normal');
    const revenueEntries = profitLossData.filter(item => item.type === 'revenue');
    
    // Sort revenue entries based on category sort_order from revenueCategories
    const sortedRevenueEntries = [...revenueEntries].sort((a, b) => {
      const catA = revenueCategories.find(c => c.name === a.subcategory);
      const catB = revenueCategories.find(c => c.name === b.subcategory);
      const orderA = catA?.sort_order ?? 999;
      const orderB = catB?.sort_order ?? 999;
      return orderA - orderB;
    });
    
    sortedRevenueEntries.forEach(item => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      xPos = margin;
      doc.text(item.subcategory.substring(0, 34), xPos, yPos);
      xPos += revColWidths[0];
      doc.text((item.description || '-').substring(0, 15), xPos, yPos);
      xPos += revColWidths[1];
      doc.text(item.cost_price ? formatCurrency(item.cost_price) : '-', xPos, yPos);
      xPos += revColWidths[2];
      doc.text(item.quantity.toString(), xPos, yPos);
      xPos += revColWidths[3];
      doc.text(item.sales_amount ? formatCurrency(item.sales_amount) : '-', xPos, yPos);
      xPos += revColWidths[4];
      doc.text(item.discount_percentage ? `${item.discount_percentage}%` : '-', xPos, yPos);
      xPos += revColWidths[5];
      doc.text(formatCurrency(item.amount), xPos, yPos);
      xPos += revColWidths[6];
      doc.text(formatCurrency(item.amount * item.share_percentage / 100), xPos, yPos);
      yPos += 4;
    });

    // Revenue total
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Partner's Share of Total Revenue: ${formatCurrency(totalRevenue)}`, margin, yPos);
    yPos += 10;

    // Expenses Section
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68); // Red color
    doc.text('Expenses', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;

    // Expense table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const expenseHeaders = ['Category', 'Description', 'Amount', "Partner's Share"];
    const expColWidths = [50, 60, 35, 35];
    xPos = margin;
    expenseHeaders.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += expColWidths[i];
    });
    yPos += 4;

    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;

    // Expense entries
    doc.setFont('helvetica', 'normal');
    const expenseEntries = profitLossData.filter(item => item.type === 'expense');
    
    expenseEntries.forEach(item => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      xPos = margin;
      doc.text(item.subcategory.substring(0, 25), xPos, yPos);
      xPos += expColWidths[0];
      doc.text((item.description || '-').substring(0, 30), xPos, yPos);
      xPos += expColWidths[1];
      doc.text(formatCurrency(item.amount), xPos, yPos);
      xPos += expColWidths[2];
      doc.text(formatCurrency(item.amount * item.share_percentage / 100), xPos, yPos);
      yPos += 4;
    });

    // Expenses total
    yPos += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Partner's Share of Total Expenses: ${formatCurrency(totalExpenses)}`, margin, yPos);
    yPos += 10;

    // Net Profit Summary
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const profitColor = netProfit >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
    doc.text(`Partner's Share of Net Profit: ${formatCurrency(netProfit)}`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, pageHeight - 10);

    // Save PDF
    const filename = `PL_${branchName.replace(/\s+/g, '_')}_${MONTHS[parseInt(selectedMonth) - 1]}_${selectedYear}.pdf`;
    doc.save(filename);
    toast.success('PDF exported successfully');
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
      cost_price: item.cost_price?.toString() || '',
      quantity: item.quantity.toString(),
      sales_amount: item.sales_amount?.toString() || '',
      discount_percentage: item.discount_percentage?.toString() || '0',
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
      // Find the item to get its type
      const editingItem = profitLossData.find(item => item.id === editData.id);
      const isRevenue = editingItem?.type === 'revenue';
      
      // For revenue entries, recalculate amount from sales_amount, discount, cost_price, and quantity
      const calculatedAmount = isRevenue 
        ? calculateRevenueAmount(editData.sales_amount, editData.discount_percentage, editData.cost_price, editData.quantity)
        : parseFloat(editData.amount) || 0;
      
      const { error } = await supabase
        .from('branch_profit_loss_entries')
        .update({
          category: editData.category,
          subcategory: editData.subcategory,
          description: editData.description,
          cost_price: editData.cost_price ? parseFloat(editData.cost_price) : null,
          quantity: parseFloat(editData.quantity) || 1,
          sales_amount: editData.sales_amount ? parseFloat(editData.sales_amount) : null,
          discount_percentage: editData.discount_percentage ? parseFloat(editData.discount_percentage) : null,
          amount: calculatedAmount,
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
              cost_price: editData.cost_price ? parseFloat(editData.cost_price) : null,
              quantity: parseFloat(editData.quantity) || 1,
              sales_amount: editData.sales_amount ? parseFloat(editData.sales_amount) : null,
              discount_percentage: editData.discount_percentage ? parseFloat(editData.discount_percentage) : null,
              amount: calculatedAmount,
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
    if (!newEntryData.subcategory) {
      toast.error("Please fill in category");
      return;
    }
    
    // For revenue, validate sales_amount; for expense, validate amount
    if (type === 'revenue' && !newEntryData.sales_amount) {
      toast.error("Please fill in sales amount");
      return;
    }
    if (type === 'expense' && !newEntryData.amount) {
      toast.error("Please fill in amount");
      return;
    }

    setIsSaving(true);
    try {
      // Calculate amount for revenue
      const calculatedAmount = type === 'revenue' 
        ? calculateRevenueAmount(newEntryData.sales_amount, newEntryData.discount_percentage, newEntryData.cost_price, newEntryData.quantity)
        : parseFloat(newEntryData.amount) || 0;
      
      const entryData = {
        branch_id: selectedBranch,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        category: newEntryData.category || (type === 'revenue' ? 'Revenue' : 'Other'),
        subcategory: newEntryData.subcategory,
        description: newEntryData.description,
        cost_price: type === 'revenue' && newEntryData.cost_price ? parseFloat(newEntryData.cost_price) : null,
        quantity: type === 'revenue' ? (parseFloat(newEntryData.quantity) || 1) : 1,
        sales_amount: type === 'revenue' && newEntryData.sales_amount ? parseFloat(newEntryData.sales_amount) : null,
        discount_percentage: type === 'revenue' && newEntryData.discount_percentage ? parseFloat(newEntryData.discount_percentage) : null,
        amount: calculatedAmount,
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
        cost_price: data.cost_price ? Number(data.cost_price) : null,
        quantity: Number(data.quantity) || 1,
        sales_amount: data.sales_amount ? Number(data.sales_amount) : null,
        discount_percentage: data.discount_percentage ? Number(data.discount_percentage) : null,
        amount: Number(data.amount),
        share_percentage: Number(data.share_percentage) || 100,
        type: data.type as 'revenue' | 'expense'
      }]);

      setIsAdding(null);
      setNewEntryData({ category: '', subcategory: '', cost_price: '', quantity: '1', sales_amount: '', discount_percentage: '0', description: '', amount: '', share_percentage: '100' });
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

  // Get available months for non-superadmins (only published months for selected branch and year)
  const getAvailableMonths = () => {
    if (isSuperadmin) {
      return MONTHS.map((month, idx) => ({ value: (idx + 1).toString(), label: month }));
    }
    
    if (!selectedBranch) return [];
    
    const publishedForBranchAndYear = publishedReports.filter(
      r => r.branch_id === selectedBranch && r.year === parseInt(selectedYear)
    );
    
    return publishedForBranchAndYear.map(r => ({
      value: r.month.toString(),
      label: MONTHS[r.month - 1]
    })).sort((a, b) => parseInt(a.value) - parseInt(b.value));
  };

  // Get available years for non-superadmins (only years with published reports for selected branch)
  const getAvailableYears = () => {
    if (isSuperadmin) {
      return years;
    }
    
    if (!selectedBranch) return [];
    
    const yearsWithPublished = [...new Set(
      publishedReports
        .filter(r => r.branch_id === selectedBranch)
        .map(r => r.year.toString())
    )].sort((a, b) => parseInt(b) - parseInt(a));
    
    return yearsWithPublished;
  };

  // Render editable row for revenue
  const renderRevenueEditableRow = (item: ProfitLossData) => {
    const isEditing = editingId === item.id;
    
    if (isEditing && editData) {
      const calculatedAmount = calculateRevenueAmount(editData.sales_amount, editData.discount_percentage, editData.cost_price, editData.quantity);
      return (
        <TableRow key={item.id} className="bg-blue-50 text-xs">
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.share_percentage}
              onChange={(e) => setEditData({ ...editData, share_percentage: e.target.value })}
              className="h-7 text-xs w-14"
              min="0"
              max="100"
            />
          </TableCell>
          <TableCell className="py-1">
            <SearchableCategorySelect
              value={editData.subcategory}
              onValueChange={(value) => setEditData({ ...editData, subcategory: value })}
              categories={revenueCategories}
              placeholder="Select category"
              searchPlaceholder="Search category..."
              onAddNew={() => setShowAddCategoryDialog('revenue')}
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="h-7 text-xs"
              placeholder="Description"
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.cost_price}
              onChange={(e) => setEditData({ ...editData, cost_price: e.target.value })}
              className="h-7 text-xs w-20"
              step="0.01"
              placeholder="0.00"
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.quantity}
              onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
              className="h-7 text-xs w-12"
              min="1"
              placeholder="1"
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.sales_amount}
              onChange={(e) => setEditData({ ...editData, sales_amount: e.target.value })}
              className="h-7 text-xs w-20"
              step="0.01"
              placeholder="0.00"
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.discount_percentage}
              onChange={(e) => setEditData({ ...editData, discount_percentage: e.target.value })}
              className="h-7 text-xs w-12"
              min="0"
              max="100"
              placeholder="0"
            />
          </TableCell>
          <TableCell className="text-right font-medium text-xs py-1">
            S${calculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="text-right font-medium text-emerald-700 text-xs py-1">
            S${(calculatedAmount * (parseFloat(editData.share_percentage) || 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
          {isSuperadmin && (
            <TableCell className="py-1">
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSaving} className="h-6 w-6 text-green-600 hover:text-green-700">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-6 w-6 text-gray-600 hover:text-gray-700">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    }

    return (
      <TableRow key={item.id || `temp-${item.subcategory}`} className="h-7">
        <TableCell className="text-right py-1">
          <Badge variant="secondary" className="text-[0.65rem] px-1.5 py-0">{item.share_percentage}%</Badge>
        </TableCell>
        <TableCell className="font-medium py-1">{item.subcategory}</TableCell>
        <TableCell className="text-gray-600 py-1">{item.description}</TableCell>
        <TableCell className="text-right text-gray-600 py-1">
          {item.cost_price ? `S$${item.cost_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </TableCell>
        <TableCell className="text-right text-gray-600 py-1">
          {item.quantity}
        </TableCell>
        <TableCell className="text-right text-gray-600 py-1">
          {item.sales_amount ? `S$${item.sales_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </TableCell>
        <TableCell className="text-right text-gray-600 py-1">
          {item.discount_percentage ? `${item.discount_percentage}%` : '-'}
        </TableCell>
        <TableCell className="text-right font-medium py-1">
          S${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-right font-medium text-emerald-700 py-1">
          S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        {isSuperadmin && (
          <TableCell className="py-1">
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-6 w-6" disabled={!item.id}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-6 w-6 text-red-600 hover:text-red-700" disabled={!item.id}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  };
  
  // Render editable row for expense
  const renderExpenseEditableRow = (item: ProfitLossData) => {
    const isEditing = editingId === item.id;
    
    if (isEditing && editData) {
      return (
        <TableRow key={item.id} className="bg-blue-50 text-xs">
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.share_percentage}
              onChange={(e) => setEditData({ ...editData, share_percentage: e.target.value })}
              className="h-7 text-xs w-14"
              min="0"
              max="100"
            />
          </TableCell>
          <TableCell className="pl-6 py-1">
            <SearchableCategorySelect
              value={editData.subcategory}
              onValueChange={(value) => setEditData({ ...editData, subcategory: value })}
              categories={expenseCategories}
              placeholder="Select category"
              searchPlaceholder="Search category..."
              onAddNew={() => setShowAddCategoryDialog('expense')}
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="h-7 text-xs"
              placeholder="Description"
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className="h-7 text-xs w-24"
              step="0.01"
            />
          </TableCell>
{/* Check if this is a claim item for display styling */}
          {(() => {
            const isClaim = editData.description?.toLowerCase().includes('claim') || editData.subcategory?.toLowerCase().includes('claim');
            const partnerShare = (parseFloat(editData.amount) || 0) * (parseFloat(editData.share_percentage) || 100) / 100;
            return (
              <TableCell className={`text-right font-medium text-xs py-1 ${isClaim ? 'text-emerald-700' : 'text-red-600'}`}>
                {isClaim ? '-' : ''}S${partnerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            );
          })()}
          {isSuperadmin && (
            <TableCell className="py-1">
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSaving} className="h-6 w-6 text-green-600 hover:text-green-700">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-6 w-6 text-gray-600 hover:text-gray-700">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    }

    // Claims are reimbursed to partners, so partner's share should be negative (shown as green)
    const isClaim = item.description?.toLowerCase().includes('claim') || item.subcategory?.toLowerCase().includes('claim');
    const partnerShare = item.amount * item.share_percentage / 100;
    
    return (
      <TableRow key={item.id || `temp-${item.subcategory}`} className="h-7">
        <TableCell className="text-right py-1">
          <Badge variant="secondary" className="text-[0.65rem] px-1.5 py-0">{item.share_percentage}%</Badge>
        </TableCell>
        <TableCell className="font-medium py-1">{item.subcategory}</TableCell>
        <TableCell className="text-gray-600 py-1">{item.description}</TableCell>
        <TableCell className="text-right font-medium py-1">
          S${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className={`text-right font-medium py-1 ${isClaim ? 'text-emerald-700' : 'text-red-600'}`}>
          {isClaim ? '-' : ''}S${partnerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        {isSuperadmin && (
          <TableCell className="py-1">
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-6 w-6" disabled={!item.id}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-6 w-6 text-red-600 hover:text-red-700" disabled={!item.id}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  };

  // Render add new row for revenue
  const renderRevenueAddRow = () => {
    if (isAdding !== 'revenue') return null;
    
    const calculatedAmount = calculateRevenueAmount(newEntryData.sales_amount, newEntryData.discount_percentage, newEntryData.cost_price, newEntryData.quantity);
    
    return (
      <TableRow className="bg-green-50 text-xs">
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.share_percentage}
            onChange={(e) => setNewEntryData({ ...newEntryData, share_percentage: e.target.value })}
            className="h-7 text-xs w-14"
            min="0"
            max="100"
          />
        </TableCell>
        <TableCell className="py-1">
          <SearchableCategorySelect
            value={newEntryData.subcategory}
            onValueChange={(value, category) => {
              // Auto-populate cost price from category default
              const defaultCostPrice = category?.default_cost_price?.toString() || '';
              setNewEntryData({ ...newEntryData, subcategory: value, cost_price: defaultCostPrice });
            }}
            categories={revenueCategories}
            placeholder="Select category"
            searchPlaceholder="Search category..."
            onAddNew={() => setShowAddCategoryDialog('revenue')}
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            value={newEntryData.description}
            onChange={(e) => setNewEntryData({ ...newEntryData, description: e.target.value })}
            className="h-7 text-xs"
            placeholder="Description"
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.cost_price}
            onChange={(e) => setNewEntryData({ ...newEntryData, cost_price: e.target.value })}
            className="h-7 text-xs w-20"
            step="0.01"
            placeholder="0.00"
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.quantity}
            onChange={(e) => setNewEntryData({ ...newEntryData, quantity: e.target.value })}
            className="h-7 text-xs w-12"
            min="1"
            placeholder="1"
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.sales_amount}
            onChange={(e) => setNewEntryData({ ...newEntryData, sales_amount: e.target.value })}
            className="h-7 text-xs w-20"
            step="0.01"
            placeholder="0.00"
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.discount_percentage}
            onChange={(e) => setNewEntryData({ ...newEntryData, discount_percentage: e.target.value })}
            className="h-7 text-xs w-12"
            min="0"
            max="100"
            placeholder="0"
          />
        </TableCell>
        <TableCell className="text-right font-medium text-xs py-1">
          S${calculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-right font-medium text-emerald-700 text-xs py-1">
          S${(calculatedAmount * (parseFloat(newEntryData.share_percentage) || 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="py-1">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleAddEntry('revenue')} disabled={isSaving} className="h-6 w-6 text-green-600 hover:text-green-700">
              <Check className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setIsAdding(null); setNewEntryData({ category: '', subcategory: '', cost_price: '', quantity: '1', sales_amount: '', discount_percentage: '0', description: '', amount: '', share_percentage: '100' }); }} className="h-6 w-6 text-gray-600 hover:text-gray-700">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  
  // Render add new row for expense
  const renderExpenseAddRow = () => {
    if (isAdding !== 'expense') return null;
    
    return (
      <TableRow className="bg-green-50 text-xs">
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.share_percentage}
            onChange={(e) => setNewEntryData({ ...newEntryData, share_percentage: e.target.value })}
            className="h-7 text-xs w-14"
            min="0"
            max="100"
          />
        </TableCell>
        <TableCell className="pl-6 py-1">
          <SearchableCategorySelect
            value={newEntryData.subcategory}
            onValueChange={(value) => setNewEntryData({ ...newEntryData, subcategory: value })}
            categories={expenseCategories}
            placeholder="Select category"
            searchPlaceholder="Search category..."
            onAddNew={() => setShowAddCategoryDialog('expense')}
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            value={newEntryData.description}
            onChange={(e) => setNewEntryData({ ...newEntryData, description: e.target.value })}
            className="h-7 text-xs"
            placeholder="Description"
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            value={newEntryData.amount}
            onChange={(e) => setNewEntryData({ ...newEntryData, amount: e.target.value })}
            className="h-7 text-xs w-24"
            step="0.01"
            placeholder="0.00"
          />
        </TableCell>
        {/* Check if this is a claim item for display styling */}
        {(() => {
          const isClaim = newEntryData.description?.toLowerCase().includes('claim') || newEntryData.subcategory?.toLowerCase().includes('claim');
          const partnerShare = (parseFloat(newEntryData.amount) || 0) * (parseFloat(newEntryData.share_percentage) || 100) / 100;
          return (
            <TableCell className={`text-right font-medium text-xs py-1 ${isClaim ? 'text-emerald-700' : 'text-red-600'}`}>
              {isClaim ? '-' : ''}S${partnerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </TableCell>
          );
        })()}
        <TableCell className="py-1">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleAddEntry('expense')} disabled={isSaving} className="h-6 w-6 text-green-600 hover:text-green-700">
              <Check className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setIsAdding(null); setNewEntryData({ category: '', subcategory: '', cost_price: '', quantity: '1', sales_amount: '', discount_percentage: '0', description: '', amount: '', share_percentage: '100' }); }} className="h-6 w-6 text-gray-600 hover:text-gray-700">
              <X className="w-3 h-3" />
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
          <div className="flex gap-2">
            {isSuperadmin && selectedBranch && (
              <Button 
                onClick={handlePublishToggle} 
                variant={isPublished ? "default" : "outline"}
                className={`gap-2 ${isPublished ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                disabled={isPublishing}
              >
                {isPublished ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Published
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish
                  </>
                )}
              </Button>
            )}
            {!isSuperadmin && isPublished && (
              <Badge variant="secondary" className="gap-1 px-3 py-2">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Published
              </Badge>
            )}
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
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
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={getAvailableMonths().length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={getAvailableMonths().length === 0 ? "No reports" : undefined} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths().map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-32">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={getAvailableYears().length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={getAvailableYears().length === 0 ? "No reports" : undefined} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedBranch && (isSuperadmin || isPublished) ? (
          <>
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowManageCategoriesDialog('revenue')} className="gap-1">
                          <Settings className="w-4 h-4" />
                          Categories
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startAddingEntry('revenue')} className="gap-1" disabled={isAdding !== null}>
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-[0.7rem]">
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-right w-14 py-1">Share %</TableHead>
                        <TableHead className="py-1">Category</TableHead>
                        <TableHead className="py-1">Description</TableHead>
                        <TableHead className="text-right py-1">Cost Price</TableHead>
                        <TableHead className="text-right py-1">Qty</TableHead>
                        <TableHead className="text-right py-1">Sales Amount</TableHead>
                        <TableHead className="text-right py-1">Discount %</TableHead>
                        <TableHead className="text-right py-1">Amount</TableHead>
                        <TableHead className="text-right py-1">Partner's Share</TableHead>
                        {isSuperadmin && <TableHead className="w-16 py-1"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitLossData
                        .filter(item => item.type === 'revenue')
                        .sort((a, b) => {
                          const aIndex = revenueCategories.findIndex(c => c.name === a.subcategory);
                          const bIndex = revenueCategories.findIndex(c => c.name === b.subcategory);
                          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                        })
                        .map((item) => renderRevenueEditableRow(item))}
                      {renderRevenueAddRow()}
                      <TableRow className="bg-emerald-50 font-bold">
                        <TableCell></TableCell>
                        <TableCell>Total Revenue</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowManageCategoriesDialog('expense')} className="gap-1">
                          <Settings className="w-4 h-4" />
                          Categories
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startAddingEntry('expense')} className="gap-1" disabled={isAdding !== null}>
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-[0.7rem]">
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-right w-14 py-1">Share %</TableHead>
                        <TableHead className="py-1">Category</TableHead>
                        <TableHead className="py-1">Description</TableHead>
                        <TableHead className="text-right py-1">Amount</TableHead>
                        <TableHead className="text-right py-1">Partner's Share</TableHead>
                        {isSuperadmin && <TableHead className="w-16 py-1"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedExpenses).flatMap(([category, items]) => 
                        items.map((item) => renderExpenseEditableRow(item))
                      )}
                      {renderExpenseAddRow()}
                      <TableRow className="bg-red-50 font-bold">
                        <TableCell></TableCell>
                        <TableCell>Total Expenses</TableCell>
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
                      Partner's share of Net {netProfit >= 0 ? 'Profit' : 'Loss'} for {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
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

          </>
        ) : !selectedBranch || (!isSuperadmin && getAvailableMonths().length === 0) ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {!selectedBranch ? 'Select a Branch' : 'No Published Reports'}
              </h3>
              <p className="text-gray-500">
                {!selectedBranch 
                  ? 'Please select a branch to view its profit and loss statement.'
                  : 'No published reports available for the selected branch.'}
              </p>
            </CardContent>
          </Card>
        ) : null}
        
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
        
        {/* Manage Categories Dialog */}
        <Dialog open={showManageCategoriesDialog !== null} onOpenChange={(open) => { 
          if (!open) {
            setShowManageCategoriesDialog(null);
            setEditingCategory(null);
            setNewCategoryName('');
          }
        }}>
          <DialogContent className="sm:max-w-lg bg-background">
            <DialogHeader>
              <DialogTitle>Manage {showManageCategoriesDialog === 'revenue' ? 'Revenue' : 'Expense'} Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Add new category */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter new category name"
                    className="flex-1"
                  />
                  {showManageCategoriesDialog === 'revenue' && (
                    <Input
                      type="number"
                      value={newCategoryCostPrice}
                      onChange={(e) => setNewCategoryCostPrice(e.target.value)}
                      placeholder="Cost Price"
                      className="w-28"
                      step="0.01"
                    />
                  )}
                  <Button onClick={handleAddCategory} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              
              {/* Categories list header */}
              {showManageCategoriesDialog === 'revenue' && (
                <div className="flex gap-2 px-3 py-2 text-sm font-medium text-gray-600 border-b">
                  <span className="flex-1">Category Name</span>
                  <span className="w-28 text-right">Cost Price</span>
                  <span className="w-20"></span>
                </div>
              )}
              
              {/* Categories list */}
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {((showManageCategoriesDialog === 'revenue' ? revenueCategories : expenseCategories) || []).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No categories added yet
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={(showManageCategoriesDialog === 'revenue' ? revenueCategories : expenseCategories).map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="divide-y">
                        {(showManageCategoriesDialog === 'revenue' ? revenueCategories : expenseCategories).map((category) => (
                          <SortableCategoryRow
                            key={category.id}
                            category={category}
                            isRevenue={showManageCategoriesDialog === 'revenue'}
                            editingCategory={editingCategory}
                            setEditingCategory={setEditingCategory}
                            onSaveEdit={() => handleSaveEditCategory(showManageCategoriesDialog!)}
                            onDelete={() => handleDeleteCategory(category.id, showManageCategoriesDialog!)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManageCategoriesDialog(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
};

export default BranchProfitLoss;
