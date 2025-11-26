import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface SlotBreakdownItem {
  date: string;
  branchName: string;
  pay: number;
  hasAttendance: boolean;
}

interface SlotBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  breakdown: SlotBreakdownItem[];
  totalPay: number;
  totalSlots: number;
}

export function SlotBreakdownDialog({
  isOpen,
  onClose,
  employeeName,
  breakdown,
  totalPay,
  totalSlots,
}: SlotBreakdownDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Slot Booking Breakdown - {employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Slots</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalSlots}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Pay</span>
              </div>
              <p className="text-2xl font-bold text-green-900">S${totalPay.toFixed(2)}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          {breakdown.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Branch</TableHead>
                    <TableHead className="font-semibold text-right">Pay Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(item.date), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {item.branchName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          S${item.pay.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No slot bookings found</p>
            </div>
          )}

          {/* Average Pay Info */}
          {breakdown.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Average pay per slot: <span className="font-semibold text-foreground">S${(totalPay / totalSlots).toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
