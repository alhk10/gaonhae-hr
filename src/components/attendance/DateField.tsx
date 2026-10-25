import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';
import { parseIsoDate, toIsoDate } from '@/utils/attendanceWeek';

interface Props {
  value: string; // YYYY-MM-DD or ''
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

/** DD/MM/YYYY date picker (no native date inputs). */
const DateField: React.FC<Props> = ({ value, onChange, placeholder = 'Pick a date', className }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" className={cn('h-8 w-full justify-start px-2 text-xs font-normal', !value && 'text-muted-foreground', className)}>
        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
        {value ? formatDate(value) : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={value ? parseIsoDate(value) : undefined}
        onSelect={(d) => d && onChange(toIsoDate(d))}
        defaultMonth={value ? parseIsoDate(value) : undefined}
        initialFocus
        className="p-3 pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
);

export default DateField;
