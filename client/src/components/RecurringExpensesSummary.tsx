import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { TransactionWithCategory } from "@shared/schema";

interface RecurringExpensesSummaryProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
}

export default function RecurringExpensesSummary({ transactions, isLoading }: RecurringExpensesSummaryProps) {
  // Filter for recurring expenses that are not subscriptions
  const recurringExpenses = transactions.filter(t => 
    t.isRecurring && 
    t.isExpense && 
    t.category?.name !== "Subscription"
  );
  
  // Sort by date (most recent first)
  recurringExpenses.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recurring Expenses</CardTitle>
          <CardDescription>Regular payments that aren't subscriptions</CardDescription>
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
        <CardTitle className="text-lg">Recurring Expenses</CardTitle>
        <CardDescription>Regular payments that aren't subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        {recurringExpenses.length > 0 ? (
          <div className="space-y-2">
            {recurringExpenses.map((expense) => {
              const date = typeof expense.date === 'string' 
                ? parseISO(expense.date) 
                : expense.date;
              
              return (
                <div key={expense.id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex flex-col">
                    <div className="font-medium flex items-center">
                      {expense.category?.emoji && (
                        <span className="mr-2">{expense.category.emoji}</span>
                      )}
                      {expense.title}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>
                        {expense.recurringInterval ? `${expense.recurringInterval.charAt(0).toUpperCase()}${expense.recurringInterval.slice(1)}` : 'Monthly'}
                      </span>
                      <Badge 
                        variant="outline" 
                        style={{ 
                          backgroundColor: expense.category?.color || '#6B7280',
                          color: 'white'
                        }}
                      >
                        {expense.personLabel}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-500">-{expense.amount.toFixed(2)} PLN</div>
                    <div className="text-xs text-muted-foreground">Next: {format(date, 'MMM d')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            No recurring expenses found
          </div>
        )}
      </CardContent>
    </Card>
  );
}