import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Category } from "@shared/schema";

interface AutocompleteCategoryInputProps {
  categories: Category[];
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
}

export function AutocompleteCategoryInput({
  categories,
  value,
  onChange,
  placeholder = "Search categories...",
  className,
  emptyMessage = "No matching categories found."
}: AutocompleteCategoryInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const selectedCategory = React.useMemo(() => 
    categories.find(cat => cat.id === value), [categories, value]);

  // Filter categories based on input value
  const filteredCategories = React.useMemo(() => {
    if (!inputValue) return categories;
    const lowerQuery = inputValue.toLowerCase();
    return categories.filter(category => 
      category.name.toLowerCase().includes(lowerQuery) ||
      (category.emoji && category.emoji.includes(lowerQuery))
    );
  }, [categories, inputValue]);

  // Handle category selection
  const handleSelect = React.useCallback((categoryId: number) => {
    onChange(categoryId);
    setOpen(false);
    setInputValue("");
  }, [onChange]);

  return (
    <div className="relative w-full">
      <div className="flex items-center">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          onFocus={() => setOpen(true)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 h-full px-3 py-2"
          onClick={() => setOpen(!open)}
        >
          {inputValue ? <Search className="h-4 w-4 opacity-50" /> : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
        </Button>
      </div>
      
      {/* Selected category display */}
      {selectedCategory && !open && (
        <div className="mt-2 flex items-center gap-1 text-sm">
          {selectedCategory.emoji && <span className="mr-1">{selectedCategory.emoji}</span>}
          <span 
            className="px-2 py-1 rounded-md" 
            style={{ backgroundColor: `${selectedCategory.color}30` }}
          >
            {selectedCategory.name}
          </span>
        </div>
      )}
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover rounded-md border border-border shadow-md max-h-60 overflow-y-auto">
          <Command>
            <CommandEmpty className="py-3 text-center text-sm">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelect(category.id)}
                  className="cursor-pointer flex items-center py-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        category.id === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2">{category.emoji}</span>
                    <span 
                      className="px-2 py-1 rounded-md flex-1" 
                      style={{ backgroundColor: `${category.color}30` }}
                    >
                      {category.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
}