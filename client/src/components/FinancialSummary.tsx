import { useMemo } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval,
  addDays,
  addMonths,
  addYears
} from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from '@/utils/skipMonthUtils';

interface FinancialSummaryProps {
  transactions: TransactionWithCategory[];
  currentDate?: Date;
}

export default function FinancialSummary({ transactions, currentDate }: FinancialSummaryProps) {
  const financialData = useMemo(() => {
    const now = currentDate || new Date();
    
    // Define time periods
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    
    const nextWeekStart = startOfWeek(addWeeks(now, 1));
    const nextWeekEnd = endOfWeek(addWeeks(now, 1));
    
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    
    const thisYearStart = startOfYear(now);
    const thisYearEnd = endOfYear(now);
    
    // Initialize summary values
    let thisWeekExpenses = 0;
    let nextWeekExpenses = 0;
    let thisMonthExpenses = 0;
    let thisYearExpenses = 0;
    let thisWeekIncome = 0;
    let nextWeekIncome = 0;
    let totalIncome = 0;
    
    // Process regular and recurring transactions
    const processTransactions = (transactionList: TransactionWithCategory[]) => {
      transactionList.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        
        // Check if this transaction should be skipped (for the current month being viewed)
        const currentMonth = currentDate || new Date();
        const skipMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        // Skip transactions that have been marked as skipped for the month being viewed
        if (isTransactionSkippedForMonth(transaction.id, skipMonth)) {
          console.log(`[FINANCIAL] SKIPPING: Transaction ${transaction.title} (${transaction.id}) is marked as skipped for month ${skipMonth.getMonth()+1}/${skipMonth.getFullYear()} - EXCLUDING from calculations`);
          return; // Skip this transaction and move to the next one
        }
        
        // Calculate expenses for different time periods
        if (transaction.isExpense) {
          if (isWithinInterval(transactionDate, { start: thisWeekStart, end: thisWeekEnd })) {
            thisWeekExpenses += transaction.amount;
          }
          
          if (isWithinInterval(transactionDate, { start: nextWeekStart, end: nextWeekEnd })) {
            nextWeekExpenses += transaction.amount;
          }
          
          if (isWithinInterval(transactionDate, { start: thisMonthStart, end: thisMonthEnd })) {
            thisMonthExpenses += transaction.amount;
          }
          
          if (isWithinInterval(transactionDate, { start: thisYearStart, end: thisYearEnd })) {
            thisYearExpenses += transaction.amount;
          }
        } else {
          // Calculate income for different time periods
          if (isWithinInterval(transactionDate, { start: thisWeekStart, end: thisWeekEnd })) {
            thisWeekIncome += transaction.amount;
          }
          
          if (isWithinInterval(transactionDate, { start: nextWeekStart, end: nextWeekEnd })) {
            nextWeekIncome += transaction.amount;
          }
          
          if (isWithinInterval(transactionDate, { start: thisMonthStart, end: thisMonthEnd })) {
            totalIncome += transaction.amount;
          }
        }
      });
    };
    
    // Filter out skipped transactions before processing
    const currentMonth = currentDate || new Date();
    const skipCheckMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Create filtered list of transactions with skipped ones removed
    const filteredTransactions = transactions.filter(transaction => {
      // Check if transaction is skipped for the month we're viewing
      if (transaction.isRecurring) {
        if (isTransactionSkippedForMonth(transaction.id, skipCheckMonth)) {
          console.log(`[FINANCIAL ROOT] Skipping transaction ${transaction.title} (${transaction.id}) for month ${skipCheckMonth.getMonth()+1}/${skipCheckMonth.getFullYear()}`);
          return false; // Exclude this transaction
        }
      }
      return true; // Include all non-skipped transactions
    });
    
    console.log(`Filtered out skipped transactions: Starting with ${transactions.length}, now ${filteredTransactions.length}`);
    
    // Process only non-skipped regular transactions
    processTransactions(filteredTransactions);
    
    // Then, generate recurring instances for the relevant time periods
    // Only use recurring transactions that aren't skipped for the current month
    const recurringTransactions = filteredTransactions.filter(t => t.isRecurring);
    const calculatedRecurringInstances: TransactionWithCategory[] = [];
    
    recurringTransactions.forEach(transaction => {
      const originalDate = new Date(transaction.date);
      const interval = transaction.recurringInterval || 'monthly';
      let nextDate: Date;
      
      // Calculate first occurrence after original date
      switch (interval) {
        case 'daily':
          nextDate = addDays(originalDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(originalDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(originalDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(originalDate, 1);
          break;
        default:
          nextDate = addMonths(originalDate, 1);
      }
      
      // Keep adding occurrences until we pass the end of the relevant period (this year)
      while (nextDate <= thisYearEnd) {
        // Only include occurrences that fall within our relevant time periods and after the original date
        if (nextDate > originalDate) {
          calculatedRecurringInstances.push({
            ...transaction,
            date: nextDate
          });
        }
        
        // Calculate next occurrence
        switch (interval) {
          case 'daily':
            nextDate = addDays(nextDate, 1);
            break;
          case 'weekly':
            nextDate = addWeeks(nextDate, 1);
            break;
          case 'monthly':
            nextDate = addMonths(nextDate, 1);
            break;
          case 'yearly':
            nextDate = addYears(nextDate, 1);
            break;
          default:
            nextDate = addMonths(nextDate, 1);
        }
      }
    });
    
    // Process the recurring instances
    // First, filter out any recurring instances that have been skipped for their month
    const filteredRecurringInstances = calculatedRecurringInstances.filter(transaction => {
      // Skip transactions that have been marked as skipped for their specific month
      if (transaction.isRecurring) {
        const txDate = new Date(transaction.date);
        if (isTransactionSkippedForMonth(transaction.id, txDate)) {
          console.log(`[FINANCIAL SUMMARY] Excluding skipped transaction: ${transaction.title} (${transaction.id}) for month ${txDate.getMonth()+1}/${txDate.getFullYear()}`);
          return false; // Don't include this transaction
        }
      }
      return true; // Include all non-skipped transactions
    });
    
    // Process only the non-skipped recurring instances
    processTransactions(filteredRecurringInstances);
    
    // Calculate balance and savings
    const balance = totalIncome - thisMonthExpenses;
    console.log(`FinancialSummary calculation (FIXED): Income: ${totalIncome} PLN - Monthly Expenses: ${thisMonthExpenses} PLN = Balance: ${balance} PLN`);
    const savingsPercentage = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    
    // Calculate weekly and next week balances
    const thisWeekBalance = thisWeekIncome - thisWeekExpenses;
    const nextWeekBalance = nextWeekIncome - nextWeekExpenses;
    
    return {
      thisWeekExpenses,
      nextWeekExpenses,
      thisMonthExpenses,
      totalIncome,
      thisWeekIncome,
      nextWeekIncome,
      thisWeekBalance,
      nextWeekBalance,
      balance,
      savingsPercentage: Math.max(0, Math.min(100, savingsPercentage)), // Ensure between 0 and 100
    };
  }, [transactions, currentDate]);

  return (
    <div className="border-t border-border p-4 bg-muted">
      <h3 className="font-medium text-foreground mb-2">Financial Summary</h3>
      <div className="text-xs text-muted-foreground mb-2">
        Financial summary for {currentDate ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate) : 'Current Month'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-lg p-3 shadow-sm">
          <div className="text-sm text-muted-foreground">This Week</div>
          <div className={`font-mono font-medium ${financialData.thisWeekBalance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {financialData.thisWeekBalance >= 0 ? '+' : '-'}{Math.abs(financialData.thisWeekBalance).toFixed(2)} PLN
          </div>
        </div>
        <div className="bg-card rounded-lg p-3 shadow-sm">
          <div className="text-sm text-muted-foreground">Next Week</div>
          <div className={`font-mono font-medium ${financialData.nextWeekBalance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {financialData.nextWeekBalance >= 0 ? '+' : '-'}{Math.abs(financialData.nextWeekBalance).toFixed(2)} PLN
          </div>
        </div>
        <div className="bg-card rounded-lg p-3 shadow-sm">
          <div className="text-sm text-muted-foreground">This Month</div>
          <div className={`font-mono font-medium ${financialData.balance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {financialData.balance >= 0 ? '+' : '-'}{Math.abs(financialData.balance).toFixed(2)} PLN
          </div>
        </div>
        <div className="bg-card rounded-lg p-3 shadow-sm">
          <div className="text-sm text-muted-foreground">Income</div>
          <div className="font-mono font-medium text-green-500 dark:text-green-400">+{financialData.totalIncome.toFixed(2)} PLN</div>
        </div>
      </div>
      <div className="mt-3 bg-card rounded-lg p-3 shadow-sm">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className={`font-mono font-medium ${financialData.balance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {financialData.balance >= 0 ? '+' : '-'}{Math.abs(financialData.balance).toFixed(2)} PLN
          </span>
        </div>
        <div className="mt-2 w-full bg-muted/50 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full" 
            style={{ width: `${financialData.savingsPercentage}%` }}
          ></div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Spent: {financialData.thisMonthExpenses.toFixed(2)} PLN</span>
          <span>Savings: {Math.max(0, financialData.balance).toFixed(2)} PLN</span>
        </div>
      </div>
    </div>
  );
}
