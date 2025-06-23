import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';
import { format, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, addYears } from 'date-fns';

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
  
  // Include both regular transactions in this month AND recurring transaction instances
  const monthTransactions: TransactionWithCategory[] = [];
  
  // First, add regular transactions that fall in this month
  transactions.forEach(transaction => {
    const txDate = new Date(transaction.date);
    if (txDate >= monthStart && txDate <= monthEnd) {
      monthTransactions.push(transaction);
    }
  });
  
  // Then, add recurring transaction instances for this month
  transactions.forEach(transaction => {
    if (!transaction.isRecurring) return;
    
    const originalDate = new Date(transaction.date);
    const interval = transaction.recurringInterval || 'monthly';
    
    // Skip if the original date is already in this month (already added above)
    if (originalDate >= monthStart && originalDate <= monthEnd) {
      return;
    }
    
    // Calculate if this recurring transaction has an occurrence in this month
    let nextDate = new Date(originalDate);
    
    // Find the first occurrence in the current month
    while (nextDate < monthStart) {
      switch (interval) {
        case 'daily': 
          nextDate = new Date(nextDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly': 
          nextDate = new Date(nextDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly': 
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate());
          break;
        case 'yearly': 
          nextDate = new Date(nextDate.getFullYear() + 1, nextDate.getMonth(), nextDate.getDate());
          break;
        default: 
          nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate());
      }
    }
    
    // If it falls in this month, add it as a recurring instance
    if (nextDate <= monthEnd) {
      const recurringInstance: TransactionWithCategory = {
        ...transaction,
        displayDate: nextDate,
        displayDateStr: format(nextDate, 'yyyy-MM-dd'),
        isRecurringInstance: true
      };
      monthTransactions.push(recurringInstance);
      console.log(`[BUDGET CALC] Added recurring instance: ${transaction.title} for ${format(nextDate, 'yyyy-MM-dd')} - ${transaction.amount} PLN`);
    }
  });
  
  console.log(`[BUDGET CALC] Found ${monthTransactions.length} transactions (including recurring instances) in ${monthKey}`);
  
  // Apply skip filtering
  const activeTransactions: TransactionWithCategory[] = [];
  let skippedCount = 0;
  
  monthTransactions.forEach(transaction => {
    // For recurring instances, use the display date for skip checking
    const checkDate = transaction.isRecurringInstance && transaction.displayDate 
      ? transaction.displayDate 
      : targetDate;
    
    // Check if this transaction is skipped for this month
    const isSkipped = isTransactionSkippedForMonth(transaction.id, checkDate);
    
    console.log(`[BUDGET CALC] Transaction: ${transaction.title} (ID: ${transaction.id}), Amount: ${transaction.amount} PLN, IsExpense: ${transaction.isExpense}, IsRecurring: ${transaction.isRecurringInstance}, CheckDate: ${format(checkDate, 'yyyy-MM-dd')}, IsSkipped: ${isSkipped}`);
    
    if (isSkipped) {
      console.log(`[BUDGET CALC] ✓ Excluding skipped transaction: ${transaction.title} (ID: ${transaction.id}) for ${monthKey} - Amount: ${transaction.amount} PLN`);
      skippedCount++;
    } else {
      console.log(`[BUDGET CALC] ✓ Including active transaction: ${transaction.title} (ID: ${transaction.id}) - Amount: ${transaction.amount} PLN`);
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