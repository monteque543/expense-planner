import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Keyboard } from "lucide-react";

// Interface for a keyboard shortcut
interface KeyboardShortcut {
  key: string;
  description: string;
}

export default function KeyboardShortcuts() {
  // Define all available shortcuts
  const shortcuts: KeyboardShortcut[] = [
    { key: "e", description: "Add Expense" },
    { key: "i", description: "Add Income" },
    { key: "s", description: "Add to Savings" },
    { key: "t", description: "Today" },
    { key: "←", description: "Previous Month" },
    { key: "→", description: "Next Month" },
  ];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="w-[220px] p-0">
          <div className="rounded-md border bg-card text-card-foreground shadow-md">
            <div className="p-2 font-medium border-b">
              Keyboard Shortcuts
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}