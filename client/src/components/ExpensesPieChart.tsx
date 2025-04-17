import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TransactionWithCategory, PersonLabel } from '@shared/schema';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ExpensesPieChartProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
  isLoading: boolean;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const PERSON_COLORS = {
  'Beni': '#3b82f6', // blue
  'Fabi': '#ec4899', // pink
  'Michał': '#10b981', // green
  'Together': '#8b5cf6', // purple
};

export default function ExpensesPieChart({ 
  transactions, 
  currentDate, 
  isLoading 
}: ExpensesPieChartProps) {

  const chartData = useMemo(() => {
    // Get first and last day of the current month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Filter transactions to just expenses in the current month
    const filteredTransactions = transactions.filter(tx => 
      tx.isExpense && 
      isWithinInterval(new Date(tx.date), { start: monthStart, end: monthEnd })
    );
    
    // Group by person and calculate totals
    const personTotals: Record<PersonLabel, number> = {
      'Beni': 0,
      'Fabi': 0,
      'Michał': 0,
      'Together': 0,
    };
    
    filteredTransactions.forEach(tx => {
      if (personTotals[tx.personLabel as PersonLabel] !== undefined) {
        personTotals[tx.personLabel as PersonLabel] += tx.amount;
      }
    });
    
    // Convert to chart data format
    const data: ChartData[] = Object.entries(personTotals)
      .filter(([_, amount]) => amount > 0) // Only include persons with expenses
      .map(([person, amount]) => ({
        name: person,
        value: amount,
        color: PERSON_COLORS[person as PersonLabel] || '#6b7280',
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
          <CardTitle className="text-xl">Expenses by Person</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Expenses by Person</CardTitle>
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