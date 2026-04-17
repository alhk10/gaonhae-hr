/**
 * Multi-Select Component
 * A dropdown that supports searching and selecting multiple items
 */

import React, { useState } from 'react';
import { Check, ChevronsUpDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MultiSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  allowAddNew?: boolean;
  disabled?: boolean;
  maxDisplayed?: number;
}

export function MultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  allowAddNew = false,
  disabled = false,
  maxDisplayed = 2,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    if (values.includes(selectedValue)) {
      onValuesChange(values.filter((v) => v !== selectedValue));
    } else {
      onValuesChange([...values, selectedValue]);
    }
    setSearchValue('');
  };

  const handleRemove = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== valueToRemove));
  };

  const handleAddNew = () => {
    if (searchValue.trim() && !options.includes(searchValue.trim()) && !values.includes(searchValue.trim())) {
      onValuesChange([...values, searchValue.trim()]);
      setSearchValue('');
    }
  };

  const showAddOption = allowAddNew && 
    searchValue.trim() && 
    !options.some(option => option.toLowerCase() === searchValue.toLowerCase()) &&
    !values.some(v => v.toLowerCase() === searchValue.toLowerCase());

  const displayedValues = values.slice(0, maxDisplayed);
  const remainingCount = values.length - maxDisplayed;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-9 py-1.5"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {values.length === 0 ? (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            ) : (
              <>
                {displayedValues.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5"
                  >
                    {value}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={(e) => handleRemove(value, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                const highlighted = (e.currentTarget
                  .closest('[cmdk-root]') as HTMLElement | null)
                  ?.querySelector('[cmdk-item][data-selected="true"]') as HTMLElement | null;
                const value = highlighted?.getAttribute('data-value');
                if (value) {
                  e.preventDefault();
                  // Match against original option casing; fall back to add-new for custom entries
                  const match = options.find((o) => o.toLowerCase() === value.toLowerCase());
                  if (match) {
                    handleSelect(match);
                  } else if (showAddOption) {
                    handleAddNew();
                  }
                } else if (showAddOption) {
                  e.preventDefault();
                  handleAddNew();
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {allowAddNew ? 'No results found.' : 'No options available.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(option) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
              {showAddOption && (
                <CommandItem onSelect={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{searchValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
