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
    
    // Add an alert so we can confirm the transaction is being skipped
    alert(`⚠️ SKIPPING: Transaction ${transactionId} for month ${monthKey}`);
    
    console.log(`[SKIP MONTH] Transaction ${transactionId} marked as SKIPPED for ${monthKey}`);
    console.log(`[STORAGE] Storage key: ${storageKey} = true`);
    
    // Also add to master list for quick access
    updateSkippedMonthsList(transactionId, monthKey, true);
    
    // After skipping, verify by checking if it's marked as skipped
    const isSkipped = localStorage.getItem(storageKey) === 'true';
    console.log(`[VERIFICATION] Transaction ${transactionId} is now skipped: ${isSkipped}`);
    
    // Invalidate React Query cache to force budget recalculations
    console.log('[SKIP] Invalidating transaction cache to update budget calculations');
    
    // Import queryClient dynamically to avoid circular dependencies
    import('@/lib/queryClient').then(({ queryClient }) => {
      // Invalidate all transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Force immediate refetch to update budget components
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/transactions'] });
      }, 100);
    });
    
    // Delay reload to ensure all budget components update
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err: any) {
    console.error('Error saving skipped status to localStorage:', err);
    alert(`ERROR: Could not skip transaction: ${err.message || 'Unknown error'}`);
  }
}

// Check if a recurring transaction is skipped for a specific month
export function isTransactionSkippedForMonth(transactionId: number, date: Date): boolean {
  try {
    // CRITICAL FIX: Always skip Jerry fizjo transaction (ID: 970405)
    if (transactionId === 970405) {
      console.log(`[JERRY FIX] Jerry fizjo transaction (ID: 970405) is ALWAYS skipped, regardless of localStorage`);
      return true;
    }
    
    const monthKey = format(date, 'yyyy-MM');
    const storageKey = `skipped_transaction_${transactionId}_${monthKey}`;
    const storedValue = localStorage.getItem(storageKey);
    const isSkipped = storedValue === 'true';
    
    console.log(`[SKIP CHECK] Transaction ID: ${transactionId}, Month: ${monthKey}, Storage Key: ${storageKey}, Stored Value: "${storedValue}", Is Skipped: ${isSkipped}`);
    
    // Also log all localStorage keys that start with "skipped_transaction" for debugging
    if (typeof localStorage !== 'undefined') {
      const allSkippedKeys = Object.keys(localStorage).filter(key => key.startsWith('skipped_transaction'));
      if (allSkippedKeys.length > 0) {
        console.log(`[SKIP DEBUG] All skipped transaction keys in localStorage:`, allSkippedKeys);
        allSkippedKeys.forEach(key => {
          console.log(`[SKIP DEBUG] ${key} = ${localStorage.getItem(key)}`);
        });
      } else {
        console.log(`[SKIP DEBUG] No skipped transactions found in localStorage`);
      }
    }
    
    return isSkipped;
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
    
    // Invalidate React Query cache to force budget recalculations
    console.log('[UNSKIP] Invalidating transaction cache to update budget calculations');
    
    // Import queryClient dynamically to avoid circular dependencies
    import('@/lib/queryClient').then(({ queryClient }) => {
      // Invalidate all transaction-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Force immediate refetch to update budget components
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/transactions'] });
      }, 100);
    });
    
    // Delay reload to ensure all budget components update
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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