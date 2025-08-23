/**
 * Sales Dashboard
 * Main dashboard for the Sales Module with student search functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, Calendar, Search, Eye, Clock } from 'lucide-react';
import { searchStudents, Student } from '@/services/studentService';
import { toast } from 'sonner';

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Student>[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchStudentsDebounced = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchStudents(searchQuery.trim(), 5);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          toast.error('Failed to search students');
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchStudentsDebounced);
  }, [searchQuery]);

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive student management and sales overview
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 4 Complete
          </Badge>
        </div>

        {/* Quick Student Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Quick Student Search
            </CardTitle>
            <CardDescription>
              Search for students by name, number, or email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            
            {isSearching && (
              <div className="text-sm text-muted-foreground">Searching...</div>
            )}
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Search Results:</h4>
                <div className="space-y-2">
                  {searchResults.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{student.first_name} {student.last_name}</div>
                        <div className="text-sm text-muted-foreground">
                          #{student.student_number} • {student.email}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {student.current_belt || 'No Belt'}
                          </Badge>
                          <Badge 
                            variant={student.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {student.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sales/student/${student.id}`)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-sm text-muted-foreground">No students found</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">✓</div>
              <p className="text-xs text-muted-foreground">
                Student search enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Student Profiles</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">✓</div>
              <p className="text-xs text-muted-foreground">
                360° view complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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

        {/* Development Roadmap */}
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
                <Badge variant="default" className="bg-green-100 text-green-800">✓ Complete</Badge>
                <span className="font-medium">Milestone 2: Access Control</span>
                <span className="text-sm text-muted-foreground">Feature flags, role-based access</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-100 text-green-800">✓ Complete</Badge>
                <span className="font-medium">Milestone 3: Student 360</span>
                <span className="text-sm text-muted-foreground">Read-only student profiles</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-100 text-green-800">✓ Complete</Badge>
                <span className="font-medium">Milestone 4: Student Management</span>
                <span className="text-sm text-muted-foreground">CRUD operations</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-blue-100 text-blue-800">🚧 In Progress</Badge>
                <span className="font-medium">Milestone 5: Product Management</span>
                <span className="text-sm text-muted-foreground">Classes, courses, merchandise</span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline">📋 Planned</Badge>
                <span className="font-medium">Milestone 6-10</span>
                <span className="text-sm text-muted-foreground">Invoicing, Payments, Analytics</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default SalesDashboard;