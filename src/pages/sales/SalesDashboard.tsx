/**
 * Sales Dashboard
 * Main dashboard for the Sales Module (Milestone 3 placeholder)
 */

import React from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Package, 
  Receipt, 
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react';

const SalesDashboard = () => {
  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Manage students, products, invoices, and class attendance
            </p>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Development Phase
          </Badge>
        </div>

        {/* Development Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Module Under Development
            </CardTitle>
            <CardDescription className="text-orange-700">
              The Sales Module is currently being built in phases. This dashboard will show 
              real-time metrics and quick actions once development is complete.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Coming in Milestone 3
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Sample products created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Coming in Milestone 6
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Coming in Milestone 8
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Development Roadmap
            </CardTitle>
            <CardDescription>
              Track the progress of Sales Module development milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-100 text-green-800">✓ Complete</Badge>
                <span className="font-medium">Milestone 1: Database Schema</span>
                <span className="text-sm text-muted-foreground">17 tables, security policies</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-blue-100 text-blue-800">🔄 Current</Badge>
                <span className="font-medium">Milestone 2: Access Control</span>
                <span className="text-sm text-muted-foreground">Feature flags, role-based access</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline">📋 Next</Badge>
                <span className="font-medium">Milestone 3: Student 360</span>
                <span className="text-sm text-muted-foreground">Read-only student profiles</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline">📋 Planned</Badge>
                <span className="font-medium">Milestone 4-10</span>
                <span className="text-sm text-muted-foreground">Full sales functionality</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default SalesDashboard;