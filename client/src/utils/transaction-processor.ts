/**
 * Utility for processing transactions with month-specific status handling
 */
import { format } from 'date-fns';
import { Transaction, TransactionWithCategory } from '@shared/schema';
import { isPaid, isDeleted } from './monthlyStatus';

/**
 * Process recurring transactions applying month-specific statuses
 * 
 * @param transactions List of transactions to process
 * @returns Processed transactions with month-specific statuses applied
 */
export function processTransactionsWithMonthlyStatus(transactions: TransactionWithCategory[]): TransactionWithCategory[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  return transactions
    // Apply month-specific paid status
    .map(transaction => {
      if (!transaction.isRecurring) {
        return transaction;
      }

      // For recurring transactions, check month-specific paid status
      const date = transaction.displayDate || new Date(transaction.date);
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if we have a specific paid status for this transaction in this month
      const monthKey = format(dateObj, 'yyyy-MM');
      const paidKey = `recurring_paid_${transaction.id}_${monthKey}`;
      
      if (localStorage.getItem(paidKey) !== null) {
        return {
          ...transaction,
          isPaid: isPaid(transaction.id, dateObj)
        };
      }
      
      return transaction;
    })
    // Filter out month-specific deleted transactions
    .filter(transaction => {
      if (!transaction.isRecurring) {
        return true;
      }
      
      // For recurring transactions, check month-specific deletion status
      const date = transaction.displayDate || new Date(transaction.date);
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      return !isDeleted(transaction.id, dateObj);
    });
}