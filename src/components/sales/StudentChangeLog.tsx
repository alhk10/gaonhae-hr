/**
 * Student Change Log Component
 * Displays the history of changes made to a student record
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { StudentChangeLog as ChangeLogType, formatFieldName, formatAction } from '@/services/studentChangeLogService';
import { formatBeltLevel } from '@/constants/beltLevels';

interface StudentChangeLogProps {
  changeLogs: ChangeLogType[];
  loading: boolean;
}

export const StudentChangeLog: React.FC<StudentChangeLogProps> = ({ changeLogs, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Change Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'status_change':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatValue = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    if (Array.isArray(value)) {
      return value.join(', ') || '(empty)';
    }
    // Format belt level values (handle legacy hyphenated values)
    if (fieldName === 'current_belt') {
      return formatBeltLevel(String(value));
    }
    return String(value);
  };

  const renderChanges = (log: ChangeLogType) => {
    // If there's a changes object with multiple fields
    if (log.changes && typeof log.changes === 'object') {
      const changeEntries = Object.entries(log.changes);
      
      if (changeEntries.length === 0) {
        return null;
      }

      return (
        <div className="mt-2 space-y-1">
          {changeEntries.map(([field, change]: [string, any]) => (
            <div key={field} className="text-xs text-muted-foreground flex items-start gap-1 flex-wrap">
              <span className="font-medium text-foreground">{formatFieldName(field)}:</span>
              <span className="text-destructive/70 line-through">{formatValue(change.old, field)}</span>
              <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="text-primary">{formatValue(change.new, field)}</span>
            </div>
          ))}
        </div>
      );
    }

    // If it's a single field change
    if (log.field_name) {
      return (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <span className="font-medium text-foreground">{formatFieldName(log.field_name)}:</span>
          {log.old_value && (
            <>
              <span className="text-destructive/70 line-through">{log.old_value}</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
          <span className="text-primary">{log.new_value || '(empty)'}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Change Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {changeLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No changes recorded yet</p>
            <p className="text-sm mt-2">Changes to this student's record will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {changeLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="border-l-2 border-muted pl-4 pb-4 relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary"></div>
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      {log.changed_by_email && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.changed_by_email}
                        </div>
                      )}
                      
                      {renderChanges(log)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
