import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { TransactionWithCategory } from "@shared/schema";

interface MonthlySavingsSummaryProps {
  transactions: TransactionWithCategory[];
  currentDate?: Date;
  isLoading: boolean;
}

export default function MonthlySavingsSummary({ 
  transactions, 
  currentDate = new Date(),
  isLoading 
}: MonthlySavingsSummaryProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Calculate monthly totals
  const monthlyData = transactions.reduce((acc, transaction) => {
    const transactionDate = new Date(transaction.date);
    
    // Only include transactions for the current month
    if (isWithinInterval(transactionDate, { start: monthStart, end: monthEnd })) {
      if (transaction.isExpense) {
        acc.expenses += transaction.amount;
      } else {
        acc.income += transaction.amount;
      }
    }
    
    return acc;
  }, { income: 0, expenses: 0 });
  
  const savings = monthlyData.income - monthlyData.expenses;
  const savingsPercentage = monthlyData.income > 0 
    ? (savings / monthlyData.income) * 100 
    : 0;
  
  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monthly Savings</CardTitle>
          <CardDescription>{format(currentDate, 'MMMM yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Monthly Savings</CardTitle>
        <CardDescription>{format(currentDate, 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Income</div>
              <div className="text-green-500 font-semibold">{monthlyData.income.toFixed(2)} PLN</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expenses</div>
              <div className="text-red-500 font-semibold">{monthlyData.expenses.toFixed(2)} PLN</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Savings</div>
              <div className={`font-semibold ${savings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {savings.toFixed(2)} PLN
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Savings Rate</div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${savings >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.max(savingsPercentage, 0), 100)}%` }}
              ></div>
            </div>
            <div className="text-xs mt-1">
              {savingsPercentage.toFixed(1)}% of income {savings >= 0 ? 'saved' : 'overspent'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}