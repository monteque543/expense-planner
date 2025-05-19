/**
 * Direct Paid Status Management
 * 
 * This is a simplified direct approach to storing and retrieving paid status 
 * for recurring transactions on a month-by-month basis.
 */

import { format } from "date-fns";

/**
 * Marks a recurring transaction as paid for a specific month
 */
export function setRecurringPaidStatus(transactionId: number, date: Date, isPaid: boolean): void {
  // Create a simple, deterministic key for this transaction and month
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid-status-${transactionId}-${monthKey}`;
  
  // Store the value directly
  localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
  console.log(`[DIRECT] Set paid status for transaction ${transactionId} to ${isPaid} for month ${monthKey}`);
}

/**
 * Gets the paid status of a recurring transaction for a specific month
 */
export function getRecurringPaidStatus(transactionId: number, date: Date): boolean {
  // Create the same deterministic key
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `paid-status-${transactionId}-${monthKey}`;
  
  // Get the value directly
  const status = localStorage.getItem(storageKey);
  return status === 'true';
}

/**
 * Marks a recurring transaction instance as deleted for a specific month
 */
export function setRecurringDeletedStatus(transactionId: number, date: Date, isDeleted: boolean): void {
  // Create a simple key for deleted status
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-status-${transactionId}-${monthKey}`;
  
  // Store the value directly
  localStorage.setItem(storageKey, isDeleted ? 'true' : 'false');
  console.log(`[DIRECT] Set deleted status for transaction ${transactionId} to ${isDeleted} for month ${monthKey}`);
}

/**
 * Gets the deleted status of a recurring transaction for a specific month
 */
export function getRecurringDeletedStatus(transactionId: number, date: Date): boolean {
  // Create the same key for deleted status
  const monthKey = format(date, 'yyyy-MM');
  const storageKey = `deleted-status-${transactionId}-${monthKey}`;
  
  // Get the value directly
  const status = localStorage.getItem(storageKey);
  return status === 'true';
}