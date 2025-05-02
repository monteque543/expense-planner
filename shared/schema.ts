import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom transformers
const dateTransformer = z.preprocess((val) => {
  // Handle string dates
  if (typeof val === 'string') {
    // Create a date object from the string
    const date = new Date(val);
    if (isNaN(date.getTime())) return undefined;
    return date;
  }
  return val;
}, z.date());

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Transaction categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  isExpense: boolean("is_expense").notNull().default(true),
  emoji: text("emoji"),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
  isExpense: true,
  emoji: true,
});

// Person labels for transactions
export const persons = ["Beni", "Fabi", "Michał", "Together"] as const;
export type PersonLabel = typeof persons[number];

// Recurring intervals
export const recurringIntervals = ["daily", "weekly", "monthly", "yearly"] as const;
export type RecurringInterval = typeof recurringIntervals[number];

// Transactions can be either expenses or income
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  isExpense: boolean("is_expense").notNull(),
  categoryId: integer("category_id"),
  personLabel: text("person_label"),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // 'daily', 'weekly', 'monthly', 'yearly'
  recurringEndDate: timestamp("recurring_end_date"),
  isPaid: boolean("is_paid").default(false),
});

// Override the auto-generated schema with our custom validations
export const insertTransactionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.preprocess(
    // First preprocess to handle any input type
    (val) => {
      // If it's already a number, return it
      if (typeof val === 'number') return val;
      
      // If it's a string, clean and parse it
      if (typeof val === 'string') {
        try {
          // Clean the string (remove currency symbols, spaces, use consistent decimal)
          const cleanedStr = String(val).replace(/[^\d.,]/g, '').replace(/,/g, '.');
          const parsedNum = parseFloat(cleanedStr);
          if (!isNaN(parsedNum)) return parsedNum;
        } catch (e) {
          // In case of any errors, continue to validation step
          console.error("Error preprocessing amount:", e);
        }
      }
      
      // Fall back to original value if processing fails
      return val;
    },
    // Then validate the processed value
    z.number({ 
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number"  
    }).positive("Amount must be positive")
  ),
  date: dateTransformer,
  notes: z.string().nullable().optional(),
  isExpense: z.boolean(),
  categoryId: z.number().refine(val => val !== undefined && val !== null, {
    message: "Category is required"
  }),
  personLabel: z.enum(persons, {
    required_error: "Person is required",
    invalid_type_error: "Person must be selected"
  }),
  isRecurring: z.boolean().nullable().optional(),
  recurringInterval: z.enum(recurringIntervals).nullable().optional(),
  recurringEndDate: dateTransformer.nullable().optional(),
  isPaid: z.boolean().default(false).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Table relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

// Savings table to track manual savings contributions
export const savings = pgTable("savings", {
  id: serial("id").primaryKey(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  personLabel: text("person_label"),
});

// Schema for savings
export const insertSavingsSchema = z.object({
  amount: z.preprocess(
    // First preprocess to handle any input type
    (val) => {
      // If it's already a number, return it
      if (typeof val === 'number') return val;
      
      // If it's a string, clean and parse it
      if (typeof val === 'string') {
        try {
          // Clean the string (remove currency symbols, spaces, use consistent decimal)
          const cleanedStr = String(val).replace(/[^\d.,]/g, '').replace(/,/g, '.');
          const parsedNum = parseFloat(cleanedStr);
          if (!isNaN(parsedNum)) return parsedNum;
        } catch (e) {
          // In case of any errors, continue to validation step
          console.error("Error preprocessing amount:", e);
        }
      }
      
      // Fall back to original value if processing fails
      return val;
    },
    // Then validate the processed value
    z.number({ 
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number"  
    }).positive("Amount must be positive")
  ),
  date: dateTransformer,
  notes: z.string().nullable().optional(),
  personLabel: z.enum(persons, {
    required_error: "Person is required",
    invalid_type_error: "Person must be selected"
  }),
});

// Savings types
export type InsertSavings = z.infer<typeof insertSavingsSchema>;
export type Savings = typeof savings.$inferSelect;

// Extended types for the app
export type TransactionWithCategory = Transaction & {
  category?: Category;
};
