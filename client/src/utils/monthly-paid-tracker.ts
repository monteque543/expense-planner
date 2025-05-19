/**
 * Simple Monthly Paid Status Tracker
 * 
 * This utility provides a straightforward way to track the paid status
 * of recurring transactions on a month-by-month basis.
 */

import { format } from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';

/**
 * Creates a key for storing paid status in localStorage
 */
function createPaidStatusKey(transactionId: number, date: Date): string {
  const monthKey = format(date, 'yyyy-MM');
  return `paid_status_${transactionId}_${monthKey}`;
}

/**
 * Set a transaction's paid status for a specific month
 */
export function setPaidStatus(transactionId: number, date: Date, isPaid: boolean): void {
  const key = createPaidStatusKey(transactionId, date);
  localStorage.setItem(key, isPaid ? 'true' : 'false');
  console.log(`[MONTHLY_PAID] Set transaction ${transactionId} paid status to ${isPaid} for ${format(date, 'yyyy-MM')}`);
}

/**
 * Get a transaction's paid status for a specific month
 */
export function getPaidStatus(transactionId: number, date: Date): boolean {
  const key = createPaidStatusKey(transactionId, date);
  return localStorage.getItem(key) === 'true';
}

/**
 * Creates a deletion key for storing deleted status in localStorage
 */
function createDeletedKey(transactionId: number, date: Date): string {
  const monthKey = format(date, 'yyyy-MM');
  return `deleted_${transactionId}_${monthKey}`;
}

/**
 * Mark a transaction as deleted for a specific month
 */
export function setDeletedStatus(transactionId: number, date: Date, isDeleted: boolean): void {
  const key = createDeletedKey(transactionId, date);
  localStorage.setItem(key, isDeleted ? 'true' : 'false');
  console.log(`[MONTHLY_DELETED] Set transaction ${transactionId} deleted status to ${isDeleted} for ${format(date, 'yyyy-MM')}`);
}

/**
 * Check if a transaction is deleted for a specific month
 */
export function getDeletedStatus(transactionId: number, date: Date): boolean {
  const key = createDeletedKey(transactionId, date);
  return localStorage.getItem(key) === 'true';
}