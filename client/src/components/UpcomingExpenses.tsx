import { useEffect, useState } from 'react';
import { TransactionWithCategory } from '@shared/schema';
import { format, isAfter, isBefore, isToday, startOfDay, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface UpcomingExpensesProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  onEditTransaction: (transaction: TransactionWithCategory) => void;
}

export default function UpcomingExpenses({ 
  transactions, 
  isLoading,
  onEditTransaction
}: UpcomingExpensesProps) {
  const [upcomingExpenses, setUpcomingExpenses] = useState<TransactionWithCategory[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  
  useEffect(() => {
    // Get today and the end of the current month
    const today = startOfDay(new Date());
    const currentMonthEnd = endOfMonth(today);
    
    // Filter for expenses that are upcoming (today or in the future)
    const upcoming = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return (
        transaction.isExpense && 
        (isToday(transactionDate) || isAfter(transactionDate, today)) &&
        isBefore(transactionDate, currentMonthEnd)
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
  }, [transactions]);
  
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
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Upcoming Expenses</CardTitle>
        <CardDescription>Expenses to pay this month</CardDescription>
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