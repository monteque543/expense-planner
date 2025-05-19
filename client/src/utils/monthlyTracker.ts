import { format } from 'date-fns';

/**
 * Simple helper to track paid status of recurring transactions on a month-by-month basis
 * and to track skipped months for recurring transactions
 */

// Mark a recurring transaction instance as paid for a specific month
export function markMonthlyTransactionAsPaid(transactionId: number, date: Date, isPaid: boolean): void {
  try {
    // Create a month-specific key (e.g. "2025-05")
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `paid_status_${transactionId}_${monthKey}`;
    
    // Store in localStorage
    localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
    
    console.log(`Transaction ${transactionId} marked as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
  } catch (err) {
    console.error('Error saving paid status to localStorage:', err);
  }
}

// Get the paid status for a specific month
export function getMonthlyTransactionPaidStatus(transactionId: number, date: Date): boolean {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `paid_status_${transactionId}_${monthKey}`;
    
    return localStorage.getItem(storageKey) === 'true';
  } catch (err) {
    console.error('Error retrieving paid status:', err);
    return false;
  }
}

// Clear all stored statuses (utility function)
export function clearAllMonthlyStatuses(): void {
  try {
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('paid_status_')) {
        localStorage.removeItem(key);
      }
    }
    console.log('Cleared all monthly paid statuses');
  } catch (err) {
    console.error('Error clearing statuses:', err);
  }
}

/**
 * SKIPPED MONTH TRACKING
 * These functions allow tracking which specific months have been skipped
 * for recurring transactions
 */

// Mark a recurring transaction as skipped for a specific month
export function skipRecurringTransactionForMonth(transactionId: number, date: Date): void {
  try {
    // Create a month-specific key (e.g. "2025-05")
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    
    // Store in localStorage
    localStorage.setItem(storageKey, 'true');
    
    console.log(`[SKIP MONTH] Transaction ${transactionId} marked as SKIPPED for ${monthKey}`);
    
    // Also add to master list for quick access
    updateSkippedMonthsList(transactionId, monthKey, true);
  } catch (err) {
    console.error('Error saving skipped status to localStorage:', err);
  }
}

// Check if a recurring transaction is skipped for a specific month
export function isRecurringTransactionSkipped(transactionId: number, date: Date): boolean {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    
    return localStorage.getItem(storageKey) === 'true';
  } catch (err) {
    console.error('Error retrieving skipped status:', err);
    return false;
  }
}

// Remove skip status (make transaction reappear in that month)
export function unskipRecurringTransactionForMonth(transactionId: number, date: Date): void {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    
    // Remove from localStorage
    localStorage.removeItem(storageKey);
    
    // Update master list
    updateSkippedMonthsList(transactionId, monthKey, false);
    
    console.log(`[UNSKIP MONTH] Transaction ${transactionId} skip status removed for ${monthKey}`);
  } catch (err) {
    console.error('Error removing skipped status:', err);
  }
}

// Helper to maintain a master list of all skipped months for each transaction
function updateSkippedMonthsList(transactionId: number, monthKey: string, isSkipped: boolean): void {
  try {
    const masterKey = `skipped_months_for_transaction_${transactionId}`;
    const existingData = localStorage.getItem(masterKey) || '[]';
    const skippedMonths = JSON.parse(existingData) as string[];
    
    if (isSkipped) {
      // Add month if not already in the list
      if (!skippedMonths.includes(monthKey)) {
        skippedMonths.push(monthKey);
      }
    } else {
      // Remove month from the list
      const index = skippedMonths.indexOf(monthKey);
      if (index > -1) {
        skippedMonths.splice(index, 1);
      }
    }
    
    // Save updated list back to localStorage
    localStorage.setItem(masterKey, JSON.stringify(skippedMonths));
  } catch (err) {
    console.error('Error updating skipped months master list:', err);
  }
}

// Get all skipped months for a transaction
export function getSkippedMonthsForTransaction(transactionId: number): string[] {
  try {
    const masterKey = `skipped_months_for_transaction_${transactionId}`;
    const existingData = localStorage.getItem(masterKey) || '[]';
    return JSON.parse(existingData) as string[];
  } catch (err) {
    console.error('Error retrieving skipped months list:', err);
    return [];
  }
}