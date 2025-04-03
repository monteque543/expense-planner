import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Transactions can be either expenses or income
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  isExpense: boolean("is_expense").notNull(),
  categoryId: integer("category_id"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  title: true,
  amount: true,
  date: true,
  notes: true,
  isExpense: true,
  categoryId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Extended types for the app
export type TransactionWithCategory = Transaction & {
  category?: Category;
};
