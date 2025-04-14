import { useState, useEffect } from 'react';
import { TransactionWithCategory } from '@shared/schema';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RepeatIcon } from 'lucide-react';

interface RecurringExpensesSummaryProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
}

export default function RecurringExpensesSummary({ transactions, isLoading }: RecurringExpensesSummaryProps) {
  const [recurringExpenses, setRecurringExpenses] = useState<TransactionWithCategory[]>([]);
  const [totalRecurring, setTotalRecurring] = useState(0);
  
  useEffect(() => {
    // Filter for recurring expenses that are not subscriptions
    const filteredRecurring = transactions.filter(transaction => 
      transaction.isRecurring && 
      transaction.isExpense && 
      transaction.category?.name !== 'Subscription' // Exclude subscription category
    );
    
    // Sort by amount (highest first)
    const sortedRecurring = [...filteredRecurring].sort((a, b) => b.amount - a.amount);
    
    setRecurringExpenses(sortedRecurring);
    
    // Calculate total recurring expenses
    const total = sortedRecurring.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalRecurring(total);
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
        <CardTitle className="flex items-center">
          <RepeatIcon className="mr-2 h-5 w-5 text-purple-500" />
          Recurring Expenses
        </CardTitle>
        <CardDescription>Regular expenses excluding subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        {recurringExpenses.length > 0 ? (
          <div className="space-y-3">
            {recurringExpenses.map((expense, index) => (
              <div 
                key={expense.id} 
                className="flex justify-between items-center p-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">⟳</span>
                  </div>
                  <div>
                    <div className="font-medium leading-none">
                      {expense.title}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      {expense.recurringInterval} • {expense.personLabel}
                    </div>
                  </div>
                </div>
                <div className="font-semibold">
                  {expense.amount.toFixed(2)} PLN
                </div>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <span className="font-semibold">Total recurring</span>
              <span className="font-bold text-purple-500">{totalRecurring.toFixed(2)} PLN</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No recurring expenses found
          </div>
        )}
      </CardContent>
    </Card>
  );
}