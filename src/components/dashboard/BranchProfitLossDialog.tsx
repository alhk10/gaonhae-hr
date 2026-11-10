import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Calendar, Download, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDate } from '@/utils/dateFormat';

interface Branch {
  id: string;
  name: string;
}

interface PartnerBranchShare {
  branch_id: string;
  share_percentage: number;
  branch?: Branch;
}

interface PublishedReport {
  branch_id: string;
  month: number;
  year: number;
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

interface BranchProfitLossDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const BranchProfitLossDialog: React.FC<BranchProfitLossDialogProps> = ({
  open,
  onOpenChange,
  employeeId
}) => {
  const isMobile = useIsMobile();
  const [partnerShares, setPartnerShares] = useState<PartnerBranchShare[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [publishedReports, setPublishedReports] = useState<PublishedReport[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<{ month: number; year: number } | null>(null);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (open && employeeId) {
      loadInitialData();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (selectedBranch && selectedReport) {
      loadPLData();
    }
  }, [selectedBranch, selectedReport]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      
      if (!branchError && branchData) {
        setBranches(branchData);
      }

      // Load partner branch shares for this employee
      const { data: sharesData, error: sharesError } = await supabase
        .from('partner_branch_shares')
        .select('branch_id, share_percentage')
        .eq('employee_id', employeeId)
        .is('effective_to', null);
      
      if (!sharesError && sharesData && branchData) {
        const sharesWithBranches = sharesData.map(share => ({
          ...share,
          branch: branchData.find(b => b.id === share.branch_id)
        }));
        setPartnerShares(sharesWithBranches);

        // Load published reports for partner's branches
        if (sharesData.length > 0) {
          const branchIds = sharesData.map(s => s.branch_id);
          const { data: publishedData } = await supabase
            .from('published_pl_reports')
            .select('branch_id, month, year')
            .in('branch_id', branchIds)
            .order('year', { ascending: false })
            .order('month', { ascending: false });
          
          if (publishedData) {
            setPublishedReports(publishedData);
            
            // Auto-select first branch with published reports
            if (publishedData.length > 0) {
              const firstReport = publishedData[0];
              setSelectedBranch(firstReport.branch_id);
              setSelectedReport({ month: firstReport.month, year: firstReport.year });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPLData = async () => {
    if (!selectedBranch || !selectedReport) return;

    try {
      const { data, error } = await supabase
        .from('branch_profit_loss_entries')
        .select('*')
        .eq('branch_id', selectedBranch)
        .eq('month', selectedReport.month)
        .eq('year', selectedReport.year);

      if (error) {
        console.error('Error loading P&L data:', error);
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
    } catch (error) {
      console.error('Error loading P&L data:', error);
    }
  };

  const getPartnerShare = (branchId: string) => {
    const share = partnerShares.find(s => s.branch_id === branchId);
    return share?.share_percentage || 100;
  };

  const calculateTotals = () => {
    const totalRevenue = profitLossData
      .filter(item => item.type === 'revenue')
      .reduce((sum, item) => sum + (item.amount * item.share_percentage / 100), 0);
    
    const totalExpenses = profitLossData
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + (item.amount * item.share_percentage / 100), 0);
    
    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    };
  };

  const getAvailableMonths = () => {
    if (!selectedBranch) return [];
    return publishedReports
      .filter(r => r.branch_id === selectedBranch)
      .map(r => ({ month: r.month, year: r.year, label: `${MONTHS[r.month - 1]} ${r.year}` }));
  };

  const handleDownloadPDF = async () => {
    if (!selectedBranch || !selectedReport) return;
    
    setIsDownloading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      let yPos = 15;

      const formatCurrency = (amount: number) => 
        `S$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Add logo
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
      const branchName = branches.find(b => b.id === selectedBranch)?.name || 'Branch';
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Branch: ${branchName}`, margin, yPos);
      doc.text(`Period: ${MONTHS[selectedReport.month - 1]} ${selectedReport.year}`, margin + 80, yPos);
      
      yPos += 10;

      const { totalRevenue, totalExpenses, netProfit } = calculateTotals();

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
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Partner's Share of Net Profit: ${formatCurrency(netProfit)}`, margin, yPos);
      
      yPos += 10;

      // Revenue Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('Revenue', margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      // Revenue table header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const revenueHeaders = ['Category', 'Description', 'Amount', "Partner's Share"];
      const revColWidths = [50, 50, 40, 40];
      let xPos = margin;
      revenueHeaders.forEach((header, i) => {
        doc.text(header, xPos, yPos);
        xPos += revColWidths[i];
      });
      yPos += 4;

      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;

      // Revenue entries
      doc.setFont('helvetica', 'normal');
      const revenueEntries = profitLossData.filter(item => item.type === 'revenue');
      
      revenueEntries.forEach(item => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        xPos = margin;
        doc.text(item.subcategory.substring(0, 25), xPos, yPos);
        xPos += revColWidths[0];
        doc.text((item.description || '-').substring(0, 25), xPos, yPos);
        xPos += revColWidths[1];
        doc.text(formatCurrency(item.amount), xPos, yPos);
        xPos += revColWidths[2];
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
      doc.setTextColor(239, 68, 68);
      doc.text('Expenses', margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      // Expense table header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const expenseHeaders = ['Category', 'Description', 'Amount', "Partner's Share"];
      const expColWidths = [50, 50, 40, 40];
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
        doc.text((item.description || '-').substring(0, 25), xPos, yPos);
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
      doc.text(`Generated on ${formatDate(new Date())} at ${new Date().toLocaleTimeString()}`, margin, pageHeight - 10);

      // Save PDF
      const filename = `PL_${branchName.replace(/\s+/g, '_')}_${MONTHS[selectedReport.month - 1]}_${selectedReport.year}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const { totalRevenue, totalExpenses, netProfit } = calculateTotals();
  const partnerBranches = partnerShares.filter(s => s.branch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-2xl max-h-[85vh]'} p-0 overflow-hidden`}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Branch Profit & Loss
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-80px)]">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : partnerBranches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No branch shares found</p>
              </div>
            ) : publishedReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No published reports available</p>
              </div>
            ) : (
              <>
                {/* Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Branch
                    </label>
                    <Select value={selectedBranch} onValueChange={(value) => {
                      setSelectedBranch(value);
                      const firstReportForBranch = publishedReports.find(r => r.branch_id === value);
                      if (firstReportForBranch) {
                        setSelectedReport({ month: firstReportForBranch.month, year: firstReportForBranch.year });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerBranches.map((share) => (
                          <SelectItem key={share.branch_id} value={share.branch_id}>
                            {share.branch?.name} ({share.share_percentage}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Period
                    </label>
                    <Select 
                      value={selectedReport ? `${selectedReport.month}-${selectedReport.year}` : ''} 
                      onValueChange={(value) => {
                        const [month, year] = value.split('-').map(Number);
                        setSelectedReport({ month, year });
                      }}
                      disabled={!selectedBranch}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableMonths().map((item) => (
                          <SelectItem key={`${item.month}-${item.year}`} value={`${item.month}-${item.year}`}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Summary Cards */}
                {selectedBranch && selectedReport && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Card className="bg-emerald-50 border-emerald-100">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-medium">Revenue</span>
                          </div>
                          <p className={`font-bold text-emerald-800 ${isMobile ? 'text-sm' : 'text-lg'} mt-1`}>
                            S${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-red-50 border-red-100">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-700 font-medium">Expenses</span>
                          </div>
                          <p className={`font-bold text-red-800 ${isMobile ? 'text-sm' : 'text-lg'} mt-1`}>
                            S${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className={`${netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                            <span className={`text-xs font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Profit</span>
                          </div>
                          <p className={`font-bold ${netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'} ${isMobile ? 'text-sm' : 'text-lg'} mt-1`}>
                            S${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Download Button */}
                    <Button 
                      className="w-full" 
                      onClick={handleDownloadPDF}
                      disabled={isDownloading || profitLossData.length === 0}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Download PDF Report
                    </Button>

                    {/* Entry Details */}
                    {profitLossData.length > 0 && (
                      <div className="space-y-3">
                        {/* Revenue Entries */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium text-sm">Revenue Items</span>
                            <Badge variant="secondary" className="text-xs">
                              {profitLossData.filter(i => i.type === 'revenue').length}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {profitLossData
                              .filter(item => item.type === 'revenue')
                              .map((item, idx) => (
                                <div key={item.id || idx} className="flex justify-between items-center p-2 bg-emerald-50/50 rounded text-sm">
                                  <div>
                                    <span className="font-medium">{item.subcategory}</span>
                                    {item.description && (
                                      <span className="text-muted-foreground ml-1">- {item.description}</span>
                                    )}
                                  </div>
                                  <span className="font-medium text-emerald-700">
                                    S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Expense Entries */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-sm">Expense Items</span>
                            <Badge variant="secondary" className="text-xs">
                              {profitLossData.filter(i => i.type === 'expense').length}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {profitLossData
                              .filter(item => item.type === 'expense')
                              .map((item, idx) => (
                                <div key={item.id || idx} className="flex justify-between items-center p-2 bg-red-50/50 rounded text-sm">
                                  <div>
                                    <span className="font-medium">{item.subcategory}</span>
                                    {item.description && (
                                      <span className="text-muted-foreground ml-1">- {item.description}</span>
                                    )}
                                  </div>
                                  <span className="font-medium text-red-700">
                                    S${(item.amount * item.share_percentage / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BranchProfitLossDialog;
