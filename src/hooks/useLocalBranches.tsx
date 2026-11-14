import React, { useEffect, useMemo, useState } from 'react';
import { getVisitorCountry, normaliseCountry, VisitorCountry } from '@/utils/visitorCountry';

/** Filters a branch list to the visitor's country (by IP), with a "Show all branches" escape hatch. */
export function useLocalBranches<T>(list: T[], getCountry: (b: T) => string | null | undefined, selectedId?: string, getId?: (b: T) => string) {
  const [country, setCountry] = useState<VisitorCountry>(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { getVisitorCountry().then(setCountry); }, []);
  const visible = useMemo(() => {
    if (showAll || !country) return list;
    const f = list.filter((b) => normaliseCountry(getCountry(b)) === country || (getId && selectedId && getId(b) === selectedId));
    return f.length ? f : list;
  }, [list, country, showAll, selectedId]);
  const toggle = visible.length < list.length ? (
    <button type="button" className="text-xs text-primary underline" onClick={() => setShowAll(true)}>Show all branches</button>
  ) : null;
  return { visible, toggle };
}
