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
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
  isExpense: true,
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
});

// Override the auto-generated schema with our custom validations
export const insertTransactionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
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

// Extended types for the app
export type TransactionWithCategory = Transaction & {
  category?: Category;
};
