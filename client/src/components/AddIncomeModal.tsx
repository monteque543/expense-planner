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
import { Transaction, persons, recurringIntervals } from "@shared/schema";
import { X } from "lucide-react";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIncome: (data: Omit<Transaction, "id" | "isExpense">) => void;
  isPending: boolean;
}

const incomeFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  personLabel: z.enum(persons).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringInterval: z.enum(recurringIntervals).optional(),
  recurringEndDate: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function AddIncomeModal({
  isOpen,
  onClose,
  onAddIncome,
  isPending
}: AddIncomeModalProps) {
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      title: "",
      amount: undefined,
      date: new Date().toISOString().split('T')[0],
      notes: "",
      personLabel: undefined,
      isRecurring: false,
      recurringInterval: undefined,
      recurringEndDate: undefined,
    },
  });

  function onSubmit(data: IncomeFormValues) {
    // Convert string dates to Date objects and handle null values
    const formattedData = {
      ...data,
      date: new Date(data.date),
      notes: data.notes || null,
      personLabel: data.personLabel || null,
      isRecurring: data.isRecurring || false,
      recurringInterval: data.isRecurring ? data.recurringInterval || null : null,
      recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      categoryId: null, // Income doesn't have a category
    };
    
    onAddIncome(formattedData);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Add New Income</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
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
                    <Input placeholder="e.g. Salary, Freelance, etc." {...field} />
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
                            {person}
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
                    <FormLabel>Recurring Income</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      This income will repeat based on the selected interval
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
            
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600" disabled={isPending}>
                {isPending ? "Adding..." : "Add Income"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
