import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { AutocompleteCategoryInput } from "@/components/ui/autocomplete-category";
import { Category, Transaction, persons, recurringIntervals } from "@shared/schema";
import { AlertTriangle, DollarSign, Euro, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  SupportedCurrency, 
  convertToPLN, 
  fetchLatestRates, 
  formatCurrency, 
  getExchangeRate 
} from "@/utils/currency-converter";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (data: Omit<Transaction, "id" | "isExpense">) => void;
  categories: Category[];
  isPending: boolean;
  titleSuggestions?: string[]; // Available title suggestions for autocomplete
  defaultDate?: Date; // Default date to pre-fill in the form when opened from calendar
  currentBudget?: number; // Current available budget to check if new expense is affordable
}

const expenseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.union([z.number(), z.string()]).transform(val => {
    // Handle both number and string inputs
    if (typeof val === 'string') {
      // Replace all commas with dots for decimal handling
      const normalizedStr = val.replace(/,/g, '.');
      const num = parseFloat(normalizedStr);
      return isNaN(num) ? 0 : num;
    }
    return val;
  }).refine(val => val > 0, "Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  categoryId: z.coerce.number({
    required_error: "Category is required",
    invalid_type_error: "Category is required",
  }),
  personLabel: z.enum(persons),
  isRecurring: z.boolean().optional().default(false),
  recurringInterval: z.enum(recurringIntervals).optional().default('monthly'),
  recurringEndDate: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

// Person color mapping
const personColors: Record<string, string> = {
  "Beni": "#3b82f6",  // Blue
  "Fabi": "#ec4899",  // Pink
  "Michał": "#10b981", // Green
  "Together": "#8b5cf6" // Purple
};

