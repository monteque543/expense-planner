import { Transaction, TransactionWithCategory } from "@shared/schema";
import { getPreferredAmount, getOccurrencePaidStatus } from "./transaction-preferences";
import { format } from "date-fns";
import { 
  requiresStrictIsolation, 
  getMonthlyPaidStatus, 
  saveMonthlyPaidStatus 
} from "./strict-monthly-paid-status";

// Define local copy of the problematic transaction check
// for improved reliability and error prevention
function isProblematicTransaction(title: string): boolean {
  // List of transaction titles known to have issues with paid status across months
  const problematicTitles = ['TRW', 'Replit', 'Netflix', 'Orange', 'Karma daisy'];
  return problematicTitles.includes(title);
}

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
    
    // First check for direct fixes for problematic transactions
    // This is a specialized mechanism that overrides the normal paid status behavior
    // for specific transactions known to have issues with monthly transitions
    if (isProblematicTransaction(transaction.title)) {
      const directFix = applyDirectFixForProblematicTransactions(transaction);
      if (directFix !== null) {
        // We have a direct fix to apply
        console.log(`[DIRECT FIX] Applying fixed status for ${transaction.title}: ${directFix}`);
        modifiedTransaction.isPaid = directFix;
        
        // For critical transactions, make it visually more obvious they're using the direct fix
        if (['Netflix', 'Orange'].includes(transaction.title)) {
          console.log(`[DIRECT FIX] Applied direct month fix for critical transaction: ${transaction.title}`);
        }
        
        // Return early since we have applied the direct fix
        return modifiedTransaction;
      } else {
        console.log(`[DIRECT FIX] No fixed status found for problematic transaction: ${transaction.title}`);
      }
    }
    
    // Apply paid status for recurring transaction occurrences
    // Use type assertion to handle dynamic properties
    const transactionAny = transaction as any;
    
    // Debug logging to see what's happening with each transaction
    console.log(`[Transformer Debug] Processing transaction: ${transaction.title}, isRecurring: ${transaction.isRecurring}, isRecurringInstance: ${transactionAny.isRecurringInstance ? true : false}, displayDate: ${transactionAny.displayDate || 'none'}`);
    
    // Check if this is a recurring instance by either the isRecurringInstance flag or if it's a recurring transaction
    if ((transactionAny.isRecurringInstance || transaction.isRecurring) && transaction.date) {
      // Use displayDateStr if available (for consistent formatting), then displayDate, then transaction.date
      let occurrenceDate = transactionAny.displayDateStr || 
                          (transactionAny.displayDate ? 
                            (transactionAny.displayDate instanceof Date ? 
                              format(transactionAny.displayDate, 'yyyy-MM-dd') : 
                              transactionAny.displayDate) : 
                            (transaction.date instanceof Date ? 
                              format(transaction.date, 'yyyy-MM-dd') : 
                              transaction.date));
      
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
 * Special hardcoded fix for problematic transactions
 * This bypasses the normal status lookup mechanism for known problem transactions
 */
function applyDirectFixForProblematicTransactions(transaction: TransactionWithCategory): boolean | null {
  // Use the isProblematicTransaction function for consistency
  if (!isProblematicTransaction(transaction.title)) {
    return null;
  }
  
  // Get the date in a consistent format
  let dateObj: Date;
  if (transaction.date instanceof Date) {
    dateObj = transaction.date;
  } else {
    try {
      dateObj = new Date(transaction.date);
      
      // Handle invalid date
      if (isNaN(dateObj.getTime())) {
        console.error(`[DIRECT FIX] Invalid date for ${transaction.title}: ${transaction.date}`);
        return null;
      }
    } catch (e) {
      console.error(`[DIRECT FIX] Error parsing date for ${transaction.title}:`, e);
      return null;
    }
  }
  
  // Format the date as YYYY-MM-DD for storing/retrieving
  const dateStr = format(dateObj, 'yyyy-MM-dd');
  
  // Use the exact date from the transaction (year-month-day) to check status
  // This is the proper way to handle recurring transactions that occur in multiple months
  const transactionAny = transaction as any;
  
  // Get the specific month-year for the occurrence
  // This ensures we only get the status for this exact occurrence month/year
  let fullDateStr: string;
  
  if (transactionAny.displayDateStr) {
    fullDateStr = transactionAny.displayDateStr;
  } else if (dateObj) {
    fullDateStr = format(dateObj, 'yyyy-MM-dd');
  } else {
    console.log(`[DIRECT FIX] No valid date for ${transaction.title}`);
    return null;
  }
  
  // Extract just the year and month from the full date
  const dateParts = fullDateStr.split('-');
  if (dateParts.length < 2) {
    console.error(`[DIRECT FIX] Invalid date format: ${fullDateStr}`);
    return null;
  }
  
  const year = dateParts[0];
  const month = dateParts[1];
  const yearMonth = `${year}-${month}`;
  
  // The correct storage key for this exact month/year
  const storageKey = `fixed_status_${transaction.title}_${yearMonth}`;
  
  // For super-problematic recurring transactions, add extra logging
  const isCriticalTransaction = ['Karma daisy', 'Netflix', 'Orange'].includes(transaction.title);
  
  // Log all keys in localstorage for this transaction (for debugging)
  if (isCriticalTransaction) {
    console.log(`[DIRECT FIX DEBUG] Transaction: ${transaction.title}, Date: ${fullDateStr}, Month-Year: ${yearMonth}`);
    const matchingKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(transaction.title)) {
        const value = localStorage.getItem(key);
        matchingKeys.push({ key, value });
      }
    }
    console.log(`[DIRECT FIX DEBUG] All storage keys for ${transaction.title}:`, matchingKeys);
  }
  
  // Check if we have a stored value for this SPECIFIC month-year
  const storedValue = localStorage.getItem(storageKey);
  
  if (storedValue !== null) {
    // We found a directly stored value for this month
    const isPaid = storedValue === 'true';
    console.log(`[DIRECT FIX] Found fixed status for ${transaction.title} in ${yearMonth}: ${isPaid} (date: ${fullDateStr})`);
    return isPaid;
  }
  
  console.log(`[DIRECT FIX] No stored value found for ${transaction.title} in ${yearMonth} with key ${storageKey}`);
  // No direct fix found
  return null;
}

