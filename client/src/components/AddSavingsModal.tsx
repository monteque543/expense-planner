import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PersonLabel, persons, insertSavingsSchema } from "@shared/schema";
import { formatDate } from "@/utils/dateUtils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface AddSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSavings: (data: {
    amount: number;
    date: Date;
    notes: string | null;
    personLabel: PersonLabel;
  }) => void;
  isPending: boolean;
}

// Create a form schema based on the insertSavingsSchema
const savingsFormSchema = insertSavingsSchema.extend({
  // Handle the amount with comma validation
  amount: z.string().refine(
    (val) => {
      // Replace commas with dots for validation
      const normalized = val.replace(",", ".");
      return !isNaN(parseFloat(normalized)) && parseFloat(normalized) > 0;
    },
    {
      message: "Amount must be a positive number",
    }
  ),
  // Override notes to be just string instead of nullable string for form handling
  notes: z.string().optional(),
});

type SavingsFormValues = z.infer<typeof savingsFormSchema>;

export default function AddSavingsModal({
  isOpen,
  onClose,
  onAddSavings,
  isPending,
}: AddSavingsModalProps) {
  // Get current date for the default value - only calculated once when component mounts
  const today = new Date();
  const formattedDate = formatDate(today, "yyyy-MM-dd");

  // Initialize the form
  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsFormSchema),
    defaultValues: {
      amount: "",
      date: today,
      notes: "", // This will be treated as an empty string, not null
      personLabel: "Together" as PersonLabel,
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        amount: "",
        date: new Date(),
        notes: "",
        personLabel: "Together" as PersonLabel,
      });
    }
  }, [isOpen]); // Don't include form in dependencies

  // Handle form submission
  function onSubmit(data: SavingsFormValues) {
    // Convert amount with comma to a number
    const amount = parseFloat(data.amount.replace(",", "."));
    
    onAddSavings({
      amount,
      date: data.date,
      notes: data.notes || null, // Convert empty string to null
      personLabel: data.personLabel,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Savings</DialogTitle>
          <DialogDescription>
            Add funds to your savings account. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      {...field}
                      autoFocus
                    />
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
                    <Input
                      type="date"
                      defaultValue={formattedDate}
                      onChange={(e) => {
                        field.onChange(new Date(e.target.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details here"
                      className="resize-none"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personLabel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Person</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-2"
                    >
                      {persons.map((person) => (
                        <div key={person} className="flex items-center space-x-1">
                          <RadioGroupItem
                            value={person}
                            id={`person-${person}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`person-${person}`}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground ${
                              field.value === person
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {person}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}