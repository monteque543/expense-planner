import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import { X } from "lucide-react";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (data: Omit<Transaction, "id" | "isExpense">) => void;
  categories: Category[];
  isPending: boolean;
  titleSuggestions?: string[]; // Available title suggestions for autocomplete
  defaultDate?: Date; // Default date to pre-fill in the form when opened from calendar
}

const expenseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.union([z.number(), z.string()]).transform(val => {
    // Handle both number and string inputs
    if (typeof val === 'string') {
      const normalizedStr = val.replace(',', '.');
      const num = parseFloat(normalizedStr);
      return isNaN(num) ? 0 : num;
    }
    return val;
  }).refine(val => val > 0, "Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  categoryId: z.coerce.number().optional(),
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
  defaultDate
}: AddExpenseModalProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      amount: 0, // Initialize with 0 instead of undefined
      date: defaultDate 
        ? defaultDate.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      notes: "",
      categoryId: undefined,
      personLabel: undefined,
      isRecurring: false,
      recurringInterval: 'monthly', // Default to monthly
      recurringEndDate: undefined,
    },
    // Keep values when form has errors
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });
  
  // Update the date field when defaultDate changes or modal opens
  useEffect(() => {
    if (defaultDate && isOpen) {
      // Force the date to be at noon to avoid timezone issues
      const clonedDate = new Date(
        defaultDate.getFullYear(),
        defaultDate.getMonth(),
        defaultDate.getDate(),
        12, 0, 0
      );
      
      // Format the date directly to YYYY-MM-DD to avoid timezone issues
      const day = String(clonedDate.getDate()).padStart(2, '0');
      const month = String(clonedDate.getMonth() + 1).padStart(2, '0');
      const year = clonedDate.getFullYear();
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('Setting date in form to:', formattedDate, 'from', 
                  defaultDate.getFullYear() + '-' + 
                  (defaultDate.getMonth() + 1) + '-' + 
                  defaultDate.getDate());
      
      // Force a reset of the form with the new date
      form.reset({
        ...form.getValues(),
        date: formattedDate
      });
    }
  }, [defaultDate, isOpen, form]);

  function onSubmit(data: ExpenseFormValues) {
    // Number conversion is now handled by Zod transformation
    
    // Convert string dates to Date objects
    const formattedData = {
      ...data,
      date: new Date(data.date),
      notes: data.notes || null,
      categoryId: data.categoryId || null,
      personLabel: data.personLabel,  // Now required in schema
      isRecurring: data.isRecurring || false,
      recurringInterval: data.isRecurring ? data.recurringInterval : null,
      recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      isPaid: false, // Default to unpaid for new expenses
    };
    
    onAddExpense(formattedData);
    
    // Reset the form after successful submission
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        placeholder="e.g. Groceries, Rent, etc."
                        emptyMessage="No matching titles found"
                      />
                    ) : (
                      <Input placeholder="e.g. Groceries, Rent, etc." {...field} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">PLN</span>
                      </div>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-12" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
              
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <AutocompleteCategoryInput
                        categories={categories}
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
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="personLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Recurring Expense</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      This expense will repeat based on the selected interval
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
            
            {form.watch("isRecurring") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurringInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat Interval</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
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
                      <FormLabel>End Date (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="sticky bottom-0 bg-background pt-4 pb-2 flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white" 
                disabled={isPending}
              >
                {isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
