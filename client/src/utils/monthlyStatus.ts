/**
 * Super simple month-specific tracking for recurring transactions
 */
import { format } from 'date-fns';

/**
 * Format a date into YYYY-MM format for storage keys
 */
function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Mark a transaction as paid for a specific month
 */
export function markPaid(id: number, date: Date, isPaid: boolean): void {
  const monthKey = getMonthKey(date);
  localStorage.setItem(`paid_${id}_${monthKey}`, isPaid ? 'true' : 'false');
  console.log(`[MONTHLY] Transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Check if a transaction is paid for a specific month
 */
export function isPaid(id: number, date: Date): boolean {
  const monthKey = getMonthKey(date);
  return localStorage.getItem(`paid_${id}_${monthKey}`) === 'true';
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function markDeleted(id: number, date: Date, isDeleted: boolean): void {
  const monthKey = getMonthKey(date);
  localStorage.setItem(`deleted_${id}_${monthKey}`, isDeleted ? 'true' : 'false');
  console.log(`[MONTHLY] Transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a transaction is deleted for a specific month
 */
export function isDeleted(id: number, date: Date): boolean {
  const monthKey = getMonthKey(date);
  return localStorage.getItem(`deleted_${id}_${monthKey}`) === 'true';
}

/**
 * Apply month-specific statuses to transactions
 */
export function applyMonthlyStatuses(transactions: any[]): any[] {
  return transactions
    .map(transaction => {
      // Only process recurring transactions
      if (!transaction.isRecurring) return transaction;
      
      // Get the appropriate date
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = new Date(typeof dateToUse === 'string' ? dateToUse : dateToUse);
      
      // Check if we have a month-specific paid status
      const monthKey = getMonthKey(dateObj);
      const hasPaidStatus = localStorage.getItem(`paid_${transaction.id}_${monthKey}`) !== null;
      
      // Only override if we have a specific status
      if (hasPaidStatus) {
        return {
          ...transaction,
          isPaid: isPaid(transaction.id, dateObj)
        };
      }
      
      return transaction;
    })
    .filter(transaction => {
      // Filter out deleted transactions
      if (!transaction.isRecurring) return true;
      
      const dateToUse = transaction.displayDate || transaction.date;
      const dateObj = new Date(typeof dateToUse === 'string' ? dateToUse : dateToUse);
      
      // Skip if marked as deleted for this month
      return !isDeleted(transaction.id, dateObj);
    });
}