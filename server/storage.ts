import {
  users, type User, type InsertUser,
  transactions, type Transaction, type InsertTransaction,
  categories, type Category, type InsertCategory,
  transactionsRelations, categoriesRelations
} from "@shared/schema";
import { db } from "./db";
import { eq, between, and, isNotNull } from "drizzle-orm";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction operations
  getTransactions(): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getRecurringTransactions(): Promise<Transaction[]>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private categories: Map<number, Category>;
  private userId: number;
  private transactionId: number;
  private categoryId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.categories = new Map();
    this.userId = 1;
    this.transactionId = 1;
    this.categoryId = 1;
    
    // Initialize with some default categories
    this.initializeCategories();
  }
  
  private initializeCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "Bills", color: "#3b82f6", isExpense: true },
      { name: "Food", color: "#10b981", isExpense: true },
      { name: "Transportation", color: "#8b5cf6", isExpense: true },
      { name: "Entertainment", color: "#f59e0b", isExpense: true },
      { name: "Shopping", color: "#ec4899", isExpense: true },
      { name: "Health", color: "#ef4444", isExpense: true },
      { name: "Travel", color: "#6366f1", isExpense: true },
      { name: "Beauty", color: "#d946ef", isExpense: true },
      { name: "IDOinDenmark", color: "#0ea5e9", isExpense: true },
      { name: "Courses", color: "#f97316", isExpense: true },
      { name: "Subscription", color: "#14b8a6", isExpense: true },
      { name: "Other", color: "#64748b", isExpense: true }
    ];
    
    defaultCategories.forEach(category => {
      this.createCategory(category);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Transaction operations
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }
  
  async getRecurringTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.isRecurring === true
    );
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    // Create a proper transaction object with all fields
    const transaction: Transaction = {
      id,
      title: insertTransaction.title,
      amount: insertTransaction.amount,
      date: insertTransaction.date,
      notes: insertTransaction.notes || null,
      isExpense: insertTransaction.isExpense,
      categoryId: insertTransaction.categoryId || null,
      personLabel: insertTransaction.personLabel || null,
      isRecurring: insertTransaction.isRecurring || false,
      recurringInterval: insertTransaction.recurringInterval || null,
      recurringEndDate: insertTransaction.recurringEndDate || null
    };
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    if (!existingTransaction) return undefined;
    
    const updatedTransaction = { ...existingTransaction, ...transaction };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    // Ensure isExpense is always a boolean
    const category: Category = {
      id,
      name: insertCategory.name,
      color: insertCategory.color,
      isExpense: insertCategory.isExpense !== undefined ? insertCategory.isExpense : true,
    };
    this.categories.set(id, category);
    return category;
  }
  
  async updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) return undefined;
    
    const updatedCategory = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }
}

export const storage = new MemStorage();
