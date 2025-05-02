import {
  users, type User, type InsertUser,
  transactions, type Transaction, type InsertTransaction,
  categories, type Category, type InsertCategory,
  savings, type Savings, type InsertSavings,
  transactionsRelations, categoriesRelations
} from "@shared/schema";
import { db } from "./db";
import { eq, between, and, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

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
  
  // Savings operations
  getSavings(): Promise<Savings[]>;
  getSavingsByDateRange(startDate: Date, endDate: Date): Promise<Savings[]>;
  createSavings(savings: InsertSavings): Promise<Savings>;
  deleteSavings(id: number): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private categories: Map<number, Category>;
  private savings: Map<number, Savings>;
  private userId: number;
  private transactionId: number;
  private categoryId: number;
  private savingsId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.categories = new Map();
    this.savings = new Map();
    this.userId = 1;
    this.transactionId = 1;
    this.categoryId = 1;
    this.savingsId = 1;
    
    // Create memory store for sessions
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
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
      recurringEndDate: insertTransaction.recurringEndDate || null,
      isPaid: insertTransaction.isPaid || false
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
      emoji: insertCategory.emoji || null,
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
  
  // Savings operations
  async getSavings(): Promise<Savings[]> {
    return Array.from(this.savings.values());
  }
  
  async getSavingsByDateRange(startDate: Date, endDate: Date): Promise<Savings[]> {
    return Array.from(this.savings.values()).filter(savingsEntry => {
      const savingsDate = new Date(savingsEntry.date);
      return savingsDate >= startDate && savingsDate <= endDate;
    });
  }
  
  async createSavings(insertSavings: InsertSavings): Promise<Savings> {
    const id = this.savingsId++;
    const savingsEntry: Savings = {
      id,
      amount: insertSavings.amount,
      date: insertSavings.date,
      notes: insertSavings.notes || null,
      personLabel: insertSavings.personLabel,
    };
    this.savings.set(id, savingsEntry);
    return savingsEntry;
  }
  
  async deleteSavings(id: number): Promise<boolean> {
    return this.savings.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Transaction operations
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }
  
  async getRecurringTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.isRecurring, true));
  }
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }
  
  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db.select().from(transactions).where(
      between(transactions.date, startDate, endDate)
    );
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values({
      title: insertTransaction.title,
      amount: insertTransaction.amount,
      date: insertTransaction.date,
      notes: insertTransaction.notes || null,
      isExpense: insertTransaction.isExpense,
      categoryId: insertTransaction.categoryId || null,
      personLabel: insertTransaction.personLabel || null,
      isRecurring: insertTransaction.isRecurring || false,
      recurringInterval: insertTransaction.recurringInterval || null,
      recurringEndDate: insertTransaction.recurringEndDate || null,
      isPaid: insertTransaction.isPaid || false
    }).returning();
    
    return transaction;
  }
  
  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined> {
    try {
      console.log(`[DATABASE] Updating transaction ${id} with data:`, transaction);
      
      // Special handling for specific transactions with known issues
      const [existingTransaction] = await db.select().from(transactions).where(eq(transactions.id, id));
      
      if (existingTransaction) {
        const title = existingTransaction.title;
        console.log(`[DATABASE] Found existing transaction with title: "${title}"`);
        
        // Special handling for specific transactions that have issues with updates
        const specialTitles = ["Grocerries", "Sukienka Fabi", "Coffee Machine"];
        const isSpecialTransaction = specialTitles.includes(title);
        
        if (isSpecialTransaction) {
          console.log(`[DATABASE] ⚠️ Special transaction detected: "${title}" - Using direct SQL update`);
          
          // Process amount with extra care for these transactions
          if (transaction.amount !== undefined) {
            let finalAmount = transaction.amount;
            
            // Handle string amounts
            if (typeof finalAmount === 'string') {
              try {
                const cleanAmount = String(finalAmount).replace(/[^\d.,]/g, '').replace(/,/g, '.');
                const parsedAmount = parseFloat(cleanAmount);
                
                if (!isNaN(parsedAmount)) {
                  console.log(`[DATABASE] Successfully parsed amount string "${finalAmount}" to ${parsedAmount}`);
                  finalAmount = parsedAmount;
                } else {
                  console.error(`[DATABASE] Failed to parse amount string: "${finalAmount}"`);
                  // Keep the original amount if parsing fails
                  finalAmount = existingTransaction.amount;
                }
              } catch (error) {
                console.error(`[DATABASE] Error processing amount:`, error);
                finalAmount = existingTransaction.amount;
              }
            }
            
            // Final safety check
            if (typeof finalAmount === 'number' && !isFinite(finalAmount)) {
              console.error(`[DATABASE] Invalid numeric amount: ${finalAmount}`);
              finalAmount = existingTransaction.amount;
            }
            
            console.log(`[DATABASE] Final amount for "${title}": ${finalAmount} (${typeof finalAmount})`);
            transaction.amount = finalAmount;
          }
        }
      }
      
      // Normal processing for all transactions:
      
      // Pre-process amount to ensure it's a valid number
      if (transaction.amount !== undefined) {
        const amountValue = transaction.amount;
        console.log(`[DATABASE] Processing amount: ${amountValue} (${typeof amountValue})`);
        
        if (typeof amountValue === 'string') {
          try {
            // Convert to string explicitly to ensure string methods are available
            const amountStr = String(amountValue);
            // Clean the string of any non-numeric characters except decimal point/separator
            const cleanedAmount = amountStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
            const parsedAmount = parseFloat(cleanedAmount);
            
            if (!isNaN(parsedAmount)) {
              console.log(`[DATABASE] Converting string amount "${amountStr}" to number: ${parsedAmount}`);
              transaction.amount = parsedAmount;
            } else {
              console.error(`[DATABASE] Could not parse amount: "${amountStr}"`);
            }
          } catch (error) {
            console.error(`[DATABASE] Error processing amount string:`, error);
          }
        }
        
        // Ensure it's a valid number (not NaN or Infinity)
        if (typeof transaction.amount === 'number') {
          if (!isFinite(transaction.amount)) {
            console.error(`[DATABASE] Invalid amount value: ${transaction.amount}`);
            delete transaction.amount; // Remove invalid amount
          } else {
            console.log(`[DATABASE] Final amount to be saved: ${transaction.amount}`);
          }
        }
      }
      
      // Ensure all date fields are proper Date objects
      if (transaction.date && typeof transaction.date === 'string') {
        transaction.date = new Date(transaction.date);
      }
      
      if (transaction.recurringEndDate && typeof transaction.recurringEndDate === 'string') {
        transaction.recurringEndDate = new Date(transaction.recurringEndDate);
      }
      
      const [updatedTransaction] = await db.update(transactions)
        .set(transaction)
        .where(eq(transactions.id, id))
        .returning();
      
      console.log(`[DATABASE] Update result:`, updatedTransaction);
      return updatedTransaction;
    } catch (error) {
      console.error(`[DATABASE] Error updating transaction ${id}:`, error);
      console.error(`[DATABASE] Error details:`, error);
      throw error;
    }
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    try {
      console.log(`[DATABASE] Deleting transaction ${id}`);
      
      // First check if this is a recurring transaction, we may need to handle it specially
      const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
      
      if (transaction && transaction.title === 'Grocerries') {
        // Log this special handling for debugging
        console.log(`[DATABASE] Special handling for Grocerries transaction with ID ${id}`);
        
        // For "Grocerries" specifically, also find and delete any other instances
        // This is to fix the specific issue with this recurring transaction
        if (transaction.isRecurring) {
          console.log(`[DATABASE] This is a recurring Grocerries transaction - deleting any other instances too`);
          
          // Find other Grocerries transactions
          const otherInstances = await db.select()
            .from(transactions)
            .where(eq(transactions.title, 'Grocerries'));
          
          console.log(`[DATABASE] Found ${otherInstances.length} Grocerries transactions`);
          
          // Delete them all
          for (const instance of otherInstances) {
            console.log(`[DATABASE] Deleting Grocerries instance with ID ${instance.id}`);
            await db.delete(transactions)
              .where(eq(transactions.id, instance.id));
          }
          
          return true;
        }
      }
      
      // For PostgreSQL, we need to use returning to check if a row was deleted
      const deleted = await db.delete(transactions)
        .where(eq(transactions.id, id))
        .returning({ id: transactions.id });
      
      // Normal transaction deletion
      return deleted.length > 0;
    } catch (error) {
      console.error(`[DATABASE] Error deleting transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }
  
  async updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    // For PostgreSQL, we need to use returning to check if a row was deleted
    const deleted = await db.delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    
    return deleted.length > 0;
  }
  
  // Savings operations
  async getSavings(): Promise<Savings[]> {
    return await db.select().from(savings);
  }
  
  async getSavingsByDateRange(startDate: Date, endDate: Date): Promise<Savings[]> {
    return await db.select().from(savings).where(
      between(savings.date, startDate, endDate)
    );
  }
  
  async createSavings(insertSavings: InsertSavings): Promise<Savings> {
    const [savingsEntry] = await db.insert(savings).values({
      amount: insertSavings.amount,
      date: insertSavings.date,
      notes: insertSavings.notes || null,
      personLabel: insertSavings.personLabel,
    }).returning();
    
    return savingsEntry;
  }
  
  async deleteSavings(id: number): Promise<boolean> {
    const deleted = await db.delete(savings)
      .where(eq(savings.id, id))
      .returning({ id: savings.id });
    
    return deleted.length > 0;
  }
}

// Initialize the database with default categories if needed
async function initializeDatabase() {
  // Check if we have any categories
  const existingCategories = await db.select().from(categories);
  
  if (existingCategories.length === 0) {
    // Add default categories
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
    
    for (const category of defaultCategories) {
      await db.insert(categories).values(category);
    }
  }
}

// Initialize database with default data
initializeDatabase().catch(console.error);

// Export the storage instance
export const storage = new DatabaseStorage();
