/**
 * Import Products Dialog
 * Allows CSV import of products with preview and validation
 */

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProductCategories } from '@/services/productService';

interface ParsedProduct {
  name: string;
  sku: string;
  description: string;
  category: string;
  base_price: string;
  tax_rate: string;
  is_service: string;
  is_lesson: string;
  session_count: string;
  min_belt_level: string;
  is_active: string;
  errors: string[];
}

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const EXPECTED_HEADERS = [
  'name', 'sku', 'description', 'category', 'base_price', 'tax_rate',
  'is_service', 'is_lesson', 'session_count', 'min_belt_level', 'is_active'
];

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const ImportProductsDialog: React.FC<ImportProductsDialogProps> = ({ open, onOpenChange, onImportComplete }) => {
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) {
      toast.error('CSV file must have a header row and at least one data row');
      return;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      toast.error(`Missing columns: ${missingHeaders.join(', ')}`);
      return;
    }

    // Load categories for validation
    const categories = await getProductCategories();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    const products: ParsedProduct[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const errors: string[] = [];
      if (!row.name) errors.push('Name is required');
      if (!row.sku) errors.push('SKU is required');
      if (!row.base_price || isNaN(Number(row.base_price))) errors.push('Valid base price is required');
      if (row.tax_rate && isNaN(Number(row.tax_rate))) errors.push('Tax rate must be a number');
      if (row.session_count && isNaN(Number(row.session_count))) errors.push('Session count must be a number');
      if (row.category && !categoryMap.has(row.category.toLowerCase())) {
        errors.push(`Category "${row.category}" not found`);
      }

      products.push({
        name: row.name || '',
        sku: row.sku || '',
        description: row.description || '',
        category: row.category || '',
        base_price: row.base_price || '',
        tax_rate: row.tax_rate || '',
        is_service: row.is_service || '',
        is_lesson: row.is_lesson || '',
        session_count: row.session_count || '',
        min_belt_level: row.min_belt_level || '',
        is_active: row.is_active || '',
        errors,
      });
    }

    setParsedProducts(products);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = parsedProducts.filter(p => p.errors.length === 0).length;
  const invalidCount = parsedProducts.filter(p => p.errors.length > 0).length;

  const handleImport = async () => {
    const validProducts = parsedProducts.filter(p => p.errors.length === 0);
    if (validProducts.length === 0) {
      toast.error('No valid products to import');
      return;
    }

    setImporting(true);
    try {
      const categories = await getProductCategories();
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

      const parseBool = (val: string) => {
        const v = val.toLowerCase().trim();
        return v === 'true' || v === 'yes' || v === '1';
      };

      const insertData = validProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        description: p.description || null,
        category_id: p.category ? categoryMap.get(p.category.toLowerCase()) || null : null,
        base_price: parseFloat(p.base_price),
        tax_rate: p.tax_rate ? parseFloat(p.tax_rate) : 0,
        is_service: parseBool(p.is_service),
        is_lesson: parseBool(p.is_lesson),
        session_count: p.session_count ? parseInt(p.session_count) : null,
        min_belt_level: p.min_belt_level || null,
        is_active: p.is_active ? parseBool(p.is_active) : true,
      }));

      const { error } = await supabase.from('products').insert(insertData);
      if (error) throw error;

      toast.success(`Successfully imported ${validProducts.length} product(s)`);
      setParsedProducts([]);
      setFileName('');
      onImportComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedProducts([]);
    setFileName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Products from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <FileText className="w-4 h-4 mr-2" />
              {fileName || 'Select CSV File'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            {parsedProducts.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {invalidCount} errors
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Preview Table */}
          {parsedProducts.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Lesson</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedProducts.map((product, idx) => (
                      <TableRow key={idx} className={product.errors.length > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell className="text-sm">{product.category || '-'}</TableCell>
                        <TableCell>${product.base_price}</TableCell>
                        <TableCell>{product.tax_rate || '0'}%</TableCell>
                        <TableCell>{product.is_service?.toLowerCase() === 'true' || product.is_service === '1' ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{product.is_lesson?.toLowerCase() === 'true' || product.is_lesson === '1' ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          {product.errors.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 cursor-help">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Error
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="text-xs space-y-1">
                                  {product.errors.map((e, i) => <li key={i}>• {e}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Valid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || validCount === 0}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validCount} Product(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportProductsDialog;
