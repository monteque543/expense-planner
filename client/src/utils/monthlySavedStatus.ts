/**
 * Ultra-simple monthly status tracker for recurring transactions
 * 
 * This utility provides a straightforward approach to track status (paid/deleted)
 * on a per-month basis using a predictable localStorage key format
 */

import { format } from 'date-fns';

/**
 * Mark a transaction as paid for a specific month
 */
export function setPaidStatus(transactionId: number, date: Date, isPaid: boolean): void {
  // Create a simple month key in format: 2025-05
  const monthKey = format(date, 'yyyy-MM');
  // Simple storage key format
  const storageKey = `PAID_${transactionId}_${monthKey}`;
  
  // Store the value
  localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
  
  console.log(`[MONTHLY STATUS] Transaction ${transactionId} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Check if a transaction is paid for a specific month
 */
export function isPaid(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `PAID_${transactionId}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function setDeletedStatus(transactionId: number, date: Date, isDeleted: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `DELETED_${transactionId}_${monthKey}`;
  
  localStorage.setItem(storageKey, isDeleted ? 'true' : 'false');
  
  console.log(`[MONTHLY STATUS] Transaction ${transactionId} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a transaction is deleted for a specific month
 */
export function isDeleted(transactionId: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `DELETED_${transactionId}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Apply paid status to a list of transactions
 */
export function applyMonthlyStatuses(transactions: any[]): any[] {
  return transactions.map(transaction => {
    // Only process recurring transactions
    if (transaction.isRecurring) {
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
      
      // Apply the monthly paid status
      const monthlyIsPaid = isPaid(transaction.id, dateObj);
      
      // Return with updated status
      return {
        ...transaction,
        isPaid: monthlyIsPaid
      };
    }
    // Return non-recurring transactions as is
    return transaction;
  }).filter(transaction => {
    // Filter out deleted transactions
    if (transaction.isRecurring) {
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
      
      // Skip transactions that are marked as deleted for this month
      return !isDeleted(transaction.id, dateObj);
    }
    // Keep non-recurring transactions
    return true;
  });
}