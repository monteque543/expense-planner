import { useState, useEffect } from 'react';
import { TransactionWithCategory } from '@shared/schema';
import { 
  startOfMonth, 
  endOfMonth, 
  format,
  addMonths,
  addWeeks,
  addDays,
  addYears
} from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlySavingsSummaryProps {
  transactions: TransactionWithCategory[];
  currentDate?: Date;
  isLoading: boolean;
}

export default function MonthlySavingsSummary({ 
  transactions, 
  currentDate,
  isLoading
}: MonthlySavingsSummaryProps) {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  
  useEffect(() => {
    // Use currentDate if provided, otherwise use today's date
    const referenceDate = currentDate || new Date();
    
    // Get the start and end of the current month
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    
    // Calculate income and expenses for the current month (including recurring transactions)
    let income = 0;
    let expenses = 0;
    
    // Process regular transactions
    transactions.forEach(transaction => {
      const txDate = new Date(transaction.date);
      const isInCurrentMonth = (txDate >= monthStart && txDate <= monthEnd);
      
      if (!isInCurrentMonth) return;
      
      if (transaction.isExpense) {
        expenses += transaction.amount;
      } else {
        income += transaction.amount;
      }
    });
    
    // Process recurring transactions
    const processedTxIds = new Set();
    
    transactions.forEach(transaction => {
      // Skip if not recurring or already processed
      if (!transaction.isRecurring || processedTxIds.has(transaction.id)) {
        return;
      }
      
      processedTxIds.add(transaction.id);
      
      const originalDate = new Date(transaction.date);
      const interval = transaction.recurringInterval || 'monthly';
      
      // Skip if the original date itself is in this month
      if (originalDate >= monthStart && originalDate <= monthEnd) {
        // Already counted above, so skip
        return;
      }
      
      // Calculate the next occurrence based on interval
      let nextDate = new Date(originalDate);
      
      // Find the first occurrence in the current month
      while (nextDate < monthStart) {
        switch (interval) {
          case 'daily': nextDate = addDays(nextDate, 1); break;
          case 'weekly': nextDate = addWeeks(nextDate, 1); break;
          case 'monthly': nextDate = addMonths(nextDate, 1); break;
          case 'yearly': nextDate = addYears(nextDate, 1); break;
          default: nextDate = addMonths(nextDate, 1);
        }
      }
      
      // If it falls in this month, add it
      if (nextDate <= monthEnd) {
        if (transaction.isExpense) {
          expenses += transaction.amount;
        } else {
          income += transaction.amount;
        }
      }
    });
    
    setMonthlyIncome(income);
    setMonthlyExpenses(expenses);
    setMonthlySavings(income - expenses);
  }, [transactions, currentDate]);
  
  // Get the month name for display
  const displayMonth = currentDate ? format(currentDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy');
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* Monthly Income */}
      <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Income ({displayMonth})</h3>
          <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold flex items-center">
            {monthlyIncome.toFixed(2)} <span className="ml-1 text-sm">PLN</span>
          </p>
        </div>
      </div>
      
      {/* Monthly Expenses */}
      <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Expenses ({displayMonth})</h3>
          <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold flex items-center">
            {monthlyExpenses.toFixed(2)} <span className="ml-1 text-sm">PLN</span>
          </p>
        </div>
      </div>
      
      {/* Monthly Savings */}
      <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Savings ({displayMonth})</h3>
          <div className={`${monthlySavings >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'} p-2 rounded-full`}>
            <DollarSign className={`h-4 w-4 ${monthlySavings >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
        <div className="mt-2">
          <p className={`text-2xl font-bold flex items-center ${monthlySavings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {monthlySavings.toFixed(2)} <span className="ml-1 text-sm">PLN</span>
          </p>
        </div>
      </div>
    </div>
  );
}