import { useEffect, useState } from 'react';
import { TransactionWithCategory } from '@shared/schema';

// Extended transaction type for handling recurring instances
type ExtendedTransaction = TransactionWithCategory & {
  isRecurringInstance?: boolean;
  displayDate?: Date;
};
import { 
  format, 
  isAfter, 
  isBefore, 
  isToday, 
  startOfDay, 
  startOfMonth, 
  endOfMonth, 
  addDays,
  addWeeks,
  addMonths,
  addYears
} from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface UpcomingExpensesProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  onEditTransaction: (transaction: TransactionWithCategory) => void;
  currentDate?: Date;
}

export default function UpcomingExpenses({ 
  transactions, 
  isLoading,
  onEditTransaction,
  currentDate
}: UpcomingExpensesProps) {
  const [upcomingExpenses, setUpcomingExpenses] = useState<ExtendedTransaction[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  
  useEffect(() => {
    // Use currentDate if provided, otherwise use today's date
    const referenceDate = currentDate || new Date();
    
    // Get the start and end of the selected month
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    
    // Today's date for highlighting today's expenses
    const today = startOfDay(new Date());
    
    // Get month name for display
    const monthName = format(referenceDate, 'MMMM yyyy');
    
    // Log the reference period
    console.log(`Filtering upcoming expenses for: ${monthName} (${format(monthStart, 'yyyy-MM-dd')} to ${format(monthEnd, 'yyyy-MM-dd')})`);
    
    // Process transactions for the selected month
    // This includes both base transactions and recurring instances
    const processedTransactions: ExtendedTransaction[] = [...transactions] as ExtendedTransaction[];
    
    // Generate recurring instances for recurring transactions
    const recurringTransactions = transactions.filter(t => t.isRecurring) as ExtendedTransaction[];
    
    // Add recurring instances that fall in the selected month
    recurringTransactions.forEach(transaction => {
      const originalDate = new Date(transaction.date);
      
      // Don't process if the original is already in the selected month
      if (originalDate >= monthStart && originalDate <= monthEnd) {
        return;
      }
      
      const interval = transaction.recurringInterval || 'monthly';
      let nextDate = new Date(originalDate);
      
      // Find occurrences in the selected month
      while (nextDate < monthEnd) {
        // Apply the interval
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
        
        // If this occurrence falls in the selected month, add it
        if (nextDate >= monthStart && nextDate <= monthEnd) {
          processedTransactions.push({
            ...transaction,
            date: nextDate,
            isRecurringInstance: true
          });
        }
      }
    });
    
    // Filter for expenses in the selected month
    const upcoming = processedTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return (
        transaction.isExpense && 
        transactionDate >= monthStart && 
        transactionDate <= monthEnd
      );
    });
    
    // Sort by date (soonest first)
    const sortedUpcoming = [...upcoming].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    setUpcomingExpenses(sortedUpcoming);
    
    // Calculate total amount
    const total = sortedUpcoming.reduce((sum, transaction) => sum + transaction.amount, 0);
    setTotalUpcoming(total);
  }, [transactions, currentDate]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40 mb-1" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get the month name for display
  const displayMonth = currentDate ? format(currentDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy');
      
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Upcoming Expenses</CardTitle>
        <CardDescription>Expenses to pay in {displayMonth}</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingExpenses.length > 0 ? (
          <div className="space-y-3">
            {upcomingExpenses.map((expense, index) => {
              // Calculate days until due
              const today = startOfDay(new Date());
              const dueDate = new Date(expense.date);
              const isToday = dueDate.toDateString() === today.toDateString();
              const isDueSoon = !isToday && isBefore(dueDate, addDays(today, 3));
              
              return (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => onEditTransaction(expense)}
                >
                  <div className="flex items-center gap-3">
                    {isToday ? (
                      <AlertCircle className="text-orange-500 h-5 w-5" />
                    ) : isDueSoon ? (
                      <AlertCircle className="text-yellow-500 h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="text-muted-foreground h-5 w-5" />
                    )}
                    <div>
                      <div className="font-medium leading-none">{expense.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">
                    {expense.amount.toFixed(2)} PLN
                  </div>
                </div>
              );
            })}
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <span className="font-semibold">Total upcoming</span>
              <span className="font-bold text-red-500">{totalUpcoming.toFixed(2)} PLN</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No upcoming expenses this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}