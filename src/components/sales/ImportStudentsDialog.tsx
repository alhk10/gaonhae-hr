import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { createStudent, CreateStudentData } from '@/services/studentService';
import { useBranches } from '@/hooks/useBranches';

// Parse DD-MM-YYYY to YYYY-MM-DD for database storage
const parseDateValue = (value: string): string => {
  const trimmed = value.trim();
  // DD-MM-YYYY or DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (match) {
    let [, part1, part2, yyyy] = match;
    let dd = part1, mm = part2;
    // If mm > 12, assume parts are swapped (MM/DD/YYYY format)
    if (parseInt(mm) > 12 && parseInt(dd) <= 12) {
      [dd, mm] = [mm, dd];
    }
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // Already YYYY-MM-DD
  return trimmed;
};

const CSV_COLUMNS = [
  'first_name', 'last_name', 'preferred_name', 'certificate_name', 'display_name',
  'date_of_birth', 'gender', 'nationality', 'languages_spoken',
  'nric_passport', 'email', 'phone', 'whatsapp', 'address', 'postal_code',
  'branch_id', 'current_belt', 'previous_experience', 'training_goals',
  'referral_source', 'registered_date',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'emergency_contact_2_name', 'emergency_contact_2_phone', 'emergency_contact_2_relationship',
  'medical_conditions', 'dietary_restrictions', 'notes'
];

interface ParsedRow {
  data: Record<string, string>;
  rowIndex: number;
  errors: string[];
}

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        current = '';
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  // Last row
  row.push(current.trim());
  if (row.some(cell => cell !== '')) rows.push(row);

  return rows;
}

function validateRow(data: Record<string, string>, rowIndex: number): ParsedRow {
  const errors: string[] = [];
  if (!data.first_name) {
    errors.push('first_name is required');
  }
  if (data.date_of_birth && !/^(\d{1,2}-\d{1,2}-\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})$/.test(data.date_of_birth.trim())) {
    errors.push('date_of_birth must be DD-MM-YYYY');
  }
  return { data, rowIndex, errors };
}

