import { Transaction } from "@shared/schema";
import { format, parseISO } from "date-fns";

/**
 * Utilities for handling month-specific deletion of recurring transactions
 * This ensures that a recurring transaction can be hidden for just one month
 * without affecting other months.
 */

/**
 * Checks if a recurring transaction instance is deleted for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date to check (month and year are used)
 * @returns true if this instance has been marked as deleted for this month
 */
export function isRecurringInstanceDeletedForMonth(
  transactionId: number,
  date: Date
): boolean {
  // Format the month-year key
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get the deleted transaction IDs for this month
  const existingData = localStorage.getItem(storageKey);
  if (!existingData) return false;
  
  try {
    const deletedIds = JSON.parse(existingData);
    return deletedIds.includes(transactionId);
  } catch (error) {
    console.error(`Error parsing deleted instances for ${monthKey}:`, error);
    return false;
  }
}

/**
 * Marks a recurring transaction instance as deleted for a specific month
 * This does not affect other months or permanently delete the transaction
 * @param transactionId The ID of the transaction to mark as deleted
 * @param date The date (month and year are used)
 * @returns The resulting array of deleted IDs for the month
 */
export function markRecurringInstanceAsDeletedForMonth(
  transactionId: number,
  date: Date
): number[] {
  // Format the month-year key
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get existing deleted transaction IDs for this month
  const existingData = localStorage.getItem(storageKey);
  const deletedIds = existingData ? JSON.parse(existingData) : [];
  
  // Add this transaction ID if not already present
  if (!deletedIds.includes(transactionId)) {
    deletedIds.push(transactionId);
    localStorage.setItem(storageKey, JSON.stringify(deletedIds));
    console.log(`[MONTH DELETION] Marked transaction ${transactionId} as deleted for ${monthKey}`);
  }
  
  return deletedIds;
}

/**
 * Unmarks a recurring transaction instance as deleted for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date (month and year are used)
 * @returns The resulting array of deleted IDs for the month
 */
export function unmarkRecurringInstanceAsDeletedForMonth(
  transactionId: number,
  date: Date
): number[] {
  // Format the month-year key
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get existing deleted transaction IDs for this month
  const existingData = localStorage.getItem(storageKey);
  if (!existingData) return [];
  
  const deletedIds = JSON.parse(existingData);
  const newDeletedIds = deletedIds.filter((id: number) => id !== transactionId);
  
  // Update storage if the array changed
  if (newDeletedIds.length !== deletedIds.length) {
    localStorage.setItem(storageKey, JSON.stringify(newDeletedIds));
    console.log(`[MONTH DELETION] Unmarked transaction ${transactionId} as deleted for ${monthKey}`);
  }
  
  return newDeletedIds;
}

/**
 * Gets all transactions marked as deleted for a specific month
 * @param date The date (month and year are used)
 * @returns Array of transaction IDs that are marked as deleted for this month
 */
export function getDeletedRecurringInstancesForMonth(date: Date): number[] {
  // Format the month-year key
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get the deleted transaction IDs for this month
  const existingData = localStorage.getItem(storageKey);
  if (!existingData) return [];
  
  try {
    return JSON.parse(existingData);
  } catch (error) {
    console.error(`Error parsing deleted instances for ${monthKey}:`, error);
    return [];
  }
}

/**
 * Enhances transaction list by filtering out monthly deleted instances
 * @param transactions List of transactions including recurring instances
 * @param date The date representing the month to check
 * @returns Filtered transactions with deleted instances removed
 */
export function filterDeletedRecurringInstances<T extends Transaction>(
  transactions: T[],
  date: Date
): T[] {
  const deletedIds = getDeletedRecurringInstancesForMonth(date);
  
  if (deletedIds.length === 0) return transactions;
  
  return transactions.filter(transaction => {
    // Skip non-recurring transactions
    if (!transaction.isRecurring) return true;
    
    // For recurring transactions, check if this instance is deleted for this month
    if (deletedIds.includes(transaction.id)) {
      // Get the transaction date
      const txDate = transaction.date;
      const txDateObj = typeof txDate === 'string' ? parseISO(txDate) : txDate;
      const txMonthKey = format(txDateObj, 'yyyy-MM');
      const dateMonthKey = format(date, 'yyyy-MM');
      
      // Only filter out if both transaction and reference date are in the same month
      if (txMonthKey === dateMonthKey) {
        console.log(`[MONTH DELETION] Filtering out deleted instance of ${transaction.title} for ${dateMonthKey}`);
        return false;
      }
    }
    
    return true;
  });
}