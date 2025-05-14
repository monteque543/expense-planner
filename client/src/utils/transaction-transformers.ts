import { Transaction, TransactionWithCategory } from "@shared/schema";
import { getPreferredAmount } from "./transaction-preferences";

/**
 * Apply user preferences to transactions coming from the server
 * This allows for client-side overrides of transaction data
 */
export function applyTransactionPreferences(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  return transactions.map(transaction => {
    // Special handling for Replit transaction
    if (transaction.title === "Replit") {
      // Get user's preferred amount from localStorage
      const preferredAmount = getPreferredAmount("Replit");
      
      if (preferredAmount !== null) {
        console.log(`[Client Override] Using preferred amount for Replit: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
        return {
          ...transaction,
          amount: preferredAmount
        };
      }
    }
    
    // Apply any other transaction-specific transformations here
    
    // Return the transaction unchanged if no transformations apply
    return transaction;
  });
}

/**
 * Apply preferences to a single transaction
 */
export function applyTransactionPreference(transaction: TransactionWithCategory): TransactionWithCategory {
  // Special handling for Replit transaction
  if (transaction.title === "Replit") {
    // Get user's preferred amount from localStorage
    const preferredAmount = getPreferredAmount("Replit");
    
    if (preferredAmount !== null) {
      console.log(`[Client Override] Using preferred amount for Replit: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
      return {
        ...transaction,
        amount: preferredAmount
      };
    }
  }
  
  // Return the transaction unchanged if no transformations apply
  return transaction;
}

/**
 * Specifically filter out problematic transactions on the client side
 * This is a backup to our server-side filtering
 */
export function filterTransactions(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  return transactions.filter(transaction => {
    // Filter out "RP training app" from May
    if ((transaction.title === "RP training app" || transaction.title === "Rp training app") 
        && transaction.date) {
      const date = new Date(transaction.date);
      
      // If in May 2025 or earlier, filter it out
      if (date.getFullYear() === 2025 && date.getMonth() <= 4) {
        console.log(`[Client Filter] Removing "${transaction.title}" from ${date.toISOString()}`);
        return false;
      }
    }
    
    // Return true to keep all other transactions
    return true;
  });
}