const ImportStudentsDialog: React.FC<ImportStudentsDialogProps> = ({
  open, onOpenChange, onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { branches } = useBranches();

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const errorRows = parsedRows.filter(r => r.errors.length > 0);

  const handleDownloadTemplate = () => {
    const sampleRow = [
      'JOHN', 'DOE', 'JOHNNY', 'JOHN DOE', 'JOHN DOE',
      '15-03-2015', 'Male', 'Singaporean;Brazilian', 'English;Mandarin',
      'S1234567A', 'john@example.com', '91234567', '91234567', '123 EXAMPLE STREET', '123456',
      'Balmoral', 'White', '', '',
      'Walk-in', '15-01-2026',
      'JANE DOE', '98765432', 'Mother',
      '', '', '',
      'None', 'None', 'Sample student'
    ];
    const csv = CSV_COLUMNS.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        setParsedRows([]);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
      const dataRows = rows.slice(1).map((row, idx) => {
        const record: Record<string, string> = {};
        headers.forEach((header, i) => {
          record[header] = row[i] || '';
        });
        return validateRow(record, idx + 2); // +2 for 1-indexed + header
      });

      setParsedRows(dataRows);
    };
    reader.readAsText(selected);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      // Simulate file input change
      const dt = new DataTransfer();
      dt.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      toast.error('Please upload a .csv file');
    }
  }, []);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      try {
        const row = validRows[i].data;
        const studentData: CreateStudentData = {
          first_name: row.first_name,
          last_name: row.last_name || '',
          preferred_name: row.preferred_name || undefined,
          certificate_name: row.certificate_name || row.first_name,
          display_name: row.display_name || row.first_name,
          date_of_birth: row.date_of_birth ? parseDateValue(row.date_of_birth) : undefined,
          gender: row.gender ? row.gender.trim().toLowerCase() : undefined,
          nationality: row.nationality ? row.nationality.split(';').map(n => n.trim()).filter(Boolean) : undefined,
          languages_spoken: row.languages_spoken ? row.languages_spoken.split(';').map(l => l.trim()).filter(Boolean) : undefined,
          nric_passport: row.nric_passport || undefined,
          email: row.email || undefined,
          phone: normalizeStoredPhone(row.phone) || undefined,
          address: row.address || undefined,
          postal_code: row.postal_code || undefined,
          branch_id: row.branch_id ? (branches.find(b => b.name.toLowerCase() === row.branch_id.trim().toLowerCase())?.id || row.branch_id) : undefined,
          current_belt: row.current_belt ? (() => {
            const validBelts = [
              'Foundation 1', 'Foundation 2', 'Foundation 3',
              'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
              'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
              '1st Poom', '1st Dan', '2nd Poom', '2nd Dan',
              '3rd Poom', '3rd Dan', '4th Poom', '4th Dan', '5th Dan'
            ];
            const belt = row.current_belt.trim();
            return validBelts.includes(belt) ? belt : undefined;
          })() : undefined,
          previous_experience: row.previous_experience || undefined,
          training_goals: row.training_goals || undefined,
          referral_source: row.referral_source || undefined,
          registered_date: row.registered_date ? parseDateValue(row.registered_date) : undefined,
          emergency_contact_name: row.emergency_contact_name || undefined,
          emergency_contact_phone: normalizeStoredPhone(row.emergency_contact_phone) || undefined,
          emergency_contact_relationship: row.emergency_contact_relationship || undefined,
          emergency_contact_2_name: row.emergency_contact_2_name || undefined,
          emergency_contact_2_phone: normalizeStoredPhone(row.emergency_contact_2_phone) || undefined,
          emergency_contact_2_relationship: row.emergency_contact_2_relationship || undefined,
          medical_conditions: row.medical_conditions || undefined,
          dietary_restrictions: row.dietary_restrictions || undefined,
          notes: row.notes || undefined,
          status: 'active',
        };
        await createStudent(studentData);
        success++;
      } catch {
        failed++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    setImportResults({ success, failed });
    if (success > 0) {
      toast.success(`Imported ${success} student${success !== 1 ? 's' : ''} successfully${failed > 0 ? `, ${failed} failed` : ''}`);
      onImportComplete();
    } else {
      toast.error(`Import failed for all ${failed} rows`);
    }
  };

  const handleClose = (open: boolean) => {
    if (!importing) {
      setFile(null);
      setParsedRows([]);
      setProgress(0);
      setImportResults(null);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Step 1: Download CSV Template</p>
            <p className="text-xs text-muted-foreground">
              Download the template, fill in student data, then upload below.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload CSV */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Step 2: Upload CSV File</p>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click or drag & drop a .csv file'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview Summary */}
          {parsedRows.length > 0 && !importResults && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Preview</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {parsedRows.length} rows found
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {errorRows.length} errors
                  </span>
                )}
              </div>

              {/* Preview Data Table */}
              <div className="max-h-64 overflow-auto border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-10">#</TableHead>
                      <TableHead className="text-xs">First Name</TableHead>
                      <TableHead className="text-xs">Last Name</TableHead>
                      <TableHead className="text-xs">Preferred</TableHead>
                      <TableHead className="text-xs">DOB</TableHead>
                      <TableHead className="text-xs">Gender</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Belt</TableHead>
                      <TableHead className="text-xs">Branch</TableHead>
                      <TableHead className="text-xs">Emergency Contact</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...parsedRows]
                      .sort((a, b) => a.rowIndex - b.rowIndex)
                      .map((row) => (
                        <TableRow
                          key={row.rowIndex}
                          className={row.errors.length > 0 ? 'bg-destructive/10' : ''}
                        >
                          <TableCell className="text-xs py-1.5">{row.rowIndex}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.first_name || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.last_name || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.preferred_name || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.date_of_birth || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.gender || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.email || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.phone || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.current_belt || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.branch_id || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.data.emergency_contact_name || '-'}</TableCell>
                          <TableCell className="text-xs py-1.5">
                            {row.errors.length > 0 ? (
                              <span className="text-destructive font-medium" title={row.errors.join(', ')}>Error</span>
                            ) : (
                              <span className="text-primary font-medium">Valid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {errorRows.length > 0 && (
                <div className="max-h-24 overflow-y-auto text-xs text-destructive space-y-1">
                  {errorRows.map((r) => (
                    <p key={r.rowIndex}>Row {r.rowIndex}: {r.errors.join(', ')}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">Importing... {progress}%</p>
            </div>
          )}

          {/* Results */}
          {importResults && (
            <div className="border border-border rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">Import Complete</p>
              <p className="text-primary">{importResults.success} imported successfully</p>
              {importResults.failed > 0 && (
                <p className="text-destructive">{importResults.failed} failed</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            {importResults ? 'Close' : 'Cancel'}
          </Button>
          {!importResults && (
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
            >
              {importing ? 'Importing...' : `Import ${validRows.length} Student${validRows.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStudentsDialog;