export default function AddExpenseModal({
  isOpen,
  onClose,
  onAddExpense,
  categories,
  isPending,
  titleSuggestions = [],
  defaultDate,
  currentBudget = Infinity // Default to Infinity to disable budget check if not provided
}: AddExpenseModalProps) {
  const { toast } = useToast();
  // State for the selected currency
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('PLN');
  // State for displaying converted amount
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  // State for budget warning dialog
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  // Store form data while showing warning
  const [pendingExpenseData, setPendingExpenseData] = useState<any>(null);
  // Store the budget deficit amount
  const [budgetDeficit, setBudgetDeficit] = useState(0);
  
  // Fetch exchange rates when component mounts
  useEffect(() => {
    fetchLatestRates();
  }, []);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      amount: 0,
      date: defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: "",
      isRecurring: false,
      recurringInterval: 'monthly', // Default to monthly
    },
  });
  
  const { watch, setValue } = form;
  
  // Watch the amount field
  const amount = watch('amount');
  
  // Update converted amount when amount or currency changes
  useEffect(() => {
    if (amount && selectedCurrency !== 'PLN') {
      try {
        const converted = convertToPLN(Number(amount), selectedCurrency);
        setConvertedAmount(converted);
      } catch (e) {
        console.error('Conversion error:', e);
        setConvertedAmount(null);
      }
    } else {
      setConvertedAmount(null);
    }
  }, [amount, selectedCurrency]);

  function onSubmit(data: ExpenseFormValues) {
    // Number conversion is handled by Zod transformation
    
    // If currency is not PLN, convert to PLN
    let finalAmount = data.amount;
    if (selectedCurrency !== 'PLN') {
      finalAmount = convertToPLN(finalAmount, selectedCurrency);
    }
    
    // DEBUG-ENABLED BUDGET PROTECTION
    // Always check budget before submission - with extra debugging
    if (currentBudget !== undefined) {
      console.log(`[DEBUG-MODAL] ⚠️ MODAL BUDGET CHECK - Budget: ${currentBudget.toFixed(2)} PLN, Expense: ${finalAmount.toFixed(2)} PLN`);
      
      const formattedData = {
        ...data,
        amount: finalAmount, // Use the converted amount
        date: new Date(data.date),
        notes: data.notes || null,
        categoryId: data.categoryId,
        personLabel: data.personLabel,
        isRecurring: data.isRecurring || false,
        recurringInterval: data.isRecurring ? data.recurringInterval : null,
        recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
        isPaid: false, // Default to unpaid for new expenses
      };
      
      // Budget is already negative
      if (currentBudget < 0) {
        const deficit = Math.abs(currentBudget) + finalAmount;
        console.log(`[DEBUG-MODAL] 🚫 BLOCK ATTEMPT - Budget negative: ${currentBudget.toFixed(2)} PLN, deficit: ${deficit.toFixed(2)} PLN`);
        console.log(`[DEBUG-MODAL] Show Budget Warning: ${showBudgetWarning}`);
        
        // No "Add Anyway" option
        setBudgetDeficit(deficit);
        setPendingExpenseData(null); // No override possible
        
        // Force dialog to show
        setShowBudgetWarning(true);
        console.log(`[DEBUG-MODAL] Set showBudgetWarning to TRUE`);
        
        // Extra check to confirm state update
        setTimeout(() => {
          console.log(`[DEBUG-MODAL] After state update - showBudgetWarning: ${showBudgetWarning}`);
        }, 10);
        
        return; // Do not submit
      }
      
      // Expense would exceed budget
      if (finalAmount > currentBudget) {
        const deficit = finalAmount - currentBudget;
        console.log(`[DEBUG-MODAL] ⚠️ WARNING ATTEMPT - Expense exceeds budget by ${deficit.toFixed(2)} PLN`);
        console.log(`[DEBUG-MODAL] Show Budget Warning: ${showBudgetWarning}`);
        
        // Allow "Add Anyway" option
        setBudgetDeficit(deficit);
        setPendingExpenseData(formattedData); // Allow override
        
        // Force dialog to show
        setShowBudgetWarning(true);
        console.log(`[DEBUG-MODAL] Set showBudgetWarning to TRUE`);
        
        // Extra check to confirm state update
        setTimeout(() => {
          console.log(`[DEBUG-MODAL] After state update - showBudgetWarning: ${showBudgetWarning}`);
        }, 10);
        
        return; // Do not submit yet
      }
      
      // Budget is sufficient, proceed with expense
      console.log(`[DEBUG-MODAL] ✅ APPROVED: Budget check passed. Adding expense.`);
      submitExpense(formattedData);
      return;
    }
    
    // No budget check needed, just format and submit
    const formattedData = {
      ...data,
      amount: finalAmount,
      date: new Date(data.date),
      notes: data.notes || null,
      categoryId: data.categoryId,
      personLabel: data.personLabel,
      isRecurring: data.isRecurring || false,
      recurringInterval: data.isRecurring ? data.recurringInterval : null,
      recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      isPaid: false,
    };
    
    // If we're here, the expense is within budget (or budget check is disabled)
    submitExpense(formattedData);
  }
  
  // Function to actually submit the expense (after budget check)
  function submitExpense(formattedData: any) {
    onAddExpense(formattedData);
    
    // Reset the form and currency selection after successful submission
    setSelectedCurrency('PLN');
    setConvertedAmount(null);
    form.reset({
      title: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: "",
      categoryId: undefined,
      personLabel: undefined,
      isRecurring: false,
      recurringInterval: 'monthly', // Default to monthly
      recurringEndDate: undefined,
    });
    
    // Also reset any pending data and warning state
    setPendingExpenseData(null);
    setShowBudgetWarning(false);
  }

  return (
    <>
      {/* Budget Warning Alert Dialog - Enhanced for strict protection */}
      <AlertDialog 
        open={showBudgetWarning} 
        onOpenChange={(open) => {
          setShowBudgetWarning(open);
          // Clear pending data when dialog is dismissed
          if (!open) {
            setPendingExpenseData(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {currentBudget < 0 ? 'Budget Protection - Blocked' : 'Budget Protection - Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {currentBudget < 0 ? (
                <div className="space-y-3">
                  <p className="font-bold text-destructive">You cannot add any expenses when your budget is negative!</p>
                  <p className="font-medium">
                    Your current budget is already negative at <span className="text-destructive font-bold">{formatCurrency(currentBudget, 'PLN')}</span>.
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mt-2 text-sm">
                    <p className="font-semibold">Required Actions:</p>
                    <p>You must add income or reduce expenses elsewhere before adding new expenses.</p>
                    <p className="mt-1">This restriction cannot be bypassed for budget protection.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold">This expense will exceed your available monthly budget!</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-background p-2 rounded-md text-center">
                      <p className="text-sm text-muted-foreground">Current Budget</p>
                      <p className="font-bold text-lg">{formatCurrency(currentBudget, 'PLN')}</p>
                    </div>
                    <div className="bg-background p-2 rounded-md text-center">
                      <p className="text-sm text-muted-foreground">Expense Amount</p>
                      <p className="font-bold text-lg text-destructive">{formatCurrency(pendingExpenseData?.amount || 0, 'PLN')}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mt-2">
                    <p className="font-semibold">You will be short by <span className="text-destructive font-bold">{formatCurrency(budgetDeficit, 'PLN')}</span></p>
                    <p className="text-sm mt-1">You can proceed with this expense, but your budget will become negative.</p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowBudgetWarning(false);
              setPendingExpenseData(null);
            }}>
              {currentBudget < 0 ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {/* Only show "Add Anyway" if budget is not negative yet */}
            {currentBudget >= 0 && pendingExpenseData && (
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  console.log("[BUDGET OVERRIDE] User chose to add expense despite budget warning");
                  if (pendingExpenseData) {
                    submitExpense(pendingExpenseData);
                  }
                }}
              >
                Add Anyway
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Title field with autocomplete */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        {...field}
                        options={titleSuggestions || []}
                        placeholder="e.g., Groceries"
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Amount field with currency selector */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Amount</FormLabel>
                      <div className="relative flex items-center">
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            {...field}
                            value={field.value !== 0 ? field.value : ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow only numbers and one decimal point
                              if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                                field.onChange(value === '' ? 0 : value);
                              }
                            }}
                            className="pl-8 bg-background"
                          />
                        </FormControl>
                        
                        {/* Currency indicator */}
                        <div className="absolute left-2 text-muted-foreground">
                          {selectedCurrency === 'PLN' && "zł"}
                          {selectedCurrency === 'USD' && <DollarSign className="h-4 w-4" />}
                          {selectedCurrency === 'EUR' && <Euro className="h-4 w-4" />}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Currency selector */}
                <div className="col-span-1">
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={selectedCurrency}
                    onValueChange={(value: SupportedCurrency) => setSelectedCurrency(value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="PLN" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">PLN (zł)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Show converted amount if currency is not PLN */}
              {convertedAmount !== null && selectedCurrency !== 'PLN' && (
                <div className="text-sm text-muted-foreground">
                  Converted: <span className="font-medium">{formatCurrency(convertedAmount, 'PLN')}</span>
                </div>
              )}
              
              {/* Date field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Category selector with autocomplete */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <AutocompleteCategoryInput
                        value={field.value || undefined}
                        onChange={(value) => field.onChange(value)}
                        categories={categories}
                        placeholder="Select a category"
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Person selector */}
              <FormField
                control={form.control}
                name="personLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {persons.map((person) => (
                          <SelectItem 
                            key={person} 
                            value={person}
                          >
                            <div className="flex items-center">
                              <div 
                                className="h-3 w-3 rounded-full mr-2" 
                                style={{ backgroundColor: personColors[person] || "#gray" }}
                              />
                              {person}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional details here..."
                        className="resize-none bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Recurring checkbox */}
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Recurring Expense</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        This expense repeats regularly
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Conditional fields for recurring expenses */}
              {form.watch('isRecurring') && (
                <div className="space-y-4 p-3 bg-secondary/20 rounded-lg">
                  <FormField
                    control={form.control}
                    name="recurringInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Interval</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {recurringIntervals.map((interval) => (
                              <SelectItem key={interval} value={interval}>
                                {interval.charAt(0).toUpperCase() + interval.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="recurringEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            className="bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}