import { format } from "date-fns";
import { TransactionWithCategory } from "@shared/schema";

// List of transaction names that require strict isolation by month
const STRICT_ISOLATION_TRANSACTIONS = [
  'Netflix', 
  'Orange', 
  'Karma daisy', 
  'TRW', 
  'Replit', 
  'cancel sub'
];

/**
 * Checks if a transaction requires strict monthly isolation
 * @param transaction The transaction to check
 * @returns Boolean indicating if this transaction needs month-specific handling
 */
export function requiresStrictIsolation(transaction: TransactionWithCategory): boolean {
  return STRICT_ISOLATION_TRANSACTIONS.includes(transaction.title);
}

/**
 * Clears all monthly statuses from local storage
 * Use this to reset all saved states (for debugging)
 */
export function clearAllMonthlyStatuses(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('transaction-') || key.startsWith('deleted-recurring-instances-'))) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Extract the year and month from a date
 * @param date The date to extract from
 * @returns A string in format 'YYYY-MM'
 */
export function extractYearMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Gets the month-specific paid status for a transaction
 * This is used to isolate recurring transaction paid status by month
 * @param transaction The transaction to check
 * @param date The date to check (defaults to transaction date)
 * @returns Boolean indicating if this transaction is marked as paid for this month
 */
export function getMonthlyPaidStatus(
  transaction: TransactionWithCategory,
  date?: Date
): boolean {
  // If the transaction is not recurring, just return its paid status
  if (!transaction.isRecurring) {
    return !!transaction.isPaid;
  }
  
  // For recurring transactions, we need to check if this specific month's instance is paid
  const transactionDate = date || 
    (typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date);
  
  // Create a month key in format YYYY-MM
  const monthKey = format(transactionDate, 'yyyy-MM');
  
  // Create a storage key specific to this transaction and month
  const storageKey = `transaction-${transaction.id}-paid-${monthKey}`;
  
  // Check if we have a saved paid status for this month
  const savedStatus = localStorage.getItem(storageKey);
  
  // If we have a saved status, use it, otherwise use the transaction's default status
  return savedStatus !== null ? savedStatus === 'true' : !!transaction.isPaid;
}

/**
 * Sets the month-specific paid status for a transaction
 * @param transaction The transaction to modify
 * @param isPaid The new paid status
 * @param date The date to use (defaults to transaction date)
 */
export function setMonthlyPaidStatus(
  transaction: TransactionWithCategory,
  isPaid: boolean,
  date?: Date
): void {
  // Get the date to use
  const transactionDate = date || 
    (typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date);
  
  // Create a month key in format YYYY-MM
  const monthKey = format(transactionDate, 'yyyy-MM');
  
  // Create a storage key specific to this transaction and month
  const storageKey = `transaction-${transaction.id}-paid-${monthKey}`;
  
  // Save the paid status for this month
  localStorage.setItem(storageKey, isPaid.toString());
}