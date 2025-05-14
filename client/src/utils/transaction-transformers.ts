import { Transaction, TransactionWithCategory } from "@shared/schema";
import { getPreferredAmount, getOccurrencePaidStatus } from "./transaction-preferences";

/**
 * Apply user preferences to transactions coming from the server
 * This allows for client-side overrides of transaction data
 */
export function applyTransactionPreferences(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  return transactions.map(transaction => {
    // Create a new transaction object to apply modifications
    let modifiedTransaction = { ...transaction };
    
    // Apply preferences to any transaction with stored preferences
    // Get user's preferred amount from localStorage
    const preferredAmount = getPreferredAmount(transaction.title);
    
    if (preferredAmount !== null) {
      console.log(`[Client Override] Using preferred amount for ${transaction.title}: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
      modifiedTransaction.amount = preferredAmount;
    }
    
    // Apply paid status for recurring transaction occurrences
    // Use type assertion to handle dynamic properties
    const transactionAny = transaction as any;
    
    // Debug logging to see what's happening with each transaction
    console.log(`[Transformer Debug] Processing transaction: ${transaction.title}, isRecurring: ${transaction.isRecurring}, isRecurringInstance: ${transactionAny.isRecurringInstance ? true : false}, displayDate: ${transactionAny.displayDate || 'none'}`);
    
    // Check if this is a recurring instance by either the isRecurringInstance flag or if it's a recurring transaction
    if ((transactionAny.isRecurringInstance || transaction.isRecurring) && transaction.date) {
      // Use displayDate if available, otherwise use transaction.date
      let occurrenceDate = transactionAny.displayDate || transaction.date;
      
      console.log(`[Transformer Debug] Checking recurring transaction: ${transaction.title}, using date: ${occurrenceDate}`);
      
      // Check if we have a saved paid status for this specific occurrence
      const paidStatus = getOccurrencePaidStatus(transaction.title, occurrenceDate);
      
      // Only override if we have a stored value
      if (paidStatus !== null) {
        console.log(`[Client Override] Using stored paid status for ${transaction.title} on ${occurrenceDate}: ${paidStatus}`);
        modifiedTransaction.isPaid = paidStatus;
      }
    }
    
    // Apply any other transaction-specific transformations here
    
    return modifiedTransaction;
  });
}

/**
 * Apply preferences to a single transaction
 */
export function applyTransactionPreference(transaction: TransactionWithCategory): TransactionWithCategory {
  // Create a new transaction object to apply modifications
  let modifiedTransaction = { ...transaction };
  
  // Apply amount preference if exists
  const preferredAmount = getPreferredAmount(transaction.title);
  if (preferredAmount !== null) {
    console.log(`[Client Override] Using preferred amount for ${transaction.title}: ${preferredAmount} PLN (instead of ${transaction.amount} PLN)`);
    modifiedTransaction.amount = preferredAmount;
  }
  
  // Apply paid status for recurring transaction occurrences
  // Use type assertion to handle dynamic properties
  const transactionAny = transaction as any;
  
  // Debug logging to see what's happening with individual transaction
  console.log(`[Single Transformer Debug] Processing transaction: ${transaction.title}, isRecurring: ${transaction.isRecurring}, isRecurringInstance: ${transactionAny.isRecurringInstance ? true : false}, displayDate: ${transactionAny.displayDate || 'none'}`);
  
  // Check if this is a recurring instance by either the isRecurringInstance flag or if it's a recurring transaction
  if ((transactionAny.isRecurringInstance || transaction.isRecurring) && transaction.date) {
    // Use displayDate if available, otherwise use transaction.date
    let occurrenceDate = transactionAny.displayDate || transaction.date;
    
    console.log(`[Single Transformer Debug] Checking recurring transaction: ${transaction.title}, using date: ${occurrenceDate}`);
    
    // Check if we have a saved paid status for this specific occurrence
    const paidStatus = getOccurrencePaidStatus(transaction.title, occurrenceDate);
    
    if (paidStatus !== null) {
      console.log(`[Client Override] Using stored paid status for ${transaction.title} on ${occurrenceDate}: ${paidStatus}`);
      modifiedTransaction.isPaid = paidStatus;
    } else {
      console.log(`[Client Default] No stored status for ${transaction.title} on ${occurrenceDate}, using original: ${modifiedTransaction.isPaid}`);
    }
  }
  
  return modifiedTransaction;
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
    
    // PERMANENT REMOVAL: Remove any RP Training App transactions completely
    // We know these are the IDs of RP training app transactions
    const rpTrainingAppIds = [58, 74];
    if (transaction.id && rpTrainingAppIds.includes(transaction.id)) {
      console.log(`[CLIENT PERMANENT REMOVAL] Completely removing RP training app with ID ${transaction.id} by user request`);
      return false;
    }
    
    // Also check title for any "training app" text to remove all variants
    if (transaction.title && 
        transaction.title.toLowerCase().includes("training") && 
        transaction.title.toLowerCase().includes("app")) {
      console.log(`[CLIENT TITLE MATCH] Removing transaction with title "${transaction.title}" that matches RP training app pattern`);
      return false;
    }
    
    // General rule: For recurring transactions, only show instances after or on the original start date
    if (transaction.isRecurring && transaction.date) {
      const transactionDate = new Date(transaction.date);
      
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