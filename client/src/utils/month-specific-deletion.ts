/**
 * Month-specific deletion utility for recurring transactions
 * 
 * This utility allows deleting specific instances of recurring transactions
 * without affecting the base transaction or other months.
 */

import { format } from 'date-fns';

/**
 * Get a storage key for a specific transaction in a specific month
 */
const getMonthlyDeleteKey = (transactionId: number, date: Date): string => {
  const monthKey = format(date, 'yyyy-MM');
  return `deleted_${transactionId}_${monthKey}`;
};

/**
 * Mark a recurring transaction as deleted for a specific month
 */
export const markTransactionDeletedForMonth = (transactionId: number, date: Date): void => {
  const key = getMonthlyDeleteKey(transactionId, date);
  localStorage.setItem(key, 'true');
  console.log(`[MONTH DELETION] Marked transaction ${transactionId} as deleted for month ${format(date, 'yyyy-MM')}`);
};

/**
 * Check if a recurring transaction is deleted for a specific month
 */
export const isTransactionDeletedForMonth = (transactionId: number, date: Date): boolean => {
  const key = getMonthlyDeleteKey(transactionId, date);
  return localStorage.getItem(key) === 'true';
};

/**
 * Unmark a recurring transaction as deleted for a specific month
 */
export const unmarkTransactionDeletedForMonth = (transactionId: number, date: Date): void => {
  const key = getMonthlyDeleteKey(transactionId, date);
  localStorage.removeItem(key);
  console.log(`[MONTH DELETION] Unmarked transaction ${transactionId} as deleted for month ${format(date, 'yyyy-MM')}`);
};