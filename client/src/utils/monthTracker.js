/**
 * Simple month-specific tracker for recurring transactions
 */
import { format } from 'date-fns';

/**
 * Mark a transaction as paid for a specific month
 */
export function markPaid(id, date, isPaid) {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`paid_${id}_${monthKey}`, isPaid ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Get paid status for a transaction in a specific month
 */
export function isPaid(id, date) {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`paid_${id}_${monthKey}`) === 'true';
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function markDeleted(id, date, isDeleted) {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`deleted_${id}_${monthKey}`, isDeleted ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Get deletion status for a transaction in a specific month
 */
export function isDeleted(id, date) {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`deleted_${id}_${monthKey}`) === 'true';
}

/**
 * Process recurring transactions with month-specific status
 */
export function processTransactions(transactions) {
  if (!transactions || !Array.isArray(transactions)) return [];

  // Apply month-specific paid status
  const withPaidStatus = transactions.map(transaction => {
    if (!transaction.isRecurring) return transaction;

    const date = transaction.displayDate || transaction.date;
    const dateObj = new Date(typeof date === 'string' ? date : date);
    const monthKey = format(dateObj, 'yyyy-MM');
    
    // Check if we have a paid status for this month
    if (localStorage.getItem(`paid_${transaction.id}_${monthKey}`) !== null) {
      return {
        ...transaction,
        isPaid: isPaid(transaction.id, dateObj)
      };
    }
    
    return transaction;
  });
  
  // Filter out deleted transactions
  return withPaidStatus.filter(transaction => {
    if (!transaction.isRecurring) return true;
    
    const date = transaction.displayDate || transaction.date;
    const dateObj = new Date(typeof date === 'string' ? date : date);
    
    // Skip if deleted for this month
    return !isDeleted(transaction.id, dateObj);
  });
}