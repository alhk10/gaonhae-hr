/**
 * Student Entitlements Component
 * Displays student session entitlements and usage tracking
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ticket, Calendar, Award, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StudentEntitlement } from '@/services/studentService';
import { format, isAfter, isBefore } from 'date-fns';
import { formatDate } from '@/utils/dateFormat';

interface StudentEntitlementsProps {
  entitlements: StudentEntitlement[];
  loading?: boolean;
}

export const StudentEntitlements: React.FC<StudentEntitlementsProps> = ({
  entitlements,
  loading = false
}) => {
  const getEntitlementStatus = (entitlement: StudentEntitlement) => {
    const now = new Date();
    const validFrom = new Date(entitlement.valid_from);
    const validTo = entitlement.valid_to ? new Date(entitlement.valid_to) : null;

    if (!entitlement.is_active) return 'inactive';
    if (isBefore(now, validFrom)) return 'upcoming';
    if (validTo && isAfter(now, validTo)) return 'expired';
    if (entitlement.sessions_remaining <= 0) return 'depleted';
    if (entitlement.sessions_remaining <= 2) return 'low';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'depleted':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-red-600" />;
      case 'upcoming':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Ticket className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      active: { variant: "default", className: "bg-green-100 text-green-800 border-green-200", label: "Active" },
      low: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Low Sessions" },
      depleted: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", label: "Depleted" },
      expired: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", label: "Expired" },
      upcoming: { variant: "outline", className: "bg-blue-100 text-blue-800 border-blue-200", label: "Upcoming" },
      inactive: { variant: "secondary", className: "bg-gray-100 text-gray-800 border-gray-200", label: "Inactive" }
    };

    const config = variants[status] || variants.inactive;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const calculateTotalSessions = () => {
    return entitlements.reduce((acc, e) => ({
      total: acc.total + e.sessions_total,
      used: acc.used + e.sessions_used,
      remaining: acc.remaining + e.sessions_remaining
    }), { total: 0, used: 0, remaining: 0 });
  };

  const totals = calculateTotalSessions();
  const usagePercentage = totals.total > 0 ? (totals.used / totals.total) * 100 : 0;

  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Session Entitlements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-2 bg-muted rounded mb-4"></div>
            </div>
            
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
                <div className="h-2 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Session Entitlements
          <Badge variant="outline" className="ml-auto">
            {entitlements.length} packages
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Sessions Overview */}
        {totals.total > 0 && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Total Sessions</h3>
              <div className="text-sm text-muted-foreground">
                {totals.used} of {totals.total} used
              </div>
            </div>
            
            <Progress value={usagePercentage} className="mb-2" />
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {totals.remaining} sessions remaining
              </span>
              <span className="text-muted-foreground">
                {usagePercentage.toFixed(1)}% used
              </span>
            </div>
          </div>
        )}

        {/* Individual Entitlements */}
        <div className="space-y-4">
          {entitlements.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No session entitlements found</p>
            </div>
          ) : (
            entitlements.map((entitlement) => {
              const status = getEntitlementStatus(entitlement);
              const usagePercent = entitlement.sessions_total > 0 
                ? (entitlement.sessions_used / entitlement.sessions_total) * 100 
                : 0;

              return (
                <div
                  key={entitlement.id}
                  className="p-4 border border-border rounded-lg bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <div>
                        <h3 className="font-semibold text-foreground capitalize">
                          {entitlement.source_type.replace('_', ' ')} Package
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(entitlement.valid_from))}
                          {entitlement.valid_to && (
                            <span> - {formatDate(new Date(entitlement.valid_to))}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(status)}
                      <div className="text-right text-sm">
                        <div className="font-semibold text-foreground">
                          {entitlement.sessions_remaining} left
                        </div>
                        <div className="text-muted-foreground">
                          of {entitlement.sessions_total}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Progress value={usagePercent} className="mb-2" />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{entitlement.sessions_used} sessions used</span>
                    <span>{usagePercent.toFixed(1)}% used</span>
                  </div>

                  {/* Scope Information */}
                  {(entitlement.branch_scope || entitlement.class_type_scope || entitlement.belt_level_scope) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {entitlement.branch_scope && (
                          <Badge variant="outline" className="text-xs">
                            Branch: {entitlement.branch_scope}
                          </Badge>
                        )}
                        {entitlement.class_type_scope && (
                          <Badge variant="outline" className="text-xs">
                            Class: {entitlement.class_type_scope}
                          </Badge>
                        )}
                        {entitlement.belt_level_scope && (
                          <Badge variant="outline" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {entitlement.belt_level_scope}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {entitlement.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {entitlement.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};