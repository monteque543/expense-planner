import { useEffect } from "react";
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
import { Category, Transaction, TransactionWithCategory, persons, recurringIntervals } from "@shared/schema";
import { X } from "lucide-react";
import { format } from "date-fns";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTransaction: (id: number, data: Partial<Transaction>) => void;
  transaction: TransactionWithCategory | null;
  categories: Category[];
  isPending: boolean;
}

const editTransactionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
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
  recurringEndDate: z.string().optional(),
});

type EditTransactionFormValues = z.infer<typeof editTransactionSchema>;

export default function EditTransactionModal({
  isOpen,
  onClose,
  onUpdateTransaction,
  transaction,
  categories,
  isPending
}: EditTransactionModalProps) {
  
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
      recurringInterval: undefined,
      recurringEndDate: undefined,
    }
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
      });
    }
  }, [transaction, form]);
  
  function onSubmit(data: EditTransactionFormValues) {
    if (!transaction) return;
    
    onUpdateTransaction(transaction.id, {
      ...data,
      // Convert string dates to Date objects
      date: new Date(data.date),
      recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
    });
  }

  const watchIsRecurring = form.watch("isRecurring");
  const watchIsExpense = form.watch("isExpense");
  
  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    (category) => category.isExpense === watchIsExpense
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Edit {watchIsExpense ? "Expense" : "Income"}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
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
                    <Input placeholder="Enter title" {...field} />
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
                  <Select
                    onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      
                      // Auto-select recurring if Subscription category is selected
                      const category = categories.find(c => c.id === parseInt(value));
                      if (category && category.name === 'Subscription') {
                        // Set recurring to true
                        form.setValue('isRecurring', true);
                        
                        // Set default monthly interval if not already set
                        if (!form.getValues('recurringInterval')) {
                          form.setValue('recurringInterval', 'monthly');
                        }
                      }
                    }}
                    defaultValue={field.value?.toString()}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem 
                          key={category.id} 
                          value={category.id.toString()}
                          className="flex items-center gap-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }} 
                          />
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          {person}
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
                  <FormLabel>Amount (PLN)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      step="0.01"
                      {...field} 
                    />
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
                        defaultValue={field.value}
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
            
            <div className="pt-4 flex justify-end space-x-2">
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
                className={`${watchIsExpense ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
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