import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { AutocompleteCategoryInput } from "@/components/ui/autocomplete-category";
import { Category, Transaction, TransactionWithCategory, persons, recurringIntervals } from "@shared/schema";
import { DollarSign, Euro, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  SupportedCurrency, 
  convertToPLN, 
  fetchLatestRates, 
  formatCurrency, 
  getExchangeRate 
} from "@/utils/currency-converter";
import { saveTransactionAmountPreference } from "@/utils/transaction-preferences";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTransaction: (id: number, data: Partial<Transaction>) => void;
  transaction: TransactionWithCategory | null;
  categories: Category[];
  isPending: boolean;
  titleSuggestions?: string[]; // Available title suggestions for autocomplete
}

const editTransactionSchema = z.object({
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
    invalid_type_error: "Category must be selected"
  }),
  personLabel: z.enum(persons, {
    required_error: "Person is required",
    invalid_type_error: "Person must be selected"
  }),
  isExpense: z.boolean(),
  isRecurring: z.boolean().optional().default(false),
  recurringInterval: z.enum(recurringIntervals).optional(),
  recurringEndDate: z.string().nullable().optional(),
  isPaid: z.boolean().optional().default(false),
});

type EditTransactionFormValues = z.infer<typeof editTransactionSchema>;

// Person color mapping
const personColors: Record<string, string> = {
  "Beni": "#3b82f6",  // Blue
  "Fabi": "#ec4899",  // Pink
  "Michał": "#10b981", // Green
  "Together": "#8b5cf6" // Purple
};

