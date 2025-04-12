import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  emptyMessage?: string;
}

export function AutocompleteInput({
  options,
  value,
  onChange,
  placeholder = "Search...",
  className,
  emptyMessage = "No matching items found."
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || "");

  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;
    const lowerQuery = inputValue.toLowerCase();
    return options.filter(option => 
      option.toLowerCase().includes(lowerQuery)
    );
  }, [options, inputValue]);

  // Handle selection from dropdown
  const handleSelect = React.useCallback((currentValue: string) => {
    onChange(currentValue);
    setInputValue(currentValue);
    setOpen(false);
  }, [onChange]);

  // Handle input change
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  }, [onChange]);

  return (
    <div className="relative w-full">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn("pr-10", className)}
        onFocus={() => setOpen(true)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2"
        onClick={() => setOpen(!open)}
      >
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </Button>
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover rounded-md border border-border shadow-md">
          <Command>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
}