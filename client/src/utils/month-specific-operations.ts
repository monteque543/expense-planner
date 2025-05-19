/**
 * Direct utility for month-specific operations on recurring transactions
 * 
 * This utility provides direct localStorage-based tracking of paid and deleted status
 * for recurring transactions on a month-by-month basis.
 */

import { format } from 'date-fns';

/**
 * Mark a recurring transaction as paid for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date of the instance (used to determine the month)
 * @param isPaid Whether the transaction is paid or not
 */
export function setMonthlyPaidStatus(transactionId: number, date: Date, isPaid: boolean): void {
  // Create a key in format YYYY-MM
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid_${transactionId}_${monthKey}`;
  
  localStorage.setItem(storageKey, String(isPaid));
  console.log(`[MONTHLY] Transaction ${transactionId} marked as ${isPaid ? 'PAID' : 'NOT PAID'} for ${monthKey}`);
}

/**
 * Check if a recurring transaction is paid for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date of the instance (used to determine the month)
 * @returns Boolean indicating if the transaction is paid for that month
 */
export function getMonthlyPaidStatus(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid_${transactionId}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark a recurring transaction as deleted for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date of the instance (used to determine the month)
 * @param isDeleted Whether the transaction is deleted or not
 */
export function setMonthlyDeletedStatus(transactionId: number, date: Date, isDeleted: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted_${transactionId}_${monthKey}`;
  
  localStorage.setItem(storageKey, String(isDeleted));
  console.log(`[MONTHLY] Transaction ${transactionId} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a recurring transaction is deleted for a specific month
 * @param transactionId The ID of the transaction
 * @param date The date of the instance (used to determine the month)
 * @returns Boolean indicating if the transaction is deleted for that month
 */
export function getMonthlyDeletedStatus(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted_${transactionId}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Apply monthly statuses to a list of transactions
 * - Overrides isPaid based on monthly status for recurring transactions
 * - Filters out transactions that are marked as deleted for the current month
 */
export function applyMonthlyStatuses(transactions: any[]): any[] {
  return transactions
    .map(transaction => {
      // Only process recurring transactions
      if (transaction.isRecurring) {
        // Get the date to use (either the specific instance date or the original date)
        const dateToUse = transaction.displayDate || transaction.date;
        const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
        
        // Apply monthly paid status
        const monthlyIsPaid = getMonthlyPaidStatus(transaction.id, dateObj);
        
        // If we have a monthly status stored, use it; otherwise keep original
        const finalIsPaid = localStorage.getItem(`paid_${transaction.id}_${format(dateObj, 'yyyy-MM')}`) !== null
          ? monthlyIsPaid
          : transaction.isPaid;
          
        return {
          ...transaction,
          isPaid: finalIsPaid
        };
      }
      
      // Return non-recurring transactions unchanged
      return transaction;
    })
    .filter(transaction => {
      // Filter out transactions marked as deleted for their month
      if (transaction.isRecurring) {
        const dateToUse = transaction.displayDate || transaction.date;
        const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
        
        // Skip if marked as deleted for this month
        return !getMonthlyDeletedStatus(transaction.id, dateObj);
      }
      
      // Keep all non-recurring transactions
      return true;
    });
}