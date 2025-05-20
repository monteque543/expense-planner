import { format } from 'date-fns';

/**
 * Utils for skipping recurring transactions in specific months
 */

// Mark a recurring transaction as skipped for a specific month
export function skipTransactionForMonth(transactionId: number, date: Date): void {
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
export function isTransactionSkippedForMonth(transactionId: number, date: Date): boolean {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    
    return localStorage.getItem(storageKey) === 'true';
  } catch (err) {
    console.error('Error retrieving skipped status:', err);
    return false;
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