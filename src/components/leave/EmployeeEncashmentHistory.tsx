
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Calendar, Clock } from 'lucide-react';
import { getEmployeeEncashmentRecords, type LeaveEncashmentRecord } from '@/services/leaveEncashmentService';

interface EmployeeEncashmentHistoryProps {
  employeeId: string;
}

const EmployeeEncashmentHistory: React.FC<EmployeeEncashmentHistoryProps> = ({ employeeId }) => {
  const [records, setRecords] = useState<LeaveEncashmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEncashmentHistory();
  }, [employeeId]);

  const loadEncashmentHistory = async () => {
    try {
      const data = await getEmployeeEncashmentRecords(employeeId);
      setRecords(data);
    } catch (error) {
      console.error('Error loading encashment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEncashed = records.reduce((sum, record) => sum + record.total_encashment_amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading encashment history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div className="ml-3">
              <p className="text-xs text-green-600">Total Leave Encashed</p>
              <p className="text-xl font-bold text-green-900">${totalEncashed.toFixed(2)}</p>
              <p className="text-xs text-green-500">{records.length} record(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Leave Encashment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center p-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Encashment History</h3>
              <p className="text-gray-600">You haven't had any leave encashment processed yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Unused Days</TableHead>
                  <TableHead>Encashed Days</TableHead>
                  <TableHead>Rate per Day</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.year}</TableCell>
                    <TableCell>{record.unused_leave_days}</TableCell>
                    <TableCell>{record.encashed_days}</TableCell>
                    <TableCell>${record.rate_per_day.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ${record.total_encashment_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={record.status === 'Processed' ? 'default' : 'secondary'}
                        className={record.status === 'Processed' ? 'bg-green-600' : ''}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.processed_date ? (
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-gray-500" />
                          {new Date(record.processed_date).toLocaleDateString()}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeEncashmentHistory;
