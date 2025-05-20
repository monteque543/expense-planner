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
    
    // Filter out all skipped transactions for current month
    const viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log(`[FINANCIAL] Filtering transactions for month: ${viewMonth.getMonth()+1}/${viewMonth.getFullYear()}`);
    
    const activeTransactions = transactions.filter(transaction => {
      if (transaction.isRecurring && isTransactionSkippedForMonth(transaction.id, viewMonth)) {
        console.log(`[FINANCIAL] Removing skipped transaction: ${transaction.title} (${transaction.id}) from financial calculations`);
        return false;
      }
      return true;
    });
    
    console.log(`[FINANCIAL] Using ${activeTransactions.length} transactions (filtered out ${transactions.length - activeTransactions.length} skipped items)`);
    
    // Process transactions
    activeTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      
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
    
    // Generate recurring instances for future dates
    // Only process recurring transactions that have not been skipped
    const recurringTransactions = activeTransactions.filter(t => t.isRecurring);
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
          // For each future instance, check if it's skipped for its specific month
          const instanceMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
          if (!isTransactionSkippedForMonth(transaction.id, instanceMonth)) {
            // Add this instance only if it's not skipped
            const futureTx = {
              ...transaction,
              date: new Date(nextDate)
            };
            
            // Calculate expenses for different time periods
            if (futureTx.isExpense) {
              if (isWithinInterval(nextDate, { start: thisWeekStart, end: thisWeekEnd })) {
                thisWeekExpenses += futureTx.amount;
              }
              
              if (isWithinInterval(nextDate, { start: nextWeekStart, end: nextWeekEnd })) {
                nextWeekExpenses += futureTx.amount;
              }
              
              if (isWithinInterval(nextDate, { start: thisMonthStart, end: thisMonthEnd })) {
                thisMonthExpenses += futureTx.amount;
              }
              
              if (isWithinInterval(nextDate, { start: thisYearStart, end: thisYearEnd })) {
                thisYearExpenses += futureTx.amount;
              }
            } else {
              // Calculate income for different time periods
              if (isWithinInterval(nextDate, { start: thisWeekStart, end: thisWeekEnd })) {
                thisWeekIncome += futureTx.amount;
              }
              
              if (isWithinInterval(nextDate, { start: nextWeekStart, end: nextWeekEnd })) {
                nextWeekIncome += futureTx.amount;
              }
              
              if (isWithinInterval(nextDate, { start: thisMonthStart, end: thisMonthEnd })) {
                totalIncome += futureTx.amount;
              }
            }
          } else {
            console.log(`[FINANCIAL] Skipping future instance of ${transaction.title} for ${instanceMonth.getMonth()+1}/${instanceMonth.getFullYear()}`);
          }
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