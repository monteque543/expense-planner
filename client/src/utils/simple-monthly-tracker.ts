/**
 * Super simple month-specific tracking utility
 * For recurring transactions paid/deleted status
 */

import { format } from 'date-fns';

/**
 * Mark paid status for a specific month/transaction
 */
export function markPaid(id: number, date: Date, isPaid: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  const key = `paid_${id}_${monthKey}`;
  localStorage.setItem(key, String(isPaid));
  console.log(`[MONTHLY] Marked transaction ${id} as ${isPaid ? 'PAID' : 'NOT PAID'} for ${monthKey}`);
}

/**
 * Check if paid for a specific month/transaction
 */
export function isPaidForMonth(id: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const key = `paid_${id}_${monthKey}`;
  return localStorage.getItem(key) === 'true';
}

/**
 * Mark deleted status for a specific month/transaction
 */
export function markDeleted(id: number, date: Date, isDeleted: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  const key = `deleted_${id}_${monthKey}`;
  localStorage.setItem(key, String(isDeleted));
  console.log(`[MONTHLY] Marked transaction ${id} as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if deleted for a specific month/transaction
 */
export function isDeletedForMonth(id: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  const key = `deleted_${id}_${monthKey}`;
  return localStorage.getItem(key) === 'true';
}

/**
 * Apply monthly status to transactions
 */
export function applyMonthlyStatus(transactions: any[]): any[] {
  return transactions
    .map(transaction => {
      // Only process recurring transactions
      if (transaction.isRecurring) {
        const dateToUse = transaction.displayDate || transaction.date;
        const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
        
        // Get month-specific paid status
        const monthlyPaidStatus = isPaidForMonth(transaction.id, dateObj);
        const hasPaidStatus = localStorage.getItem(`paid_${transaction.id}_${format(dateObj, 'yyyy-MM')}`) !== null;
        
        // Only override if we have a specific monthly status stored
        if (hasPaidStatus) {
          return { ...transaction, isPaid: monthlyPaidStatus };
        }
        
        return transaction;
      }
      
      return transaction;
    })
    .filter(transaction => {
      // Filter out deleted transactions for their specific month
      if (transaction.isRecurring) {
        const dateToUse = transaction.displayDate || transaction.date;
        const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
        
        // Skip if this specific instance is marked as deleted
        return !isDeletedForMonth(transaction.id, dateObj);
      }
      
      return true;
    });
}