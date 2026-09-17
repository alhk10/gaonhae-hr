/**
 * Additional emails and phone numbers for a student — typically the second
 * parent. The primary Email / Phone fields stay untouched; these lists are what
 * payment matching also recognises the family by.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Plus, X } from 'lucide-react';

interface Props {
  emails: string[];
  phones: string[];
  onEmailsChange: (next: string[]) => void;
  onPhonesChange: (next: string[]) => void;
}

/** Clean a list for saving: trimmed, no blanks, no duplicates. */
export const cleanContactList = (values: string[], lowercase = false): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values || []) {
    const v = (raw || '').trim();
    if (!v) continue;
    const key = v.replace(/\s+/g, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lowercase ? v.toLowerCase() : v);
  }
  return out;
};

export const ExtraContactsFields: React.FC<Props> = ({ emails, phones, onEmailsChange, onPhonesChange }) => {
  const setAt = (list: string[], i: number, value: string) => list.map((v, idx) => (idx === i ? value : v));
  const removeAt = (list: string[], i: number) => list.filter((_, idx) => idx !== i);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Additional emails (2nd parent)</Label>
        {emails.map((value, i) => (
          <div key={`email-${i}`} className="flex items-center gap-1">
            <Input
              type="email"
              value={value}
              onChange={(e) => onEmailsChange(setAt(emails, i, e.target.value))}
              placeholder="parent@example.com"
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onEmailsChange(removeAt(emails, i))}
              aria-label="Remove email"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEmailsChange([...emails, ''])}>
          <Plus className="w-3 h-3 mr-1" /> Add email
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Additional phone numbers (2nd parent)</Label>
        {phones.map((value, i) => (
          <div key={`phone-${i}`} className="flex items-center gap-1">
            <div className="flex-1">
              <PhoneInput value={value} onChange={(v) => onPhonesChange(setAt(phones, i, v))} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onPhonesChange(removeAt(phones, i))}
              aria-label="Remove phone number"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPhonesChange([...phones, ''])}>
          <Plus className="w-3 h-3 mr-1" /> Add phone
        </Button>
      </div>
    </div>
  );
};

export default ExtraContactsFields;
