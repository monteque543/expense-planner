/**
 * Super simple month-specific tracking for recurring transactions
 */
import { format } from 'date-fns';

// Define storage key prefixes
const PAID_KEY_PREFIX = 'recurring_paid_';
const DELETED_KEY_PREFIX = 'recurring_deleted_';

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
  const storageKey = `${PAID_KEY_PREFIX}${id}_${monthKey}`;
  
  localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
}

/**
 * Check if a transaction is paid for a specific month
 */
export function isPaid(id: number, date: Date): boolean {
  const monthKey = getMonthKey(date);
  const storageKey = `${PAID_KEY_PREFIX}${id}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function markDeleted(id: number, date: Date, isDeleted: boolean): void {
  const monthKey = getMonthKey(date);
  const storageKey = `${DELETED_KEY_PREFIX}${id}_${monthKey}`;
  
  localStorage.setItem(storageKey, isDeleted ? 'true' : 'false');
  console.log(`Transaction ${id} marked as ${isDeleted ? 'DELETED' : 'VISIBLE'} for ${monthKey}`);
}

/**
 * Check if a transaction is deleted for a specific month
 */
export function isDeleted(id: number, date: Date): boolean {
  const monthKey = getMonthKey(date);
  const storageKey = `${DELETED_KEY_PREFIX}${id}_${monthKey}`;
  
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Apply month-specific statuses to transactions
 */
export function applyMonthlyStatuses(transactions: any[]): any[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  // First apply paid status
  const withPaidStatus = transactions.map(transaction => {
    if (!transaction.isRecurring) {
      return transaction;
    }

    // For recurring transactions, get the display date or original date
    const date = transaction.displayDate || new Date(transaction.date);
    
    // Check if we have a specific paid status for this month
    const monthKey = getMonthKey(date);
    if (localStorage.getItem(`${PAID_KEY_PREFIX}${transaction.id}_${monthKey}`) !== null) {
      return {
        ...transaction,
        isPaid: isPaid(transaction.id, date)
      };
    }
    
    return transaction;
  });
  
  // Then filter out deleted transactions
  return withPaidStatus.filter(transaction => {
    if (!transaction.isRecurring) {
      return true;
    }
    
    // For recurring transactions, check if it's deleted for this month
    const date = transaction.displayDate || new Date(transaction.date);
    return !isDeleted(transaction.id, date);
  });
}

/**
 * Clear all monthly statuses (for testing purposes)
 */
export function clearAllMonthlyStatuses(): number {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (key.startsWith(PAID_KEY_PREFIX) || key.startsWith(DELETED_KEY_PREFIX)) {
      localStorage.removeItem(key);
      cleared++;
    }
  });
  
  console.log(`[CLEAR] Cleared ${cleared} monthly status entries`);
  return cleared;
}