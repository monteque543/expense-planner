import { format } from "date-fns";
import { TransactionWithCategory } from "@shared/schema";

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
  
  console.log(`[PAID STATUS] Saved month-specific paid status for transaction ${transaction.id} (${transaction.title}): ${isPaid} for month ${monthKey}`);
  
  // For debugging, list the localStorage items
  let paidStatuses = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('transaction-') && key.includes('-paid-')) {
      paidStatuses.push({
        key,
        value: localStorage.getItem(key)
      });
    }
  }
  
  console.log(`[PAID STATUS DEBUG] Current paid statuses in localStorage:`, paidStatuses);
}

/**
 * Returns true if the transaction needs special handling for strict isolation
 */
export function requiresStrictIsolation(transaction: TransactionWithCategory): boolean {
  const strictIsolationNames = ['Netflix', 'Orange', 'Karma daisy', 'TRW', 'Replit', 'cancel sub'];
  return strictIsolationNames.includes(transaction.title);
}

/**
 * Alias for backward compatibility
 */
export const saveMonthlyPaidStatus = setMonthlyPaidStatus;

/**
 * Clears all monthly statuses from localStorage
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
 * Marks a recurring transaction instance as deleted for a specific month
 * @param transactionId The ID of the transaction to mark as deleted
 * @param date The date of the instance to delete
 */
export function markRecurringInstanceAsDeleted(transactionId: number, date: Date): void {
  // Create a month key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get existing deleted transactions for this month
  const existingDeleted = localStorage.getItem(storageKey);
  const deletedIds = existingDeleted ? JSON.parse(existingDeleted) : [];
  
  // Add this transaction to the deleted list if not already there
  if (!deletedIds.includes(transactionId)) {
    deletedIds.push(transactionId);
    localStorage.setItem(storageKey, JSON.stringify(deletedIds));
  }
  
  console.log(`Marked recurring transaction ${transactionId} as deleted for month ${monthKey}`);
}