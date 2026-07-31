import React from 'react';
import { Briefcase, GraduationCap, Building2 } from 'lucide-react';
import { UserType } from '@/types/auth';

export const PORTAL_META: Record<UserType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  employee: { label: 'Employee', icon: Briefcase },
  student: { label: 'Student', icon: GraduationCap },
  branch: { label: 'Branch', icon: Building2 },
};

interface PortalSwitcherProps {
  options: UserType[];
  value: UserType | null;
  onChange: (type: UserType) => void;
  className?: string;
}

/**
 * Segmented switch to move between the Employee / Student / Branch portals.
 * Renders nothing when the person only has one kind of access.
 */
const PortalSwitcher: React.FC<PortalSwitcherProps> = ({ options, value, onChange, className }) => {
  if (options.length < 2) return null;

  return (
    <div className={`flex justify-end p-2 ${className || ''}`}>
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        {options.map((t) => {
          const { label, icon: Icon } = PORTAL_META[t];
          const active = value === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalSwitcher;
