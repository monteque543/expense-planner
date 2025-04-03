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
        // Calculate income
        if (isWithinInterval(transactionDate, { start: thisMonthStart, end: thisMonthEnd })) {
          totalIncome += transaction.amount;
        }
      }
    });
    
    // Calculate balance and savings
    const balance = totalIncome - thisMonthExpenses;
    const savingsPercentage = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    
    return {
      thisWeekExpenses,
      nextWeekExpenses,
      thisMonthExpenses,
      totalIncome,
      balance,
      savingsPercentage: Math.max(0, Math.min(100, savingsPercentage)), // Ensure between 0 and 100
    };
  }, [transactions]);

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <h3 className="font-medium text-gray-700 mb-2">Financial Summary</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="font-mono font-medium text-red-500">-PLN {financialData.thisWeekExpenses.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-500">Next Week</div>
          <div className="font-mono font-medium text-red-500">-PLN {financialData.nextWeekExpenses.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-500">This Month</div>
          <div className="font-mono font-medium text-red-500">-PLN {financialData.thisMonthExpenses.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-500">Income</div>
          <div className="font-mono font-medium text-green-500">+PLN {financialData.totalIncome.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-3 bg-white rounded-lg p-3 shadow-sm">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Balance</span>
          <span className={`font-mono font-medium ${financialData.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {financialData.balance >= 0 ? '+' : '-'}PLN {Math.abs(financialData.balance).toFixed(2)}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-500 h-2.5 rounded-full" 
            style={{ width: `${financialData.savingsPercentage}%` }}
          ></div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>Spent: PLN {financialData.thisMonthExpenses.toFixed(2)}</span>
          <span>Savings: PLN {Math.max(0, financialData.balance).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
