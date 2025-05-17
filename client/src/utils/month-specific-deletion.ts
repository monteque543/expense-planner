import { format } from "date-fns";

/**
 * Marks a recurring transaction instance as deleted for a specific month
 * @param transactionId The ID of the transaction to mark as deleted
 * @param date The date of the instance to delete (used to determine the month)
 */
export function markRecurringInstanceAsDeleted(transactionId: number, date: Date): void {
  // Create a month key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get any existing deleted instances for this month
  const existingData = localStorage.getItem(storageKey);
  const existingIds = existingData ? JSON.parse(existingData) : [];
  
  // Add this transaction ID if not already present
  if (!existingIds.includes(transactionId)) {
    existingIds.push(transactionId);
    localStorage.setItem(storageKey, JSON.stringify(existingIds));
  }
  
  console.log(`Marked recurring transaction ${transactionId} as deleted for month ${monthKey}`);
}

/**
 * Checks if a recurring transaction instance has been deleted for a specific month
 * @param transactionId The ID of the transaction to check
 * @param date The date of the instance to check (used to determine the month)
 * @returns True if the instance has been deleted, false otherwise
 */
export function isRecurringInstanceDeleted(transactionId: number, date: Date): boolean {
  // Create a month key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get any existing deleted instances for this month
  const existingData = localStorage.getItem(storageKey);
  const existingIds = existingData ? JSON.parse(existingData) : [];
  
  // Check if this transaction ID is in the deleted list
  return existingIds.includes(transactionId);
}

/**
 * Gets all deleted recurring transaction instances for a specific month
 * @param date The date to check (used to determine the month)
 * @returns Array of transaction IDs that have been deleted for this month
 */
export function getDeletedRecurringInstances(date: Date): number[] {
  // Create a month key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get any existing deleted instances for this month
  const existingData = localStorage.getItem(storageKey);
  return existingData ? JSON.parse(existingData) : [];
}

/**
 * Removes a recurring transaction instance from the deleted list for a specific month
 * @param transactionId The ID of the transaction to remove from the deleted list
 * @param date The date of the instance to restore (used to determine the month)
 */
export function restoreDeletedRecurringInstance(transactionId: number, date: Date): void {
  // Create a month key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-recurring-instances-${monthKey}`;
  
  // Get any existing deleted instances for this month
  const existingData = localStorage.getItem(storageKey);
  const existingIds = existingData ? JSON.parse(existingData) : [];
  
  // Remove this transaction ID from the deleted list
  const updatedIds = existingIds.filter((id: number) => id !== transactionId);
  localStorage.setItem(storageKey, JSON.stringify(updatedIds));
  
  console.log(`Restored recurring transaction ${transactionId} for month ${monthKey}`);
}