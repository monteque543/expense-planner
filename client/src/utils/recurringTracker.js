/**
 * Simple recurring transaction tracker for month-specific operations
 */
import { format } from 'date-fns';

/**
 * Mark a recurring transaction as paid for a specific month
 */
export function markPaid(id, date, isPaid) {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`paid_${id}_${monthKey}`, isPaid ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Get paid status for a recurring transaction in a specific month
 */
export function getPaidStatus(id, date) {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`paid_${id}_${monthKey}`) === 'true';
}

/**
 * Mark a recurring transaction as deleted for a specific month
 */
export function markDeleted(id, date, isDeleted) {
  const monthKey = format(date, 'yyyy-MM');
  localStorage.setItem(`deleted_${id}_${monthKey}`, isDeleted ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Get deletion status for a recurring transaction in a specific month
 */
export function getDeletedStatus(id, date) {
  const monthKey = format(date, 'yyyy-MM');
  return localStorage.getItem(`deleted_${id}_${monthKey}`) === 'true';
}

/**
 * Process transactions for monthly status
 */
export function processRecurringTransactions(transactions) {
  if (!transactions || !Array.isArray(transactions)) return [];

  // First apply paid status
  const withPaidStatus = transactions.map(transaction => {
    if (!transaction.isRecurring) return transaction;

    const date = transaction.displayDate || transaction.date;
    const dateObj = new Date(date);
    const monthKey = format(dateObj, 'yyyy-MM');
    
    // Check if we have a specific status for this month
    if (localStorage.getItem(`paid_${transaction.id}_${monthKey}`) !== null) {
      return {
        ...transaction,
        isPaid: getPaidStatus(transaction.id, dateObj)
      };
    }
    
    return transaction;
  });
  
  // Then filter out deleted transactions
  return withPaidStatus.filter(transaction => {
    if (!transaction.isRecurring) return true;
    
    const date = transaction.displayDate || transaction.date;
    const dateObj = new Date(date);
    
    // Skip if deleted for this month
    return !getDeletedStatus(transaction.id, dateObj);
  });
}