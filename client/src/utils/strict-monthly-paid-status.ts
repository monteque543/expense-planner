/**
 * A completely new implementation for handling recurring transactions
 * with a strict month-by-month isolation of paid status.
 * 
 * This is separate from other implementations to provide a clean break
 * and ensure all related transactions are handled consistently.
 */

import { format, parse, isValid, parseISO } from 'date-fns';
import { Transaction } from '@shared/schema';

// List of transaction titles that require strict month isolation
export const STRICT_ISOLATION_TRANSACTIONS = [
  'Netflix', 
  'Orange', 
  'Karma daisy', 
  'TRW', 
  'Replit',
  'upwork sub',
  'cancel sub',
  'webflow',
  'domain'
];

// The localStorage key prefix to use for storing status
const STORAGE_PREFIX = "monthly_strict_";

/**
 * Checks if a transaction requires strict monthly isolation
 */
export function requiresStrictIsolation(transaction: Transaction | string): boolean {
  const title = typeof transaction === 'string' ? transaction : transaction.title;
  return STRICT_ISOLATION_TRANSACTIONS.includes(title);
}

/**
 * Extracts a reliable year-month string from a date
 */
export function extractYearMonth(date: Date | string): string {
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // Try ISO format first
    dateObj = parseISO(date);
    
    // If not valid, try different format
    if (!isValid(dateObj)) {
      // Try YYYY-MM-DD format
      try {
        const parts = date.split('-');
        if (parts.length >= 2) {
          return `${parts[0]}-${parts[1]}`; // Just extract year-month directly
        }
      } catch (e) {
        console.error(`Failed to extract year-month from ${date}`, e);
      }
      
      // Fallback to current date
      console.log(`Invalid date ${date}, using current date`);
      dateObj = new Date();
    }
  } else {
    console.error(`Invalid date type: ${typeof date}`);
    dateObj = new Date();
  }
  
  return format(dateObj, 'yyyy-MM');
}

/**
 * Creates a unique storage key for a transaction in a specific month
 */
export function createMonthlyKey(transaction: Transaction | string, date: Date | string): string {
  const title = typeof transaction === 'string' ? transaction : transaction.title;
  const yearMonth = extractYearMonth(date);
  
  // Create a unique key with title and year-month
  return `${STORAGE_PREFIX}${title.replace(/\s+/g, '_')}_${yearMonth}`;
}

/**
 * Saves the paid status for a transaction in a specific month
 */
export function saveMonthlyPaidStatus(
  transaction: Transaction | string, 
  date: Date | string, 
  isPaid: boolean
): void {
  const storageKey = createMonthlyKey(transaction, date);
  
  // Store the value
  localStorage.setItem(storageKey, isPaid.toString());
  
  // Store debug information
  const title = typeof transaction === 'string' ? transaction : transaction.title;
  const yearMonth = extractYearMonth(date);
  
  const debugInfo = {
    title,
    yearMonth,
    isPaid,
    savedAt: new Date().toISOString()
  };
  
  localStorage.setItem(`${storageKey}_debug`, JSON.stringify(debugInfo));
  
  console.log(`[STRICT ISOLATION] Saved '${title}' status for ${yearMonth}: ${isPaid}`);
  
  // Test that the value was saved properly
  const checkValue = localStorage.getItem(storageKey);
  console.log(`[STRICT ISOLATION] Verification check: ${checkValue}`);
}

/**
 * Loads the paid status for a transaction in a specific month
 */
export function getMonthlyPaidStatus(
  transaction: Transaction | string, 
  date: Date | string
): boolean | null {
  const storageKey = createMonthlyKey(transaction, date);
  const storedValue = localStorage.getItem(storageKey);
  
  const title = typeof transaction === 'string' ? transaction : transaction.title;
  const yearMonth = extractYearMonth(date);
  
  if (storedValue !== null) {
    const isPaid = storedValue === 'true';
    console.log(`[STRICT ISOLATION] Found '${title}' status for ${yearMonth}: ${isPaid}`);
    return isPaid;
  }
  
  console.log(`[STRICT ISOLATION] No saved status for '${title}' in ${yearMonth}`);
  return null;
}

/**
 * Clear all stored statuses
 */
export function clearAllMonthlyStatuses(): number {
  let count = 0;
  
  // Get all keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
      count++;
    }
  }
  
  console.log(`[STRICT ISOLATION] Cleared ${count} monthly status records`);
  return count;
}

// Export a function that applies the monthly status directly to a transaction
export function applyStrictMonthlyStatus(transaction: Transaction): Transaction {
  if (!requiresStrictIsolation(transaction)) {
    return transaction;
  }
  
  // Get the correct transaction date to use
  const transactionDate = transaction.date;
  if (!transactionDate) {
    console.log(`[STRICT ISOLATION] Transaction ${transaction.title} has no date`);
    return transaction;
  }
  
  // Get the paid status for this specific month
  const status = getMonthlyPaidStatus(transaction, transactionDate);
  
  // Only modify if we have a stored value
  if (status !== null) {
    return {
      ...transaction,
      isPaid: status
    };
  }
  
  return transaction;
}