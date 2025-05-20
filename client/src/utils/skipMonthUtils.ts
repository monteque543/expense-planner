import { format } from 'date-fns';

/**
 * Utils for skipping recurring transactions in specific months
 * Includes functions to skip and unskip transactions for specific months
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
    
    // Force a complete hard reload to fix any stale data
    window.location.href = "/";
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

// Unskip a transaction for a specific month (restore it)
export function unskipTransactionForMonth(transactionId: number, date: Date): void {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    
    // Remove from localStorage
    localStorage.removeItem(storageKey);
    
    // Update master list
    updateSkippedMonthsList(transactionId, monthKey, false);
    
    console.log(`[UNSKIP] Transaction ${transactionId} unskipped for ${monthKey} - will now appear again`);
    
    // Force a complete hard reload to fix any stale data
    window.location.href = "/";
  } catch (err) {
    console.error('Error unskipping transaction:', err);
  }
}

// Get all skipped transactions for the current month
export function getSkippedTransactionsForMonth(date: Date): number[] {
  try {
    const monthKey = format(date, 'yyyy-MM');
    const skippedIds: number[] = [];
    
    // Scan localStorage for all skipped transactions in this month
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`skipped_transaction_`) && key.endsWith(`_${monthKey}`)) {
        // Extract transaction ID from the key
        const idMatch = key.match(/skipped_transaction_(\d+)_/);
        if (idMatch && idMatch[1]) {
          skippedIds.push(parseInt(idMatch[1], 10));
        }
      }
    }
    
    return skippedIds;
  } catch (err) {
    console.error('Error getting skipped transactions for month:', err);
    return [];
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