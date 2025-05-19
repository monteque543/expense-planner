/**
 * Ultra simple month-specific tracker for recurring transactions
 */
import { format } from 'date-fns';

/**
 * Set a transaction as paid for a specific month
 */
export function setPaid(id: number, date: Date, isPaid: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`paid_${id}_${monthKey}`, isPaid ? 'true' : 'false');
  console.log(`[TRACKER] Transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Check if a transaction is paid for a specific month
 */
export function isPaid(id: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`paid_${id}_${monthKey}`) === 'true';
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function setDeleted(id: number, date: Date, isDeleted: boolean): void {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`deleted_${id}_${monthKey}`, isDeleted ? 'true' : 'false');
  console.log(`[TRACKER] Transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a transaction is deleted for a specific month
 */
export function isDeleted(id: number, date: Date): boolean {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`deleted_${id}_${monthKey}`) === 'true';
}

/**
 * Process recurring transactions to apply month-specific statuses
 */
export function processRecurringTransactions(transactions: any[]): any[] {
  return transactions.map(transaction => {
    if (!transaction.isRecurring) return transaction;
    
    // For recurring transactions, check month-specific status
    const dateToUse = transaction.displayDate || transaction.date;
    const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
    
    // Check if we have a month-specific paid status
    const hasPaidStatus = localStorage.getItem(`paid_${transaction.id}_${format(dateObj, 'yyyy-MM')}`) !== null;
    
    // Only update if we have a specific paid status for this month
    if (hasPaidStatus) {
      transaction = { 
        ...transaction, 
        isPaid: isPaid(transaction.id, dateObj) 
      };
    }
    
    return transaction;
  }).filter(transaction => {
    if (!transaction.isRecurring) return true;
    
    // Filter out deleted instances
    const dateToUse = transaction.displayDate || transaction.date;
    const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
    
    // Skip if marked as deleted for this month
    return !isDeleted(transaction.id, dateObj);
  });
}