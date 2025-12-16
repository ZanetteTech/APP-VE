import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  data?: any;
}

interface CreatableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string, data?: any) => void;
  placeholder?: string;
  className?: string;
  ref?: React.Ref<HTMLButtonElement | HTMLInputElement>;
}

const CreatableSelect = React.forwardRef<HTMLButtonElement | HTMLInputElement, CreatableSelectProps>(
  ({ options, value, onChange, placeholder = "Selecione...", className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    if (options.length === 0) {
      return (
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          className={cn("bg-input border-border text-foreground placeholder:text-muted-foreground", className)}
        />
      );
    }

    const handleSelect = (currentValue: string, data?: any) => {
      onChange(currentValue === value ? "" : currentValue, data);
      setOpen(false);
    };

    const handleCreate = () => {
      if (inputValue) {
        onChange(inputValue.toUpperCase());
        setOpen(false);
      }
    };

    const selectedOption = options.find((option) => option.value === value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref as React.Ref<HTMLButtonElement>}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between bg-input border-border text-foreground hover:bg-input/90", className)}
          >
            {value ? value : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={`Buscar ${placeholder.toLowerCase()}...`} 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div 
                  className="p-2 text-sm text-foreground cursor-pointer hover:bg-secondary rounded-sm"
                  onClick={handleCreate}
                >
                  Usar "{inputValue.toUpperCase()}"
                </div>
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value, option.data)}
                    className="text-foreground aria-selected:bg-secondary aria-selected:text-foreground"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

CreatableSelect.displayName = "CreatableSelect";

export default CreatableSelect;
