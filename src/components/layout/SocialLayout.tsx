import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Share2 } from 'lucide-react';
import Sidebar from './Sidebar';

interface SocialLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const labelFor = (path: string) => {
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    create: 'Create Post',
    scheduled: 'Scheduled Posts',
    calendar: 'Content Calendar',
    brand: 'Brand Settings',
    analytics: 'Analytics',
    suggestions: 'AI Suggestions',
  };
  return map[path] ?? path;
};

const SocialLayout = ({ title, description, actions, children }: SocialLayoutProps) => {
  const location = useLocation();
  const segment = location.pathname.split('/')[2] ?? '';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="px-4 sm:px-6 lg:px-8 pt-20 pb-12 max-w-7xl mx-auto">
        <nav className="flex items-center text-xs text-muted-foreground mb-3 gap-1">
          <Share2 className="h-3.5 w-3.5" />
          <Link to="/social/dashboard" className="hover:text-foreground">Social Media</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{labelFor(segment)}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {children}
      </div>
    </div>
  );
};

export default SocialLayout;
