import React from 'react';
import { CLASS_TYPES } from '@/services/branchTimetableService';
import { getClassTypeColors } from '@/utils/classTypeColors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const ClassTypeManagementTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Class Types</h3>
        <p className="text-sm text-muted-foreground">
          Available class types used across timetables, products, and invoices.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Class Type</TableHead>
              <TableHead>Color</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CLASS_TYPES.map((ct, index) => {
              const colors = getClassTypeColors(ct);
              return (
                <TableRow key={ct}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{ct}</TableCell>
                  <TableCell>
                    <Badge className={colors.badge}>{ct}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClassTypeManagementTab;
