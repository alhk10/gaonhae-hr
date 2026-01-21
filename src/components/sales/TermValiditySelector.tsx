import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { Term, getActiveTermsForSelection, getValidityEndDate } from '@/services/termCalendarService';

interface TermValiditySelectorProps {
  validityType: 'months' | 'term';
  validityMonths: number;
  termId: string | null;
  onValidityTypeChange: (type: 'months' | 'term') => void;
  onValidityMonthsChange: (months: number) => void;
  onTermIdChange: (termId: string | null) => void;
}

export function TermValiditySelector({
  validityType,
  validityMonths,
  termId,
  onValidityTypeChange,
  onValidityMonthsChange,
  onTermIdChange
}: TermValiditySelectorProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);

  useEffect(() => {
    loadTerms();
  }, []);

  useEffect(() => {
    if (termId && terms.length > 0) {
      const term = terms.find(t => t.id === termId);
      setSelectedTerm(term || null);
    } else {
      setSelectedTerm(null);
    }
  }, [termId, terms]);

  const loadTerms = async () => {
    setLoading(true);
    try {
      const data = await getActiveTermsForSelection();
      setTerms(data);
    } catch (error) {
      console.error('Failed to load terms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group terms by branch
  const groupedTerms = terms.reduce((acc, term) => {
    const branchName = term.branch_name || term.branch_id;
    if (!acc[branchName]) {
      acc[branchName] = [];
    }
    acc[branchName].push(term);
    return acc;
  }, {} as Record<string, Term[]>);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={validityType}
        onValueChange={(value) => onValidityTypeChange(value as 'months' | 'term')}
        className="space-y-3"
      >
        {/* By Months Option */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="months" id="validity-months" className="mt-1" />
          <div className="flex-1 space-y-2">
            <Label htmlFor="validity-months" className="text-sm font-medium cursor-pointer">
              By Duration (months)
            </Label>
            {validityType === 'months' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={validityMonths || ''}
                  onChange={(e) => onValidityMonthsChange(parseInt(e.target.value) || 0)}
                  placeholder="12"
                  className="w-24 h-8"
                />
                <span className="text-sm text-muted-foreground">months from purchase</span>
              </div>
            )}
          </div>
        </div>

        {/* By Term Option */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="term" id="validity-term" className="mt-1" />
          <div className="flex-1 space-y-2">
            <Label htmlFor="validity-term" className="text-sm font-medium cursor-pointer">
              By Academic Term
            </Label>
            {validityType === 'term' && (
              <div className="space-y-2">
                <Select 
                  value={termId || ''} 
                  onValueChange={(value) => onTermIdChange(value || null)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={loading ? "Loading terms..." : "Select a term"} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedTerms).map(([branchName, branchTerms]) => (
                      <div key={branchName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {branchName}
                        </div>
                        {branchTerms.map(term => (
                          <SelectItem key={term.id} value={term.id}>
                            <div className="flex items-center gap-2">
                              <span>{term.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({formatDate(term.start_date)} – {formatDate(term.end_date)})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    {terms.length === 0 && !loading && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                        No active terms available.
                        <br />
                        <span className="text-xs">Configure terms in Settings → Terms</span>
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {/* Selected Term Info */}
                {selectedTerm && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedTerm.branch_name}
                      </Badge>
                      <span className="font-medium">{selectedTerm.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(selectedTerm.start_date)} – {formatDate(selectedTerm.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedTerm.total_weeks || '?'} weeks
                      </span>
                    </div>
                    <div className="text-xs font-medium text-primary">
                      Valid until: {format(getValidityEndDate(selectedTerm), 'd MMM yyyy')}
                      <span className="font-normal text-muted-foreground ml-1">
                        (+{selectedTerm.grace_days} days grace)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
