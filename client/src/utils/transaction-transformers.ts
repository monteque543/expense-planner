import { Transaction, TransactionWithCategory } from "@shared/schema";
import { getPreferredAmount } from "./transaction-preferences";

/**
 * Apply user preferences to transactions coming from the server
 * This allows for client-side overrides of transaction data
 */
export function applyTransactionPreferences(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  return transactions.map(transaction => {
    // Apply preferences to any transaction with stored preferences
    // Get user's preferred amount from localStorage
    const preferredAmount = getPreferredAmount(transaction.title);
    
    if (preferredAmount !== null) {
      console.log(`[Client Override] Using preferred amount for ${transaction.title}: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
      return {
        ...transaction,
        amount: preferredAmount
      };
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
  // Get user's preferred amount from localStorage (for any transaction)
  const preferredAmount = getPreferredAmount(transaction.title);
  
  if (preferredAmount !== null) {
    console.log(`[Client Override] Using preferred amount for ${transaction.title}: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
    return {
      ...transaction,
      amount: preferredAmount
    };
  }
  
  // Return the transaction unchanged if no transformations apply
  return transaction;
}

/**
 * Specifically filter out problematic transactions on the client side
 * This is a backup to our server-side filtering
 */
export function filterTransactions(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  // First log all training app related transactions for debugging
  transactions.forEach(transaction => {
    if (transaction.title.toLowerCase().includes("training")) {
      console.log(`[DEBUG] Found training app transaction: "${transaction.title}" (ID: ${transaction.id}) on ${new Date(transaction.date).toISOString()}`);
    }
  });
  
  return transactions.filter(transaction => {
    // Ultra aggressive filtering with multiple approaches
    
    // Approach 1: Exact title match with specific titles
    const rpTrainingVariations = [
      "RP training app", 
      "Rp training app", 
      "rp training app",
      "RP Training App", 
      "Rp Training App",
      "Training App",
      "training app"
    ];
    
    if (rpTrainingVariations.includes(transaction.title) && transaction.date) {
      const date = new Date(transaction.date);
      
      // If in May 2025 or earlier, filter it out
      if (date.getFullYear() === 2025 && date.getMonth() <= 4) {
        console.log(`[CLIENT FILTER] Exact match - Removing "${transaction.title}" (ID: ${transaction.id}) from ${date.toISOString()}`);
        return false;
      }
    }
    
    // Approach 2: Case-insensitive substring match
    if (transaction.title.toLowerCase().includes("training") && 
        transaction.title.toLowerCase().includes("app") && 
        transaction.date) {
      const date = new Date(transaction.date);
      
      // If in May 2025 or earlier, filter it out
      if (date.getFullYear() === 2025 && date.getMonth() <= 4) {
        console.log(`[CLIENT FILTER] Substring match - Removing "${transaction.title}" (ID: ${transaction.id}) from ${date.toISOString()}`);
        return false;
      }
    }
    
    // General rule: For recurring transactions, only show instances after or on the original start date
    if (transaction.isRecurring && transaction.date) {
      const transactionDate = new Date(transaction.date);
      
      // Special case ID for "RP training app" - we know it starts in June 2025
      if (transaction.id === 58) {
        const rpStartDate = new Date(2025, 5, 12); // June 12, 2025
        
        if (transactionDate < rpStartDate) {
          console.log(`[FILTER] Removing RP training app ID ${transaction.id} from ${transactionDate.toISOString()} because it's before start date ${rpStartDate.toISOString()}`);
          return false;
        }
      }
      
      // For any recurring transaction, check if we have a modified start date
      const originalDate = localStorage.getItem(`recurring_start_date_${transaction.id}`);
      if (originalDate) {
        const startDate = new Date(originalDate);
        if (transactionDate < startDate) {
          console.log(`[FILTER] Removing recurring transaction ID ${transaction.id} from ${transactionDate.toISOString()} because it's before user-defined start date ${startDate.toISOString()}`);
          return false;
        }
      }
    }
    
    // Return true to keep all other transactions
    return true;
  });
}