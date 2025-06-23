import { skipTransactionForMonth } from './skipMonthUtils';

/**
 * Debug utility to manually skip transactions that should have been skipped
 * Call this from the browser console to fix missing skips
 */
export function debugSkipTransactions() {
  const june2025 = new Date('2025-06-01');
  
  console.log('=== DEBUG: Manually skipping transactions for June 2025 ===');
  
  // Based on the user's report of skipping -47 PLN and -322.30 PLN worth of transactions
  // From the logs, Fryzjer (ID unknown) is 47 PLN
  // We'll need to identify the transaction IDs that match these amounts
  
  // First, let's check what transactions exist with these amounts
  console.log('Looking for transactions with amounts: 47 PLN and combinations totaling ~322.30 PLN');
  
  // We can try common recurring transaction IDs that might match
  // These would need to be updated with actual transaction IDs from the API
  
  const transactionsToSkip = [
    // Add transaction IDs here once identified
    // { id: X, amount: 47, name: 'Fryzjer' },
    // { id: Y, amount: Z, name: 'Transaction contributing to 322.30' }
  ];
  
  console.log('To use this utility, first identify the transaction IDs from the API response');
  console.log('Then call skipTransactionForMonth(transactionId, june2025) for each transaction');
  
  return {
    skipForJune: (transactionId: number) => {
      skipTransactionForMonth(transactionId, june2025);
      console.log(`Skipped transaction ${transactionId} for June 2025`);
    },
    checkAllSkipped: () => {
      // This would show all currently skipped transactions
      const skippedKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('skipped_transaction') && key.includes('2025-06')
      );
      console.log('Currently skipped transactions for June 2025:', skippedKeys);
      return skippedKeys;
    }
  };
}

// Make it available globally for debugging
(window as any).debugSkipTransactions = debugSkipTransactions;