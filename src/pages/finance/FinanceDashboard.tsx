import React from 'react';
import { Link } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, Landmark, BarChart3, Banknote, Receipt, Activity, FileSpreadsheet } from 'lucide-react';

interface Tile {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
}

const TILES: Tile[] = [
  { to: '/finance/chart-of-accounts', title: 'Chart of Accounts', desc: 'Manage GL accounts (SG + AU)', icon: BookOpen, ready: true },
  { to: '/finance/journals',           title: 'Journals',           desc: 'View and post journal entries', icon: FileText, ready: true },
  { to: '/finance/general-ledger',     title: 'General Ledger',     desc: 'Account drill-down (posted entries)', icon: BookOpen, ready: true },
  { to: '/finance/backfill',           title: 'Accounting Backfill', desc: 'Scan historical records into the new ledger', icon: Activity, ready: true },
  { to: '/finance/branch-pl-live',     title: 'Branch P&L (Live)',  desc: 'Real-time branch profit & loss', icon: Activity, ready: false },
  { to: '/finance/reports/profit-loss',title: 'Profit & Loss',      desc: 'Country / branch / consolidated', icon: BarChart3, ready: false },
  { to: '/finance/reports/balance-sheet', title: 'Balance Sheet',   desc: 'As-at date, comparative', icon: FileSpreadsheet, ready: false },
  { to: '/finance/reports/gst-f5',     title: 'GST F5 (SG)',        desc: 'Singapore GST return', icon: Receipt, ready: false },
  { to: '/finance/reports/bas',        title: 'BAS (AU)',           desc: 'Australian Business Activity Statement', icon: Receipt, ready: false },
  { to: '/finance/bank-accounts',      title: 'Bank Accounts',      desc: 'Statements & reconciliation', icon: Landmark, ready: false },
  { to: '/finance/branch-sales-import',title: 'Branch Sales Import',desc: 'CSV import for off-system branches', icon: Banknote, ready: false },
];

const FinanceDashboard: React.FC = () => {
  return (
    <ResponsiveLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Accounting, tax reporting and financial statements for Singapore and Australia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            const inner = (
              <Card className={`h-full transition hover:shadow-md ${tile.ready ? 'cursor-pointer' : 'opacity-60'}`}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{tile.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{tile.desc}</p>
                  {!tile.ready && (
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Coming soon</p>
                  )}
                </CardContent>
              </Card>
            );
            return tile.ready ? (
              <Link key={tile.to} to={tile.to}>{inner}</Link>
            ) : (
              <div key={tile.to}>{inner}</div>
            );
          })}
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default FinanceDashboard;
