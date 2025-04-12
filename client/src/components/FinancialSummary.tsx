import { useMemo } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval
} from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';

interface FinancialSummaryProps {
  transactions: TransactionWithCategory[];
}

export default function FinancialSummary({ transactions }: FinancialSummaryProps) {
  const financialData = useMemo(() => {
    const now = new Date();
    
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
    
    transactions.forEach(transaction => {
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
    
    // Calculate balance and savings
    const balance = totalIncome - thisMonthExpenses;
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
  }, [transactions]);

  return (
    <div className="border-t border-border p-4 bg-muted">
      <h3 className="font-medium text-foreground mb-2">Financial Summary</h3>
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
          <span className={`font-mono font-medium ${financialData.balance >= 0 ? 'text-primary dark:text-primary-foreground' : 'text-red-500 dark:text-red-400'}`}>
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
