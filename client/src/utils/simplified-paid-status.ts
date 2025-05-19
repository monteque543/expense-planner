/**
 * Simplified Month-Specific Paid Status Tracker
 * 
 * This straightforward utility manages the paid status of recurring transactions
 * on a month-by-month basis without complex implementation details.
 */

import { format } from 'date-fns';

/**
 * Mark a recurring transaction as paid for a specific month
 */
export function markRecurringTransactionAsPaid(transactionId: number, date: Date, isPaid: boolean) {
  // Create a simple key format based on transaction ID and month
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid_status_${transactionId}_${monthKey}`;
  
  // Save the status directly to localStorage
  localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
  
  console.log(`[PAID STATUS] Transaction ${transactionId} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Check if a recurring transaction is marked as paid for a specific month
 */
export function isRecurringTransactionPaid(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid_status_${transactionId}_${monthKey}`;
  
  // Get status from localStorage
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark a recurring transaction as deleted for a specific month
 */
export function markRecurringTransactionAsDeleted(transactionId: number, date: Date, isDeleted: boolean) {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted_status_${transactionId}_${monthKey}`;
  
  // Save the deletion status directly to localStorage
  localStorage.setItem(storageKey, isDeleted ? 'true' : 'false');
  
  console.log(`[DELETED STATUS] Transaction ${transactionId} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a recurring transaction is marked as deleted for a specific month
 */
export function isRecurringTransactionDeleted(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted_status_${transactionId}_${monthKey}`;
  
  // Get deletion status from localStorage
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Apply paid status to an array of transactions based on their stored status
 */
export function applyPaidStatus(transactions: any[]): any[] {
  return transactions.map(transaction => {
    if (transaction.isRecurring) {
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
      
      // Get the saved paid status for this transaction in this month
      const isPaid = isRecurringTransactionPaid(transaction.id, dateObj);
      
      // Apply the paid status to the transaction
      return {
        ...transaction,
        isPaid
      };
    }
    
    // Return unchanged for non-recurring transactions
    return transaction;
  });
}

/**
 * Filter out transactions that are marked as deleted for their specific month
 */
export function filterDeletedTransactions(transactions: any[]): any[] {
  return transactions.filter(transaction => {
    if (transaction.isRecurring) {
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
      
      // Check if this transaction is marked as deleted for this month
      return !isRecurringTransactionDeleted(transaction.id, dateObj);
    }
    
    // Keep non-recurring transactions
    return true;
  });
}