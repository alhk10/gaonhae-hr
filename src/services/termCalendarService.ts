import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TermBreak {
  id: string;
  term_id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Term {
  id: string;
  branch_id: string;
  name: string;
  start_date: string;
  end_date: string;
  year?: number;
  term_number?: number;
  grace_days: number;
  total_weeks?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  breaks?: TermBreak[];
  // Joined fields
  branch_name?: string;
}

export interface CreateTermData {
  branch_id: string;
  name: string;
  start_date: string;
  end_date: string;
  year?: number;
  term_number?: number;
  grace_days?: number;
  total_weeks?: number;
  is_active?: boolean;
}

export interface CreateTermBreakData {
  term_id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
}

// Calculate teaching weeks excluding breaks
export function calculateTeachingWeeks(
  startDate: string,
  endDate: string,
  breaks: TermBreak[] = []
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Total days in term
  let totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Subtract break days
  for (const brk of breaks) {
    const breakStart = new Date(brk.start_date);
    const breakEnd = new Date(brk.end_date);
    const breakDays = Math.ceil((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    totalDays -= breakDays;
  }
  
  // Convert to weeks (round to nearest)
  return Math.round(totalDays / 7);
}

// Calculate remaining teaching weeks from today until term end, excluding breaks
export function calculateRemainingTeachingWeeks(
  termEndDate: string,
  breaks: TermBreak[] = []
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(termEndDate);
  
  // If term has ended, return 0
  if (today > end) return 0;
  
  // Total days from today to term end
  let totalDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Subtract break days that are in the future
  for (const brk of breaks) {
    const breakStart = new Date(brk.start_date);
    const breakEnd = new Date(brk.end_date);
    
    // Only count breaks that haven't passed yet
    if (breakEnd >= today) {
      const effectiveBreakStart = breakStart < today ? today : breakStart;
      const breakDays = Math.ceil((breakEnd.getTime() - effectiveBreakStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays -= breakDays;
    }
  }
  
  // Convert to weeks (round to nearest, minimum 1 if there are remaining days)
  const weeks = Math.round(totalDays / 7);
  return weeks > 0 ? weeks : (totalDays > 0 ? 1 : 0);
}

// Check if we are currently inside a term
export function isInsideTerm(term: Term): boolean {
  const today = new Date().toISOString().split('T')[0];
  return term.start_date <= today && term.end_date >= today;
}

// Get validity end date (term end + grace days)
export function getValidityEndDate(term: Term): Date {
  const endDate = new Date(term.end_date);
  endDate.setDate(endDate.getDate() + (term.grace_days || 7));
  return endDate;
}

// Get all terms with optional filters
export async function getTerms(
  branchId?: string,
  year?: number
): Promise<Term[]> {
  try {
    let query = supabase
      .from('term_calendars')
      .select('*')
      .order('year', { ascending: false, nullsFirst: false })
      .order('term_number', { ascending: true, nullsFirst: false })
      .order('start_date', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;

    if (error) throw error;

    const termData = data || [];
    
    // Fetch branch names separately
    const branchIds = [...new Set(termData.map(t => t.branch_id))];
    let branchMap: Record<string, string> = {};
    
    if (branchIds.length > 0) {
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      
      branchMap = (branchesData || []).reduce((acc, b) => {
        acc[b.id] = b.name;
        return acc;
      }, {} as Record<string, string>);
    }

    // Fetch breaks for all terms
    const termIds = termData.map(t => t.id);
    let breaks: TermBreak[] = [];
    
    if (termIds.length > 0) {
      const { data: breaksData, error: breaksError } = await supabase
        .from('term_breaks')
        .select('*')
        .in('term_id', termIds)
        .order('start_date');
      
      if (breaksError) {
        logger.warn('Failed to fetch term breaks', breaksError);
      } else {
        breaks = breaksData || [];
      }
    }

    return termData.map(term => ({
      ...term,
      branch_name: branchMap[term.branch_id] || term.branch_id,
      grace_days: term.grace_days ?? 7,
      breaks: breaks.filter(b => b.term_id === term.id)
    }));
  } catch (error) {
    logger.error('Failed to fetch terms', error);
    throw error;
  }
}

// Get a single term by ID
export async function getTerm(termId: string): Promise<Term | null> {
  try {
    const { data, error } = await supabase
      .from('term_calendars')
      .select('*')
      .eq('id', termId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Fetch branch name
    const { data: branchData } = await supabase
      .from('branches')
      .select('name')
      .eq('id', data.branch_id)
      .maybeSingle();

    // Fetch breaks
    const { data: breaks } = await supabase
      .from('term_breaks')
      .select('*')
      .eq('term_id', termId)
      .order('start_date');

    return {
      ...data,
      branch_name: branchData?.name || data.branch_id,
      grace_days: data.grace_days ?? 7,
      breaks: breaks || []
    };
  } catch (error) {
    logger.error('Failed to fetch term', error);
    throw error;
  }
}

// Create a new term
export async function createTerm(data: CreateTermData): Promise<string> {
  try {
    const { data: result, error } = await supabase
      .from('term_calendars')
      .insert({
        branch_id: data.branch_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        year: data.year,
        term_number: data.term_number,
        grace_days: data.grace_days ?? 7,
        total_weeks: data.total_weeks,
        is_active: data.is_active ?? true
      })
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  } catch (error) {
    logger.error('Failed to create term', error);
    throw error;
  }
}

// Update a term
export async function updateTerm(
  termId: string,
  data: Partial<CreateTermData>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('term_calendars')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', termId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update term', error);
    throw error;
  }
}

// Delete a term
export async function deleteTerm(termId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('term_calendars')
      .delete()
      .eq('id', termId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete term', error);
    throw error;
  }
}

// Add a break to a term
export async function addTermBreak(data: CreateTermBreakData): Promise<string> {
  try {
    const { data: result, error } = await supabase
      .from('term_breaks')
      .insert({
        term_id: data.term_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description
      })
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  } catch (error) {
    logger.error('Failed to add term break', error);
    throw error;
  }
}

// Update a term break
export async function updateTermBreak(
  breakId: string,
  data: Partial<Omit<CreateTermBreakData, 'term_id'>>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('term_breaks')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', breakId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update term break', error);
    throw error;
  }
}

// Delete a term break
export async function deleteTermBreak(breakId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('term_breaks')
      .delete()
      .eq('id', breakId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to delete term break', error);
    throw error;
  }
}

// Get current term for a branch
export async function getCurrentTerm(branchId: string): Promise<Term | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('term_calendars')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Fetch branch name
    const { data: branchData } = await supabase
      .from('branches')
      .select('name')
      .eq('id', data.branch_id)
      .maybeSingle();

    const { data: breaks } = await supabase
      .from('term_breaks')
      .select('*')
      .eq('term_id', data.id)
      .order('start_date');

    return {
      ...data,
      branch_name: branchData?.name || data.branch_id,
      grace_days: data.grace_days ?? 7,
      breaks: breaks || []
    };
  } catch (error) {
    logger.error('Failed to get current term', error);
    return null;
  }
}

// Get upcoming/current terms for product selection
export async function getActiveTermsForSelection(): Promise<Term[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('term_calendars')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', today)
      .order('branch_id')
      .order('start_date');

    if (error) throw error;

    const termData = data || [];
    
    // Fetch branch names
    const branchIds = [...new Set(termData.map(t => t.branch_id))];
    let branchMap: Record<string, string> = {};
    
    if (branchIds.length > 0) {
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      
      branchMap = (branchesData || []).reduce((acc, b) => {
        acc[b.id] = b.name;
        return acc;
      }, {} as Record<string, string>);
    }

    // Fetch term breaks for all terms
    const termIds = termData.map(t => t.id);
    let breaks: TermBreak[] = [];
    
    if (termIds.length > 0) {
      const { data: breaksData, error: breaksError } = await supabase
        .from('term_breaks')
        .select('*')
        .in('term_id', termIds)
        .order('start_date');
      
      if (breaksError) {
        logger.warn('Failed to fetch term breaks for selection', breaksError);
      } else {
        breaks = breaksData || [];
      }
    }

    return termData.map(term => ({
      ...term,
      branch_name: branchMap[term.branch_id] || term.branch_id,
      grace_days: term.grace_days ?? 7,
      breaks: breaks.filter(b => b.term_id === term.id)
    }));
  } catch (error) {
    logger.error('Failed to get active terms for selection', error);
    return [];
  }
}

// Get available years for filter
export async function getTermYears(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('term_calendars')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false });

    if (error) throw error;

    const years = [...new Set((data || []).map(t => t.year).filter(Boolean))] as number[];
    return years;
  } catch (error) {
    logger.error('Failed to get term years', error);
    return [];
  }
}
