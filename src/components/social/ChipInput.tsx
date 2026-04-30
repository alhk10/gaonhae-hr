import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChipInput = ({ value, onChange, placeholder, disabled }: ChipInputProps) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const trimmed = raw.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="border rounded-md px-2 py-1.5 flex flex-wrap gap-1.5 bg-background min-h-[40px]">
      {value.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 pr-1">
          {v}
          {!disabled && (
            <button type="button" onClick={() => remove(v)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft && add(draft)}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="border-0 shadow-none focus-visible:ring-0 h-7 px-1 flex-1 min-w-[120px]"
      />
    </div>
  );
};

export default ChipInput;