/**
 * Save a direct fix for a problematic transaction
 */
export function saveDirectFixForTransaction(title: string, date: Date | string, isPaid: boolean): void {
  // Use our consistent function for checking problematic transactions
  if (!isProblematicTransaction(title)) {
    console.log(`[DIRECT FIX] Ignoring save request for non-problematic transaction: ${title}`);
    return;
  }
  
  // Get the date in a consistent format
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    try {
      dateObj = new Date(date);
      
      // Handle invalid date
      if (isNaN(dateObj.getTime())) {
        console.error(`[DIRECT FIX] Invalid date for ${title}: ${date}`);
        dateObj = new Date(); // Use current date as fallback
      }
    } catch (e) {
      console.error(`[DIRECT FIX] Error parsing date for ${title}: ${date}`, e);
      dateObj = new Date(); // Use current date as fallback
    }
  }
  
  // Get just the year and month parts from the date
  // This is the crucial part - we store one status per transaction per month
  const dateParts = format(dateObj, 'yyyy-MM-dd').split('-');
  if (dateParts.length < 2) {
    console.error(`[DIRECT FIX] Cannot extract year-month from date: ${date}`);
    return;
  }
  
  const yearMonth = `${dateParts[0]}-${dateParts[1]}`;
  const storageKey = `fixed_status_${title}_${yearMonth}`;
  
  // Store the value with some additional debugging info
  localStorage.setItem(storageKey, isPaid.toString());
  
  // Store additional information for debugging/auditing
  const debugInfo = {
    originalDate: date instanceof Date ? format(date, 'yyyy-MM-dd') : date,
    normalizedDate: format(dateObj, 'yyyy-MM-dd'),
    isPaid: isPaid,
    timestamp: new Date().toISOString()
  };
  
  // Store the debug info as JSON for troubleshooting
  localStorage.setItem(`${storageKey}_debug`, JSON.stringify(debugInfo));
  
  console.log(`[DIRECT FIX] Saved fixed status for ${title} in ${yearMonth}: ${isPaid}`);
  
  // Extra validation for mission-critical transactions
  if (['Netflix', 'Orange'].includes(title)) {
    // Double-check that we stored the value correctly
    const storedValue = localStorage.getItem(storageKey);
    console.log(`[DIRECT FIX VALIDATION] Re-checking stored value for ${title}: 
      - Expected: ${isPaid.toString()}
      - Actually stored: ${storedValue}
      - Storage key: ${storageKey}`);
  }
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
  
  // First check for our strict month isolated transactions
  // Extract transaction date
  const transactionAny = transaction as any;
  let dateStr = '';
  
  if (transactionAny.displayDateStr) {
    dateStr = transactionAny.displayDateStr;
  } else if (transaction.date) {
    dateStr = transaction.date instanceof Date 
      ? format(transaction.date, 'yyyy-MM-dd') 
      : String(transaction.date);
  }
  
  // If we have a valid date string, check for strict monthly status
  if (dateStr) {
    const dateParts = dateStr.split('-');
    if (dateParts.length >= 2) {
      const yearMonth = `${dateParts[0]}-${dateParts[1]}`;
      const storageKey = `strict_paid_${transaction.title.replace(/\s+/g, '_')}_${yearMonth}`;
      
      // Check if we have a stored strict month-specific value
      const storedValue = localStorage.getItem(storageKey);
      
      if (storedValue !== null) {
        const isStrictPaid = storedValue === 'true';
        console.log(`[STRICT ISOLATION] Using isolated monthly status for ${transaction.title} in ${yearMonth}: ${isStrictPaid}`);
        modifiedTransaction.isPaid = isStrictPaid;
        return modifiedTransaction;
      }
    }
  }
  
  // Fall back to previous direct fix approach for backwards compatibility
  if (isProblematicTransaction(transaction.title)) {
    console.log(`[SINGLE TXN] Checking problematic transaction: ${transaction.title}, date: ${dateStr}`);
    
    const directFix = applyDirectFixForProblematicTransactions(transaction);
    if (directFix !== null) {
      // We have a direct fix to apply
      console.log(`[DIRECT FIX] Applying fixed status for ${transaction.title} date=${dateStr}: ${directFix}`);
      modifiedTransaction.isPaid = directFix;
      return modifiedTransaction;
    } else {
      console.log(`[DIRECT FIX] No fixed status found for ${transaction.title} date=${dateStr}`);
    }
  }
  
  // Continue with normal logic for non-problematic transactions
  // Apply paid status for recurring transaction occurrences
  
  // Debug logging to see what's happening with individual transaction
  console.log(`[Single Transformer Debug] Processing transaction: ${transaction.title}, isRecurring: ${transaction.isRecurring}, isRecurringInstance: ${transaction.isRecurringInstance || false}, displayDate: ${transaction.displayDate || 'none'}`);
  
  // Check if this is a recurring instance by either the isRecurringInstance flag or if it's a recurring transaction
  if (((transaction as any).isRecurringInstance || transaction.isRecurring) && transaction.date) {
    // Use displayDateStr if available (for consistent formatting), then displayDate, then transaction.date
    const txn = transaction as any; // Local type assertion
    let occurrenceDate = txn.displayDateStr || 
                        (txn.displayDate ? 
                          (txn.displayDate instanceof Date ? 
                            format(txn.displayDate, 'yyyy-MM-dd') : 
                            txn.displayDate) : 
                          (transaction.date instanceof Date ? 
                            format(transaction.date, 'yyyy-MM-dd') : 
                            transaction.date));
    
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