/**
 * Simple recurring transaction tracker for month-specific operations
 */
import { format } from 'date-fns';

// Define storage keys
const PAID_KEY_PREFIX = 'recurring_paid_';
const DELETED_KEY_PREFIX = 'recurring_deleted_';

/**
 * Mark a recurring transaction as paid for a specific month
 */
export function markPaid(id, date, isPaid) {
  if (!id || !date) return;
  
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `${PAID_KEY_PREFIX}${id}_${monthKey}`;
  
  localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
  console.log(`Recurring transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Get paid status for a recurring transaction in a specific month
 */
export function getPaidStatus(id, date) {
  if (!id || !date) return false;
  
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `${PAID_KEY_PREFIX}${id}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark a recurring transaction as deleted for a specific month
 */
export function markDeleted(id, date, isDeleted) {
  if (!id || !date) return;
  
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `${DELETED_KEY_PREFIX}${id}_${monthKey}`;
  
  localStorage.setItem(storageKey, isDeleted ? 'true' : 'false');
  console.log(`Recurring transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Get deletion status for a recurring transaction in a specific month
 */
export function getDeletedStatus(id, date) {
  if (!id || !date) return false;
  
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `${DELETED_KEY_PREFIX}${id}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Process transactions for monthly status
 */
export function processRecurringTransactions(transactions) {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  return transactions
    // First apply paid status
    .map(transaction => {
      if (!transaction.isRecurring) {
        return transaction;
      }

      // For recurring transactions, check month-specific paid status
      const date = transaction.displayDate || new Date(transaction.date);
      const isPaidForMonth = getPaidStatus(transaction.id, date);
      
      // Only override if we have a specific status for this month
      if (localStorage.getItem(`${PAID_KEY_PREFIX}${transaction.id}_${format(date, 'yyyy-MM')}`) !== null) {
        return {
          ...transaction,
          isPaid: isPaidForMonth
        };
      }
      
      return transaction;
    })
    // Then filter out deleted transactions
    .filter(transaction => {
      if (!transaction.isRecurring) {
        return true;
      }
      
      // For recurring transactions, check month-specific deletion status
      const date = transaction.displayDate || new Date(transaction.date);
      return !getDeletedStatus(transaction.id, date);
    });
}