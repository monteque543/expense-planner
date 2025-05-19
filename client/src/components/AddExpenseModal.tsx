import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
    
    // ENHANCED BUDGET PROTECTION:
    // Always block expenses when they would exceed budget - no option to proceed anyway
    if (currentBudget !== undefined) {
      console.log(`[BUDGET CHECK] Current budget: ${currentBudget} PLN, Expense amount: ${finalAmount} PLN`);
      
      // ENHANCED BUDGET PROTECTION: Hard block all expenses when budget is negative
      // This is month-specific since currentBudget is calculated for the current month
      if (currentBudget < 0 || finalAmount > currentBudget) {
        // Calculate exact deficit for better user feedback
        const deficit = currentBudget <= 0 
          ? Math.abs(currentBudget) + finalAmount 
          : finalAmount - currentBudget;
        
        console.log(`[STRICT BUDGET PROTECTION] Blocking expense of ${finalAmount} PLN with budget of ${currentBudget} PLN. Deficit: ${deficit} PLN`);
        
        // Set up budget warning dialog
        setBudgetDeficit(deficit);
        setShowBudgetWarning(true);
        
        // Only allow bypass if budget is positive but expense would exceed it
        // If budget is already negative, prevent adding expenses entirely
        if (currentBudget <= 0) {
          setPendingExpenseData(null);
        } else {
          setPendingExpenseData(data);
        }
        
        // No option to proceed immediately - form is not submitted
        return;
      }
    }
    
    // Convert string dates to Date objects
    const formattedData = {
      ...data,
      amount: finalAmount, // Use the converted amount
      date: new Date(data.date),
      notes: data.notes || null,
      categoryId: data.categoryId, // Now required
      personLabel: data.personLabel,  // Now required in schema
      isRecurring: data.isRecurring || false,
      recurringInterval: data.isRecurring ? data.recurringInterval : null,
      recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      isPaid: false, // Default to unpaid for new expenses
    };
    
    // ENHANCED Budget Protection System
    if (currentBudget !== undefined) {
      console.log(`BUDGET CHECK: Current budget: ${currentBudget} PLN, Expense amount: ${finalAmount} PLN`);
      
      if (currentBudget < 0) {
        // STRICT BLOCK: If budget is already negative, ALWAYS block the expense
        const deficit = Math.abs(currentBudget) + finalAmount;
        setBudgetDeficit(deficit);
        
        // Set to null to prevent the "Add Anyway" button from working
        setPendingExpenseData(null);
        
        // Show a warning dialog but block completely
        setShowBudgetWarning(true);
        console.log(`STRICT BLOCK: Budget already negative (${currentBudget} PLN), blocking expense entirely`);
        return;
      } 
      else if (finalAmount > currentBudget) {
        // WARNING: If this expense would put the budget into negative
        const deficit = finalAmount - currentBudget;
        setBudgetDeficit(deficit);
        
        // Store the data in case user wants to override
        setPendingExpenseData(formattedData);
        
        // Show the warning dialog
        setShowBudgetWarning(true);
        console.log(`WARNING: Expense (${finalAmount} PLN) exceeds remaining budget (${currentBudget} PLN)`);
        return;
      }
    }
    
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
      {/* Budget Warning Alert Dialog */}
      <AlertDialog open={showBudgetWarning} onOpenChange={setShowBudgetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {currentBudget < 0 ? 'Budget Blocked' : 'Budget Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentBudget < 0 ? (
                <>
                  <p className="mb-2 font-bold">You cannot add any more expenses this month!</p>
                  <p className="font-medium">
                    Your current budget is already negative at <span className="text-destructive font-bold">{formatCurrency(currentBudget, 'PLN')}</span>.
                  </p>
                  <p className="mt-2">
                    You need to add more income before you can add additional expenses.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2">This expense will exceed your available budget for this month!</p>
                  <p className="font-medium">
                    Your current budget is <span className="text-destructive">{formatCurrency(currentBudget, 'PLN')}</span> but this expense costs <span className="text-destructive">{formatCurrency(pendingExpenseData?.amount || 0, 'PLN')}</span>.
                  </p>
                  <p className="mt-2 font-semibold">
                    You are missing <span className="text-destructive">{formatCurrency(budgetDeficit, 'PLN')}</span> to afford this expense.
                  </p>
                </>
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
            {currentBudget >= 0 && (
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
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
      
      {/* Budget Warning Dialog */}
      <AlertDialog open={showBudgetWarning} onOpenChange={setShowBudgetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {currentBudget && currentBudget < 0 ? "Budget Protection" : "Budget Warning"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentBudget && currentBudget < 0 ? (
                // Strict blocking message when budget is already negative
                <>
                  <div className="font-semibold">
                    Your budget is already negative ({formatCurrency(currentBudget, 'PLN')})
                  </div>
                  Adding a new expense of {formatCurrency(pendingExpenseData?.amount || 0, 'PLN')} would increase your deficit 
                  to {formatCurrency(budgetDeficit, 'PLN')}.
                  <div className="mt-2 p-3 bg-destructive/10 rounded-md text-sm border border-destructive">
                    <strong>BLOCKED:</strong> You cannot add expenses when your budget is negative.
                    Please add income first or reduce other expenses.
                  </div>
                </>
              ) : (
                // Warning message when expense would exceed current budget
                <>
                  This expense of {formatCurrency(pendingExpenseData?.amount || 0, 'PLN')} will exceed your remaining budget 
                  by {formatCurrency(budgetDeficit, 'PLN')}.
                  <div className="mt-2 p-3 bg-destructive/10 rounded-md text-sm">
                    <strong>Warning:</strong> Adding this expense will put you over budget for this month.
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* Only show "Add Anyway" button if budget is not negative yet */}
            {(!currentBudget || currentBudget >= 0) && pendingExpenseData && (
              <AlertDialogAction 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => {
                  // User confirmed they want to add the expense despite budget warning
                  if (pendingExpenseData) {
                    submitExpense(pendingExpenseData);
                    setPendingExpenseData(null);
                  }
                }}
              >
                Add Anyway
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}