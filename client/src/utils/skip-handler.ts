/**
 * Improved utility for handling skipped transactions
 */
import { format } from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';

/**
 * Filter out all skipped transaction instances from an array of transactions
 * This is used for both display and financial calculations
 */
export function filterSkippedTransactions(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  
  return transactions.filter(transaction => {
    // Only filter recurring transactions
    if (!transaction.isRecurring) {
      return true; // Keep non-recurring transactions
    }
    
    // Get the current displayed date for the transaction
    const date = transaction.displayDate || new Date(transaction.date);
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if this transaction is skipped for this specific month
    const isSkipped = isTransactionSkippedForMonth(transaction.id, dateObj);
    
    if (isSkipped) {
      console.log(`[FINANCIAL FILTER] Excluding transaction "${transaction.title}" (${transaction.id}) for month ${format(dateObj, 'yyyy-MM')} from financial calculations because it's marked as skipped`);
    }
    
    // Return true to keep, false to remove
    return !isSkipped;
  });
}