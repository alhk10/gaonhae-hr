/**
 * Searchable Category Select Component
 * A dropdown that supports searching categories with an "Add New" option
 */

import React, { useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle, Search } from 'lucide-react';
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

interface CategoryOption {
  id: string;
  name: string;
  default_cost_price?: number | null;
}

interface SearchableCategorySelectProps {
  value?: string;
  onValueChange: (value: string, category?: CategoryOption) => void;
  categories: CategoryOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function SearchableCategorySelect({
  value,
  onValueChange,
  categories,
  placeholder = 'Select category',
  searchPlaceholder = 'Search category...',
  onAddNew,
  disabled = false,
  className,
  triggerClassName,
}: SearchableCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === '__add_new__') {
      onAddNew?.();
      setOpen(false);
      setSearchValue('');
      return;
    }
    
    const category = categories.find(c => c.name === selectedValue);
    onValueChange(selectedValue, category);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between h-7 text-xs min-w-[120px] bg-background font-normal",
            triggerClassName
          )}
          disabled={disabled}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("p-0 bg-background z-50", className)} 
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '200px' }}
        align="start"
      >
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-3 w-3 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex h-8 w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[200px] overflow-auto">
            {filteredCategories.length === 0 && !onAddNew && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No category found.
              </div>
            )}
            {filteredCategories.length === 0 && onAddNew && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                No category found.
              </div>
            )}
            <CommandGroup>
              {filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelect(category.name)}
                  className="text-xs cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3',
                      value === category.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNew && (
              <CommandGroup>
                <CommandItem
                  value="__add_new__"
                  onSelect={() => handleSelect('__add_new__')}
                  className="text-xs text-primary cursor-pointer"
                >
                  <PlusCircle className="mr-2 h-3 w-3" />
                  Add New Category
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
