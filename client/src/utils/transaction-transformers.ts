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
    
    // Approach 3: Filter by known transaction ID if we can identify it
    // We can add specific IDs here if we find them in the logs
    const knownRpTrainingAppIds: number[] = []; // Add IDs here if found
    if (transaction.id && knownRpTrainingAppIds.includes(transaction.id) && transaction.date) {
      const date = new Date(transaction.date);
      if (date.getFullYear() === 2025 && date.getMonth() <= 4) {
        console.log(`[CLIENT FILTER] ID match - Removing transaction ID ${transaction.id} from ${date.toISOString()}`);
        return false;
      }
    }
    
    // Return true to keep all other transactions
    return true;
  });
}