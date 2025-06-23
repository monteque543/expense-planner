import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Centralized budget calculation utilities that properly handle skipped transactions
 */

export interface BudgetCalculation {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  activeTransactions: TransactionWithCategory[];
  skippedCount: number;
}

/**
 * Calculate budget for a specific month, properly excluding skipped transactions
 */
export function calculateMonthlyBudget(
  transactions: TransactionWithCategory[],
  targetDate: Date
): BudgetCalculation {
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const monthKey = format(targetDate, 'yyyy-MM');
  
  console.log(`[BUDGET CALC] Calculating budget for ${format(targetDate, 'MMMM yyyy')}`);
  
  // Filter transactions to only include those in the target month
  const monthTransactions = transactions.filter(transaction => {
    const txDate = new Date(transaction.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });
  
  console.log(`[BUDGET CALC] Found ${monthTransactions.length} transactions in ${monthKey}`);
  
  // Apply skip filtering
  const activeTransactions: TransactionWithCategory[] = [];
  let skippedCount = 0;
  
  monthTransactions.forEach(transaction => {
    // Check if this transaction is skipped for this month
    const isSkipped = isTransactionSkippedForMonth(transaction.id, targetDate);
    
    if (isSkipped) {
      console.log(`[BUDGET CALC] Excluding skipped transaction: ${transaction.title} (ID: ${transaction.id}) for ${monthKey}`);
      skippedCount++;
    } else {
      activeTransactions.push(transaction);
    }
  });
  
  console.log(`[BUDGET CALC] Active transactions: ${activeTransactions.length}, Skipped: ${skippedCount}`);
  
  // Calculate totals from active transactions only
  let totalIncome = 0;
  let totalExpenses = 0;
  
  activeTransactions.forEach(transaction => {
    if (transaction.isExpense) {
      totalExpenses += transaction.amount;
    } else {
      totalIncome += transaction.amount;
    }
  });
  
  const balance = totalIncome - totalExpenses;
  
  console.log(`[BUDGET CALC] Results for ${monthKey}:`);
  console.log(`  - Income: ${totalIncome.toFixed(2)} PLN`);
  console.log(`  - Expenses: ${totalExpenses.toFixed(2)} PLN`);
  console.log(`  - Balance: ${balance.toFixed(2)} PLN`);
  console.log(`  - Skipped transactions: ${skippedCount}`);
  
  return {
    totalIncome,
    totalExpenses,
    balance,
    activeTransactions,
    skippedCount
  };
}

/**
 * Filter out skipped transactions from any transaction array
 * This is used throughout the app to ensure consistency
 */
export function filterSkippedTransactionsForMonth(
  transactions: TransactionWithCategory[],
  targetDate: Date
): TransactionWithCategory[] {
  return transactions.filter(transaction => {
    const isSkipped = isTransactionSkippedForMonth(transaction.id, targetDate);
    
    if (isSkipped) {
      console.log(`[FILTER] Excluding skipped transaction: ${transaction.title} (ID: ${transaction.id}) for ${format(targetDate, 'yyyy-MM')}`);
      return false;
    }
    
    return true;
  });
}

/**
 * Get all transactions for a specific month, with skip filtering applied
 */
export function getActiveTransactionsForMonth(
  transactions: TransactionWithCategory[],
  targetDate: Date
): TransactionWithCategory[] {
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  
  // First filter by month
  const monthTransactions = transactions.filter(transaction => {
    const txDate = new Date(transaction.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });
  
  // Then apply skip filtering
  return filterSkippedTransactionsForMonth(monthTransactions, targetDate);
}