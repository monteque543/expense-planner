import { Transaction, TransactionWithCategory } from "@shared/schema";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { queryClient } from "@/lib/queryClient";

// Define an extended transaction interface that includes our client-side properties
interface ExtendedTransaction extends Transaction {
  isDeleted?: boolean;
  instanceDate?: string;
}

/**
 * This utility handles recurring transactions for single-instance operations
 * Ensures that actions like delete and mark as paid only affect the current instance
 */

// Generate a unique instance ID for a recurring transaction that combines the base ID with date
export function generateInstanceId(transaction: Transaction, date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const month = getMonth(dateObj) + 1; // 1-12
  const year = getYear(dateObj);
  return `${transaction.id}-${year}-${month}`;
}

// Extracts the original transaction ID from an instance ID
export function extractOriginalId(instanceId: string): number {
  const [id] = instanceId.split('-');
  return parseInt(id, 10);
}

// Determines if a given string is an instance ID
export function isInstanceId(id: string | number): boolean {
  return typeof id === 'string' && id.includes('-');
}

/**
 * Creates a monthly snapshot of a recurring transaction instance
 * This allows us to modify one instance without affecting others
 */
export async function createInstanceSnapshot(
  transaction: Transaction, 
  date: Date | string,
  changes: Partial<Transaction>
): Promise<void> {
  try {
    // Create a month-specific key
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const monthYear = format(dateObj, 'yyyy-MM');
    const instanceKey = `instance-${transaction.id}-${monthYear}`;
    
    // Store the changes for this specific instance
    localStorage.setItem(instanceKey, JSON.stringify({
      ...changes,
      instanceDate: format(dateObj, 'yyyy-MM-dd')
    }));
    
    console.log(`Created instance snapshot for ${transaction.title} (${format(dateObj, 'yyyy-MM-dd')})`);
    
    // If we're marking something as paid or not, immediately invalidate the transactions query
    // to refresh the UI with the new paid status
    if ('isPaid' in changes) {
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    }
  } catch (error) {
    console.error('Error creating instance snapshot:', error);
  }
}

/**
 * Gets the instance-specific overrides for a recurring transaction
 */
export function getInstanceOverrides(
  transaction: Transaction, 
  date: Date | string
): Partial<Transaction> | null {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const monthYear = format(dateObj, 'yyyy-MM');
    const instanceKey = `instance-${transaction.id}-${monthYear}`;
    
    const stored = localStorage.getItem(instanceKey);
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting instance overrides:', error);
    return null;
  }
}

/**
 * Marks a specific instance of a recurring transaction as deleted
 * This doesn't actually delete it from the server but hides it in the UI
 */
export async function markInstanceAsDeleted(
  transaction: Transaction,
  date: Date | string
): Promise<void> {
  // Also directly use the month-specific localStorage approach
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const monthKey = format(dateObj, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get any existing deleted instances for this month
  const existingData = localStorage.getItem(storageKey);
  const existingIds = existingData ? JSON.parse(existingData) : [];
  
  // Add this transaction ID if not already present
  if (!existingIds.includes(transaction.id)) {
    existingIds.push(transaction.id);
    localStorage.setItem(storageKey, JSON.stringify(existingIds));
    console.log(`[RECURRING DELETE] Added transaction ${transaction.id} to deleted list for month ${monthKey}`);
  }
  
  // Also use the snapshot approach for backward compatibility
  return createInstanceSnapshot(transaction, date, { isDeleted: true });
}

/**
 * Checks if a specific instance of a recurring transaction is marked as deleted
 */
export function isInstanceDeleted(
  transaction: Transaction,
  date: Date | string
): boolean {
  const overrides = getInstanceOverrides(transaction, date);
  return overrides?.isDeleted === true;
}

/**
 * Applies instance-specific overrides to a transaction
 * This is used to show the correct instance properties (like paid status, etc.)
 */
export function applyInstanceOverrides(
  transaction: TransactionWithCategory,
  date: Date | string
): TransactionWithCategory {
  const overrides = getInstanceOverrides(transaction, date);
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Check for month-specific paid status (from strict-monthly-paid-status utility)
  let isPaid = transaction.isPaid;
  
  // If we have month-specific paid status, use that
  try {
    const monthlyPaidStatus = localStorage.getItem(`transaction-${transaction.id}-paid-${format(dateObj, 'yyyy-MM')}`);
    if (monthlyPaidStatus !== null) {
      isPaid = monthlyPaidStatus === 'true';
      console.log(`Found month-specific paid status for ${transaction.title} (${transaction.id}): ${isPaid}`);
    }
  } catch (error) {
    console.error('Error checking month-specific paid status:', error);
  }
  
  if (!overrides) {
    // No stored overrides, but we might have month-specific paid status
    return {
      ...transaction,
      isPaid,
      // Add display properties for the calendar
      displayDate: dateObj,
      displayDateStr: format(dateObj, 'yyyy-MM-dd'),
      isRecurringInstance: true
    };
  }
  
  // Apply overrides but preserve the original ID and recurring properties
  return {
    ...transaction,
    ...overrides,
    isPaid, // Use our month-specific paid status
    id: transaction.id,
    isRecurring: transaction.isRecurring,
    recurringInterval: transaction.recurringInterval,
    recurringEndDate: transaction.recurringEndDate,
    // Add display properties for the calendar
    displayDate: dateObj,
    displayDateStr: format(dateObj, 'yyyy-MM-dd'),
    isRecurringInstance: true
  };
}

/**
 * Applies all instance-specific overrides to a list of transactions
 */
export function applyAllInstanceOverrides(
  transactions: TransactionWithCategory[]
): TransactionWithCategory[] {
  return transactions.map(transaction => {
    if (!transaction.isRecurring) return transaction;
    
    const dateToUse = (transaction as any).displayDate || transaction.date;
    return applyInstanceOverrides(transaction, dateToUse);
  }).filter(transaction => {
    // Filter out deleted instances
    if (!transaction.isRecurring) return true;
    
    const dateToUse = (transaction as any).displayDate || transaction.date;
    return !isInstanceDeleted(transaction, dateToUse);
  });
}