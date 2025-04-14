import { format } from "date-fns";
import { Savings, TransactionWithCategory } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PiggyBank, Trash } from "lucide-react";

interface SavingsSummaryProps {
  savings: Savings[];
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  onDeleteSavings: (id: number) => void;
  isPending: boolean;
  currentDate?: Date;
}

export default function SavingsSummary({ 
  savings, 
  transactions, 
  isLoading, 
  onDeleteSavings,
  isPending,
  currentDate = new Date() 
}: SavingsSummaryProps) {
  // Calculate total actual savings (manual contributions) - show all savings regardless of date
  const totalActualSavings = savings.reduce((total, saving) => total + saving.amount, 0);
  
  // Calculate the budget left for the currently viewed month (income - expenses)
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const income = monthlyTransactions
    .filter(t => !t.isExpense)
    .reduce((total, t) => total + t.amount, 0);
    
  const expenses = monthlyTransactions
    .filter(t => t.isExpense)
    .reduce((total, t) => total + t.amount, 0);
  
  const budgetLeft = income - expenses;
  
  // Get the current month name for display
  const currentMonthName = format(currentDate, 'MMMM yyyy');
  
  // Format numbers for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[180px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[250px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[100px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          <span>Savings Summary</span>
        </CardTitle>
        <CardDescription>
          Track your actual savings separate from your budget
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Actual Savings</p>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(totalActualSavings)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Budget Left ({currentMonthName})</p>
            <p className={`text-2xl font-bold ${budgetLeft >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(budgetLeft)}
            </p>
          </div>
        </div>
        
        {savings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savings.map(saving => (
                <TableRow key={saving.id}>
                  <TableCell>{format(new Date(saving.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{saving.personLabel}</TableCell>
                  <TableCell>{formatCurrency(saving.amount)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDeleteSavings(saving.id)}
                      disabled={isPending}
                    >
                      <Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-3 text-center text-sm text-muted-foreground">
            No savings contributions yet. Press 's' to add your first savings entry.
          </div>
        )}
      </CardContent>
    </Card>
  );
}