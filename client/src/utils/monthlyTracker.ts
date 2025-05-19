import { format } from 'date-fns';

/**
 * Simple helper to track paid status of recurring transactions on a month-by-month basis
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