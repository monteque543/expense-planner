import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TransactionWithCategory } from '@shared/schema';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ExpensesByCategoryChartProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
  isLoading: boolean;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export default function ExpensesByCategoryChart({ 
  transactions, 
  currentDate, 
  isLoading 
}: ExpensesByCategoryChartProps) {

  const chartData = useMemo(() => {
    // Get first and last day of the current month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Filter transactions to just expenses in the current month
    const filteredTransactions = transactions.filter(tx => 
      tx.isExpense && 
      isWithinInterval(new Date(tx.date), { start: monthStart, end: monthEnd })
    );
    
    // Group by category and calculate totals
    const categoryTotals: Record<string, { total: number, color: string }> = {};
    
    filteredTransactions.forEach(tx => {
      const categoryName = tx.category?.name || 'Uncategorized';
      const categoryColor = tx.category?.color || '#6b7280';
      
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = { total: 0, color: categoryColor };
      }
      
      categoryTotals[categoryName].total += tx.amount;
    });
    
    // Convert to chart data format
    const data: ChartData[] = Object.entries(categoryTotals)
      .filter(([_, { total }]) => total > 0) // Only include categories with expenses
      .map(([name, { total, color }]) => ({
        name,
        value: total,
        color,
      }));
    
    return data;
  }, [transactions, currentDate]);
  
  const totalAmount = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.value, 0),
  [chartData]);
  
  // Format the month for display
  const displayMonth = format(currentDate, 'MMMM yyyy');
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Expenses by Category</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Expenses by Category</CardTitle>
        <CardDescription>Spending distribution for {displayMonth}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length > 0 ? (
          <>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)} PLN`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Total: <span className="font-semibold">{totalAmount.toFixed(2)} PLN</span>
            </div>
          </>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No expenses for this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}