/**
 * A completely new implementation for storing and retrieving 
 * month-specific paid statuses for transactions
 */

import { format, parse } from 'date-fns';
import { Transaction } from '@shared/schema';

// List of transactions known to cause problems with paid status
const CRITICAL_TRANSACTION_TITLES = [
  'Netflix', 
  'Orange', 
  'Karma daisy', 
  'TRW', 
  'Replit',
  'upwork sub',
  'cancel sub'
];

/**
 * Generates a unique key for a specific transaction in a specific month/year
 */
export function generateStatusKey(title: string, date: Date | string): string {
  const normalizedDate = normalizeDate(date);
  const yearMonthStr = format(normalizedDate, 'yyyy-MM');
  
  // Create an absolutely unique key for this specific transaction in this specific month
  return `txn_status_${title}_${yearMonthStr}`;
}

/**
 * Normalizes a date to a standard Date object
 */
function normalizeDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }
  
  try {
    // Handle ISO string format
    if (typeof date === 'string' && date.includes('T')) {
      return new Date(date);
    }
    
    // Handle YYYY-MM-DD format
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        return new Date(
          parseInt(parts[0]), 
          parseInt(parts[1]) - 1, // JS months are 0-indexed
          parseInt(parts[2])
        );
      }
    }
    
    // Default fallback
    return new Date(date);
  } catch (e) {
    console.error(`[MONTH-SPECIFIC] Failed to normalize date: ${date}`, e);
    return new Date(); // Fallback to current date
  }
}

/**
 * Checks if a transaction is a critical transaction requiring special paid status handling
 */
export function isCriticalTransaction(transaction: Transaction): boolean {
  return CRITICAL_TRANSACTION_TITLES.includes(transaction.title);
}

/**
 * Gets the paid status for a transaction in a specific month
 */
export function getMonthSpecificPaidStatus(transaction: Transaction): boolean | null {
  if (!isCriticalTransaction(transaction)) {
    return null; // Only handle critical transactions
  }
  
  // We need a date to work with
  if (!transaction.date) {
    console.error(`[MONTH-SPECIFIC] Transaction has no date: ${transaction.title}`);
    return null;
  }
  
  const key = generateStatusKey(transaction.title, transaction.date);
  const storedValue = localStorage.getItem(key);
  
  console.log(`[MONTH-SPECIFIC] Checking status for ${transaction.title} with key ${key}. Found: ${storedValue}`);
  
  if (storedValue === null) {
    return null; // No stored status
  }
  
  return storedValue === 'true';
}

/**
 * Sets the paid status for a transaction in a specific month
 */
export function setMonthSpecificPaidStatus(transaction: Transaction, isPaid: boolean): void {
  if (!isCriticalTransaction(transaction)) {
    return; // Only handle critical transactions
  }
  
  // We need a date to work with
  if (!transaction.date) {
    console.error(`[MONTH-SPECIFIC] Transaction has no date: ${transaction.title}`);
    return;
  }
  
  const key = generateStatusKey(transaction.title, transaction.date);
  
  // Store the status
  localStorage.setItem(key, isPaid.toString());
  
  // Store debug information
  const debugInfo = {
    transactionTitle: transaction.title,
    originalDate: transaction.date instanceof Date 
      ? format(transaction.date, 'yyyy-MM-dd') 
      : String(transaction.date),
    isPaid: isPaid,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem(`${key}_debug`, JSON.stringify(debugInfo));
  
  console.log(`[MONTH-SPECIFIC] Set status for ${transaction.title} to ${isPaid} with key ${key}`);
}

/**
 * Clears ALL month-specific paid statuses from localStorage
 */
export function clearAllMonthSpecificStatuses(): number {
  let clearedCount = 0;
  
  // Get all keys in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('txn_status_') || key.includes('_debug'))) {
      localStorage.removeItem(key);
      clearedCount++;
    }
  }
  
  console.log(`[MONTH-SPECIFIC] Cleared ${clearedCount} month-specific statuses`);
  return clearedCount;
}