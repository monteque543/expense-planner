import { type Transaction, type Category, type TransactionWithCategory } from "@shared/schema";
import { format } from "date-fns";

// Global ID counter for hardcoded transactions
// Start at 970000 to prevent collisions with real data
let hardcodedIdCounter = 970000;

// Storage for deleted transaction IDs - use this to track what's been deleted
export const deletedHardcodedTransactionIds = new Set<number>();

// Get new ID that won't collide
export function getNextHardcodedId(): number {
  return hardcodedIdCounter++;
}

/**
 * Check if a transaction has been deleted (client-side only)
 */
export function isTransactionDeleted(id: number): boolean {
  return deletedHardcodedTransactionIds.has(id);
}

/**
 * Mark a transaction as deleted (client-side only)
 */
export function markTransactionAsDeleted(id: number): void {
  deletedHardcodedTransactionIds.add(id);
  console.log(`Marked transaction ${id} as deleted. Current deleted count: ${deletedHardcodedTransactionIds.size}`);
}

/**
 * Creates hardcoded subscription and expense transactions for critical months
 * This is a direct solution to ensure all recurring expenses/subscriptions appear in calendar
 */
export function createHardcodedExpenseTransactions(
  month: number, // 4 for May, 5 for June, etc.
  year: number, // 2025
  transactions: TransactionWithCategory[]
): Record<string, TransactionWithCategory[]> {
  const result: Record<string, TransactionWithCategory[]> = {};
  
  // Apply to ALL months in 2025 + first quarter of 2026
  if (!(year === 2025 || (year === 2026 && month <= 2))) {
    return result;
  }
  
  // Find all subscription transactions in the original data
  const subscriptionTransactions = transactions.filter(t => 
    t.isRecurring && t.category?.name === 'Subscription'
  );
  
  // Find all recurring expense transactions
  const recurringExpenses = transactions.filter(t => 
    t.isRecurring && t.isExpense && t.category?.name !== 'Subscription'
  );
  
  // Nothing to do if we have no recurring transactions
  if (subscriptionTransactions.length === 0 && recurringExpenses.length === 0) {
    return result;
  }
  
  console.log(`🔄 EXPENSE HARDCODER: Processing month ${month + 1}/${year}`);
  
  // Process subscriptions first - we always want them to appear
  subscriptionTransactions.forEach(subscription => {
    // For each subscription, create a hardcoded instance for this month
    const originalDay = typeof subscription.date === 'string' 
      ? new Date(subscription.date).getDate() 
      : subscription.date instanceof Date 
        ? subscription.date.getDate() 
        : 1;
    
    // Create a specific date for this month's instance
    const subscriptionDate = new Date(year, month, originalDay, 12, 0, 0);
    const dateStr = format(subscriptionDate, 'yyyy-MM-dd');
    
    // Check if we already have this subscription on this date
    const alreadyExists = transactions.some(t => {
      if (t.title === subscription.title && t.isRecurring) {
        const transDate = typeof t.date === 'string' 
          ? t.date 
          : t.date instanceof Date 
            ? format(t.date, 'yyyy-MM-dd') 
            : '';
        return transDate === dateStr;
      }
      return false;
    });
    
    if (!alreadyExists) {
      // Create a subscription instance for this month
      const hardcodedSubscription: TransactionWithCategory = {
        ...subscription,
        id: 980000 + (month * 100) + subscriptionTransactions.indexOf(subscription),
        date: subscriptionDate,
        notes: subscription.notes || ''
        // We don't need any extra properties, we'll use date to identify the appropriate month
      };
      
      // Add it to the result
      if (!result[dateStr]) {
        result[dateStr] = [];
      }
      result[dateStr].push(hardcodedSubscription);
      console.log(`🔄 Added hardcoded subscription "${subscription.title}" for ${dateStr}`);
    }
  });
  
  // Then process other recurring expenses 
  recurringExpenses.forEach(expense => {
    // For each expense, create a hardcoded instance for this month
    const originalDay = typeof expense.date === 'string' 
      ? new Date(expense.date).getDate() 
      : expense.date instanceof Date 
        ? expense.date.getDate() 
        : 1;
    
    // Create a specific date for this month's instance
    const expenseDate = new Date(year, month, originalDay, 12, 0, 0);
    const dateStr = format(expenseDate, 'yyyy-MM-dd');
    
    // Check if we already have this expense on this date
    const alreadyExists = transactions.some(t => {
      if (t.title === expense.title && t.isRecurring) {
        const transDate = typeof t.date === 'string' 
          ? t.date 
          : t.date instanceof Date 
            ? format(t.date, 'yyyy-MM-dd') 
            : '';
        return transDate === dateStr;
      }
      return false;
    });
    
    if (!alreadyExists) {
      // Create an expense instance for this month
      const hardcodedExpense: TransactionWithCategory = {
        ...expense,
        id: 970000 + (month * 100) + recurringExpenses.indexOf(expense),
        date: expenseDate,
        notes: expense.notes || ''
        // No extra properties needed, just rely on the date
      };
      
      // Add it to the result
      if (!result[dateStr]) {
        result[dateStr] = [];
      }
      result[dateStr].push(hardcodedExpense);
      console.log(`🔄 Added hardcoded expense "${expense.title}" for ${dateStr}`);
    }
  });
  
  return result;
}