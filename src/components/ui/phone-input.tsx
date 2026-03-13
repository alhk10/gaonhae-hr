/**
 * Phone Input with Country Code Selector
 * Shows flag + country code dropdown alongside phone number input
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countryCodes, parsePhone, formatPhone } from '@/constants/formOptions';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = '9123 4567',
  className = '',
  disabled = false,
}) => {
  const parsed = parsePhone(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  // Sync from external value changes
  useEffect(() => {
    const p = parsePhone(value);
    setCountryCode(p.countryCode);
    setLocalNumber(p.localNumber);
  }, [value]);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    onChange(formatPhone(code, localNumber));
  };

  const handleNumberChange = (num: string) => {
    setLocalNumber(num);
    onChange(formatPhone(countryCode, num));
  };

  const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

  return (
    <div className={`flex gap-1 ${className}`}>
      <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="h-9 w-[100px] shrink-0 px-2 text-xs">
          <SelectValue>
            <span className="flex items-center gap-1">
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.code}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countryCodes.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              <span className="flex items-center gap-2">
                <span>{cc.flag}</span>
                <span>{cc.code}</span>
                <span className="text-muted-foreground text-xs">{cc.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 flex-1"
        disabled={disabled}
      />
    </div>
  );
};