export default function EditTransactionModal({
  isOpen,
  onClose,
  onUpdateTransaction,
  transaction,
  categories,
  isPending,
  titleSuggestions = []
}: EditTransactionModalProps) {
  // Hook for showing toast notifications
  const { toast } = useToast();
  
  // State for the selected currency
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('PLN');
  // State for displaying converted amount
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  
  // Fetch exchange rates when component mounts
  useEffect(() => {
    fetchLatestRates();
  }, []);
  
  // Create form with default values
  const form = useForm<EditTransactionFormValues>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      title: "",
      amount: 0,
      date: "",
      notes: "",
      categoryId: undefined,
      personLabel: undefined,
      isExpense: true,
      isRecurring: false,
      recurringInterval: 'monthly', // Default to monthly
      recurringEndDate: undefined,
      isPaid: false, // Default to unpaid
    },
    // Keep values when form has errors
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });
  
  // Update form values when transaction changes
  useEffect(() => {
    if (transaction) {
      // Need to type cast personLabel and recurringInterval to satisfy TypeScript
      const personLabelValue = transaction.personLabel as typeof persons[number] || undefined;
      const recurringIntervalValue = transaction.recurringInterval as typeof recurringIntervals[number] || undefined;
      
      form.reset({
        title: transaction.title,
        amount: transaction.amount,
        date: transaction.date ? format(new Date(transaction.date), "yyyy-MM-dd") : "",
        notes: transaction.notes || "",
        categoryId: transaction.categoryId || undefined,
        personLabel: personLabelValue,
        isExpense: transaction.isExpense,
        isRecurring: transaction.isRecurring || false,
        recurringInterval: recurringIntervalValue,
        recurringEndDate: transaction.recurringEndDate 
          ? format(new Date(transaction.recurringEndDate), "yyyy-MM-dd") 
          : undefined,
        isPaid: transaction.isPaid || false, // Include the isPaid field
      });
    }
  }, [transaction, form]);
  
  // Watch the amount to update the converted value display
  const amount = form.watch("amount");
  
  // Update converted amount when amount or currency changes
  useEffect(() => {
    if (amount && selectedCurrency !== 'PLN') {
      const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
      const convertedToPlnAmount = convertToPLN(amountNumber, selectedCurrency);
      setConvertedAmount(convertedToPlnAmount);
    } else {
      setConvertedAmount(null);
    }
  }, [amount, selectedCurrency]);

  function onSubmit(data: EditTransactionFormValues) {
    if (!transaction) return;
    
    // Enhanced debug logging for transaction processing
    console.log(`[EditModal] Processing transaction update for ID ${transaction.id} - "${transaction.title}"`);
    console.log(`[EditModal] Original amount: ${transaction.amount}, New amount: ${data.amount} (${typeof data.amount})`);
    console.log(`[EditModal] Is ID possibly hardcoded? ${transaction.id >= 970000}`);
    
    // Process amount with extra safeguards for large values
    let finalAmount = data.amount;
    
    // Additional validation for string inputs (ensuring proper parsing)
    if (typeof finalAmount === 'string') {
      try {
        // Ensure we're working with a proper string
        const amountStr = String(finalAmount);
        // Clean the string of any non-numeric characters except decimal points
        const cleanAmount = amountStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
        console.log(`[EditModal] Cleaned amount string from "${amountStr}" to "${cleanAmount}"`);
        
        // Parse the cleaned string
        const parsedAmount = parseFloat(cleanAmount);
        
        if (isNaN(parsedAmount)) {
          console.error(`[EditModal] ERROR: Unable to parse amount "${amountStr}" -> "${cleanAmount}"`);
          // Use the original amount as fallback
          finalAmount = transaction.amount;
          console.log(`[EditModal] Using original amount as fallback: ${finalAmount}`);
        } else {
          finalAmount = parsedAmount;
          console.log(`[EditModal] Successfully parsed amount to number: ${finalAmount}`);
        }
      } catch (error) {
        console.error('[EditModal] Error processing amount string:', error);
        // Use original amount as fallback in case of any error
        finalAmount = transaction.amount;
      }
    }
    
    // Currency conversion if needed
    if (selectedCurrency !== 'PLN') {
      const originalAmount = finalAmount;
      finalAmount = convertToPLN(finalAmount, selectedCurrency);
      console.log(`[EditModal] Converted ${originalAmount} ${selectedCurrency} to ${finalAmount} PLN`);
    }
    
    // Final validation to ensure we have a valid number
    if (typeof finalAmount !== 'number' || !isFinite(finalAmount) || finalAmount <= 0) {
      console.error(`[EditModal] Invalid final amount: ${finalAmount}. Using original amount instead.`);
      finalAmount = transaction.amount; // Use original as fallback
    }
    
    console.log(`[EditModal] Final amount to save: ${finalAmount} (${typeof finalAmount})`);
    
    // Special handling for specific transactions - for both Replit and trw
    if (transaction.title === "Replit" || transaction.title === "trw") {
      // Save the preferred amount for these transactions in localStorage
      // This ensures the preference is remembered between sessions
      console.log(`[EditModal] Saving preferred amount for ${transaction.title}: ${finalAmount} PLN`);
      saveTransactionAmountPreference(transaction.title, finalAmount);
      
      // Show a message about the update
      toast({
        title: `${transaction.title} transaction updated`,
        description: "The preferred amount has been saved. Changes will be visible on this page immediately.",
        duration: 5000,
      });
      
      // Immediately update the cached data to reflect the change without refresh
      const currentData = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
      if (currentData) {
        const updatedData = currentData.map((t: TransactionWithCategory) => {
          if (t.title === transaction.title) {
            return { ...t, amount: finalAmount };
          }
          return t;
        });
        
        // Update the cache immediately
        queryClient.setQueryData(['/api/transactions'], updatedData);
      }
    }
    
    // Prepare update data
    const updateData = {
      ...data,
      amount: finalAmount, // Use validated amount
      // Convert string dates to Date objects
      date: new Date(data.date),
      notes: data.notes || null,
      categoryId: data.categoryId || null,
      personLabel: data.personLabel, // Required field in schema
      isRecurring: data.isRecurring || false,
      recurringInterval: data.isRecurring ? (data.recurringInterval || 'monthly') : null,
      recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      isPaid: data.isPaid || false, // Include the isPaid field
    };
    
    console.log(`[EditModal] Sending update to backend for transaction ${transaction.id}:`, updateData);
    
    // Submit the update
    onUpdateTransaction(transaction.id, updateData);
    
    // Reset currency after submission
    setSelectedCurrency('PLN');
    setConvertedAmount(null);
  }

  const watchIsRecurring = form.watch("isRecurring");
  const watchIsExpense = form.watch("isExpense");
  
  // Set default recurring interval when isRecurring is toggled on
  useEffect(() => {
    if (watchIsRecurring && !form.getValues('recurringInterval')) {
      form.setValue('recurringInterval', 'monthly');
    }
  }, [watchIsRecurring, form]);
  
  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    (category) => category.isExpense === watchIsExpense
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {watchIsExpense ? "Expense" : "Income"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    {titleSuggestions.length > 0 ? (
                      <AutocompleteInput
                        options={titleSuggestions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter title"
                        emptyMessage="No matching titles found"
                      />
                    ) : (
                      <Input placeholder="Enter title" {...field} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Category field */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <AutocompleteCategoryInput
                      categories={filteredCategories}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        
                        // Auto-select recurring if Subscription category is selected
                        const category = categories.find(c => c.id === value);
                        if (category && category.name === 'Subscription') {
                          // Set recurring to true
                          form.setValue('isRecurring', true);
                          
                          // Set default monthly interval if not already set
                          if (!form.getValues('recurringInterval')) {
                            form.setValue('recurringInterval', 'monthly');
                          }
                        }
                      }}
                      placeholder="Search for category..."
                      emptyMessage="No matching categories found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Person field */}
            <FormField
              control={form.control}
              name="personLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {persons.map((person) => (
                        <SelectItem key={person} value={person}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: personColors[person] }}></div>
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
            
            {/* Amount field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {/* Currency selector buttons */}
                      <div className="flex space-x-2 mb-2">
                        <Button 
                          type="button" 
                          variant={selectedCurrency === 'PLN' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCurrency('PLN')}
                          className="flex-1"
                        >
                          PLN
                        </Button>
                        <Button 
                          type="button" 
                          variant={selectedCurrency === 'EUR' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCurrency('EUR')}
                          className="flex-1"
                        >
                          <Euro className="h-4 w-4 mr-1" /> EUR
                        </Button>
                        <Button 
                          type="button" 
                          variant={selectedCurrency === 'USD' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCurrency('USD')}
                          className="flex-1"
                        >
                          <DollarSign className="h-4 w-4 mr-1" /> USD
                        </Button>
                      </div>
                      
                      {/* Amount input with currency prefix */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">
                            {selectedCurrency === 'PLN' ? 'PLN' : 
                             selectedCurrency === 'USD' ? '$' : '€'}
                          </span>
                        </div>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0.00" 
                          {...field} 
                          className="pl-12"
                          onChange={(e) => {
                            // Only allow numbers, decimal points, and commas
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </div>
                      
                      {/* Show converted amount if currency is not PLN */}
                      {convertedAmount !== null && selectedCurrency !== 'PLN' && (
                        <div className="text-sm text-muted-foreground mt-1">
                          ≈ {formatCurrency(convertedAmount, 'PLN')} 
                          <span className="text-xs ml-1">
                            (Rate: {getExchangeRate(selectedCurrency, 'PLN').toFixed(4)})
                          </span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Date field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional details..." 
                      className="resize-none"
                      {...field}
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Paid status switch */}
            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Paid Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark this transaction as paid
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
            
            {/* Recurring switch */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Recurring Transaction</FormLabel>
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
            
            {/* Conditional fields for recurring transactions */}
            {watchIsRecurring && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="recurringInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurring Interval</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Cancel Subscription Button (only shown for existing recurring subscription transactions) */}
            {transaction?.isRecurring && watchIsRecurring && 
              transaction?.category?.name === 'Subscription' && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 mt-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-red-800 dark:text-red-300">Cancel Subscription</div>
                  <div className="text-xs text-red-700 dark:text-red-400">
                    This will stop the recurring nature of this transaction after this month.
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    // Cancel the subscription by updating the form values
                    // Set isRecurring to false to cancel subscription
                    form.setValue("isRecurring", false);
                    
                    // Submit the form automatically to apply the changes
                    form.handleSubmit(onSubmit)();
                  }}
                  className="ml-2"
                >
                  Cancel Subscription
                </Button>
              </div>
            )}

            <div className="sticky bottom-0 bg-background pt-4 pb-2 flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isPending}
                className={`w-full sm:w-auto ${watchIsExpense ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}