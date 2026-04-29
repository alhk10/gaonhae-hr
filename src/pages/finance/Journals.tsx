import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Search } from 'lucide-react';
import { listJournals, type Country, type JournalEntry, type JournalStatus } from '@/services/accountingService';
import { formatDate } from '@/utils/dateFormat';
import { toast } from 'sonner';

const Journals: React.FC = () => {
  const [country, setCountry] = useState<Country>('Singapore');
  const [status, setStatus] = useState<'all' | JournalStatus>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listJournals({
        country,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
        limit: 200,
      });
      setItems(data);
    } catch (e) {
      toast.error(`Failed to load journals: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [country, status]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(j =>
      (j.entry_number || '').toLowerCase().includes(s)
      || (j.narration || '').toLowerCase().includes(s)
      || (j.reference || '').toLowerCase().includes(s)
    );
  }, [items, search]);

  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Journal Entries</h1>
            <p className="text-sm text-muted-foreground">General Ledger transactions across all sources.</p>
          </div>
          <Button asChild>
            <Link to="/finance/journals/new"><Plus className="h-4 w-4 mr-1" />New Journal</Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Singapore">Singapore</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as 'all' | JournalStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
            <div className="sm:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search number / narration / reference"
                       value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Entries</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Number</th>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Branch</th>
                    <th className="text-left p-2">Narration</th>
                    <th className="text-left p-2">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      No journals yet for this filter.
                    </td></tr>
                  )}
                  {filtered.map(j => (
                    <tr key={j.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap">{formatDate(j.entry_date)}</td>
                      <td className="p-2 font-mono text-xs">{j.entry_number || '—'}</td>
                      <td className="p-2 capitalize">{j.source_type}</td>
                      <td className="p-2 text-xs">{j.branch_id || '—'}</td>
                      <td className="p-2 max-w-[320px] truncate" title={j.narration || ''}>{j.narration || '—'}</td>
                      <td className="p-2">
                        <Badge variant={
                          j.status === 'posted' ? 'default'
                          : j.status === 'void' ? 'secondary'
                          : 'outline'}>{j.status}</Badge>
                      </td>
                      <td className="p-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/finance/journals/${j.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default Journals;
