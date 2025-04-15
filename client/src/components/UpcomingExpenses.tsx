import { useEffect, useState } from 'react';
import { TransactionWithCategory } from '@shared/schema';
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
  const [upcomingExpenses, setUpcomingExpenses] = useState<TransactionWithCategory[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [spentExpensesAmount, setSpentExpensesAmount] = useState(0);
  const [todayExpensesAmount, setTodayExpensesAmount] = useState(0);
  const [allMonthlyExpensesAmount, setAllMonthlyExpensesAmount] = useState(0);
  
  useEffect(() => {
    // Use currentDate if provided, otherwise use today's date
    const referenceDate = currentDate || new Date();
    
    // Get the start and end of the selected month
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    
    // Today's date for filtering out today's expenses
    const today = startOfDay(new Date());
    
    // Create tomorrow's date (to filter to only show expenses from tomorrow onwards)
    const tomorrow = addDays(today, 1);
    
    // Get month name for display
    const monthName = format(referenceDate, 'MMMM yyyy');
    
    // Log the reference period
    console.log(`Filtering upcoming expenses for: ${monthName} (${format(monthStart, 'yyyy-MM-dd')} to ${format(monthEnd, 'yyyy-MM-dd')})`);
    console.log(`Today's date: ${format(today, 'yyyy-MM-dd')}, Tomorrow's date: ${format(tomorrow, 'yyyy-MM-dd')}`);
    
    // Filter for expenses in the current month based on the viewing month
    // and only show expenses starting from tomorrow (explicitly excluding today)
    const expenses = transactions.filter(transaction => {
      // Only include expenses
      if (!transaction.isExpense) return false;
      
      const transactionDate = new Date(transaction.date);
      
      // Filter by month - include both transactions that fall in the month and 
      // transactions that recur into this month
      const isInSelectedMonth = 
        transactionDate >= monthStart && 
        transactionDate <= monthEnd;
      
      // For non-recurring expenses, only show if they're tomorrow or later (not today) AND not paid
      if (isInSelectedMonth && !transaction.isRecurring) {
        // Only include expenses that are tomorrow or later AND not paid
        // This explicitly excludes today's expenses which should be considered "current" not "upcoming"
        const isTommorrowOrLater = transactionDate >= tomorrow;
        console.log(`Transaction "${transaction.title}" on ${format(transactionDate, 'yyyy-MM-dd')} is ${isTommorrowOrLater ? 'tomorrow or later' : 'today or earlier'}`);
        return isTommorrowOrLater && !transaction.isPaid;
      }
      
      // For recurring transactions, check if any occurrences fall in the selected month
      // AND they are today or in the future
      if (transaction.isRecurring) {
        // Figure out if any recurring instances fall within the selected month
        const originalDate = new Date(transaction.date);
        const interval = transaction.recurringInterval || 'monthly';
        let nextDate = new Date(originalDate);
        let hasUpcomingInstanceInMonth = false;
        
        console.log(`Checking recurring transaction: ${transaction.title}, interval: ${interval}, date: ${format(originalDate, 'yyyy-MM-dd')}, isRecurring: ${transaction.isRecurring}`);
        
        // If the original date is in the selected month and is tomorrow or later AND not paid
        if (originalDate >= monthStart && 
            originalDate <= monthEnd && 
            originalDate >= tomorrow &&
            !transaction.isPaid) {
          console.log(`Recurring transaction "${transaction.title}" original date ${format(originalDate, 'yyyy-MM-dd')} is in the future (after tomorrow)`);
          return true;
        }
        
        // Check for a few cycles to see if it falls in our month and is upcoming
        for (let i = 0; i < 12; i++) {
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
          
          // If this occurrence is in the selected month and is tomorrow or later AND not paid
          if (nextDate >= monthStart && 
              nextDate <= monthEnd && 
              nextDate >= tomorrow &&
              !transaction.isPaid) {
            console.log(`Recurring transaction "${transaction.title}" next occurrence on ${format(nextDate, 'yyyy-MM-dd')} is tomorrow or later`);
            hasUpcomingInstanceInMonth = true;
            break;
          }
          
          // If we've gone beyond the end of the month, stop checking
          if (nextDate > monthEnd) {
            break;
          }
        }
        
        return hasUpcomingInstanceInMonth;
      }
      
      return false;
    });
    
    // Sort by date (soonest first)
    const sortedExpenses = [...expenses].sort((a, b) => {
      // For regular transactions, compare their dates
      if (!a.isRecurring && !b.isRecurring) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      
      // If one is recurring and the other isn't, show recurring ones first
      if (a.isRecurring && !b.isRecurring) return -1;
      if (!a.isRecurring && b.isRecurring) return 1;
      
      // If both are recurring, compare their titles
      return a.title.localeCompare(b.title);
    });
    
    setUpcomingExpenses(sortedExpenses);
    
    // Calculate total amount
    const total = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalUpcoming(total);
    
    // Calculate monthly income (both regular and recurring)
    let income = 0;
    
    console.log(`--- INCOME CALCULATION ---`);
    
    // Add regular income from the current month
    interface IncomeTransaction {
      title: string;
      date: string;
      amount: number;
      isRecurring: boolean;
    }
    
    const regularIncomeTransactions: IncomeTransaction[] = [];
    transactions.forEach(transaction => {
      if (!transaction.isExpense) {
        const txDate = new Date(transaction.date);
        const isInCurrentMonth = (txDate >= monthStart && txDate <= monthEnd);
        const isRecurringValue = Boolean(transaction.isRecurring);
        
        console.log(`Income check: ${transaction.title} (${format(txDate, 'yyyy-MM-dd')}) - ${transaction.amount} PLN, isInMonth: ${isInCurrentMonth}, isRecurring: ${isRecurringValue}`);
        
        if (isInCurrentMonth) {
          income += transaction.amount;
          regularIncomeTransactions.push({
            title: transaction.title,
            date: format(txDate, 'yyyy-MM-dd'),
            amount: transaction.amount,
            isRecurring: isRecurringValue
          });
        }
      }
    });
    
    console.log(`Regular income transactions:`, regularIncomeTransactions);
    console.log(`Regular income total: ${regularIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)} PLN`);
    
    // Add recurring income for this month
    const processedIncomeIds = new Set();
    
    interface RecurringIncomeTransaction {
      title: string;
      originalDate: string;
      nextDate: string;
      amount: number;
      interval: string;
    }
    
    const recurringIncomeTransactions: RecurringIncomeTransaction[] = [];
    
    transactions.forEach(transaction => {
      // Skip if not recurring or already processed or is an expense
      if (!transaction.isRecurring || processedIncomeIds.has(transaction.id) || transaction.isExpense) {
        return;
      }
      
      processedIncomeIds.add(transaction.id);
      
      const originalDate = new Date(transaction.date);
      const interval = transaction.recurringInterval || 'monthly';
      
      console.log(`Recurring income check: ${transaction.title} (${format(originalDate, 'yyyy-MM-dd')}) - ${transaction.amount} PLN, interval: ${interval}`);
      
      // Skip if the original date itself is in this month
      if (originalDate >= monthStart && originalDate <= monthEnd) {
        console.log(`  - Original date in current month, already counted above`);
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
        console.log(`  - Next occurrence on ${format(nextDate, 'yyyy-MM-dd')} falls in current month`);
        income += transaction.amount;
        recurringIncomeTransactions.push({
          title: transaction.title,
          originalDate: format(originalDate, 'yyyy-MM-dd'),
          nextDate: format(nextDate, 'yyyy-MM-dd'),
          amount: transaction.amount,
          interval
        });
      } else {
        console.log(`  - Next occurrence on ${format(nextDate, 'yyyy-MM-dd')} outside current month`);
      }
    });
    
    console.log(`Recurring income transactions:`, recurringIncomeTransactions);
    console.log(`Recurring income total: ${recurringIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)} PLN`);
    console.log(`TOTAL INCOME: ${income} PLN`);
    console.log(`--------------------`);
    
    setMonthlyIncome(income);
    
    // Calculate already spent expenses (past expenses in this month or paid expenses)
    const spentTransactions = transactions.filter(transaction => {
      if (!transaction.isExpense) return false;
      
      const txDate = new Date(transaction.date);
      const isInCurrentMonth = (txDate >= monthStart && txDate <= monthEnd);
      
      // Count as spent if either:
      // 1. It's in the past (but not today) and in this month, OR
      // 2. It's marked as paid and in this month
      const isInPast = isBefore(txDate, today) && !isToday(txDate);
      const shouldCount = isInCurrentMonth && (isInPast || transaction.isPaid);
      
      // Add detailed logging for all expenses
      console.log(`Expense: ${transaction.title} (${format(txDate, 'yyyy-MM-dd')}) - ${transaction.amount} PLN, isPaid: ${transaction.isPaid}, isInPast: ${isInPast}, isInMonth: ${isInCurrentMonth}, shouldCount: ${shouldCount}`);
      
      return shouldCount;
    });
    
    // Log all spent transactions
    console.log('Already spent transactions:', spentTransactions.map(tx => ({ 
      title: tx.title, 
      date: format(new Date(tx.date), 'yyyy-MM-dd'),
      amount: tx.amount,
      isPaid: tx.isPaid
    })));
    
    const spentExpenses = spentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Get all monthly expenses (past + today + upcoming)
    const allMonthlyExpenses = transactions.filter(transaction => {
      if (!transaction.isExpense) return false;
      
      const txDate = new Date(transaction.date);
      const isInCurrentMonth = (txDate >= monthStart && txDate <= monthEnd);
      return isInCurrentMonth;
    }).reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate what's already been spent (past expenses)
    const spentExpensesTotal = spentExpenses;
    
    // Calculate today's expenses separately
    const todayExpenses = transactions.filter(transaction => {
      if (!transaction.isExpense) return false;
      
      const txDate = new Date(transaction.date);
      return isToday(txDate);
    }).reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate the current available budget (income - already spent expenses)
    const currentAvailableBudget = income - spentExpensesTotal - todayExpenses;
    
    // Now subtract upcoming expenses to get what will remain after paying them
    const afterPayingUpcoming = currentAvailableBudget - total;
    
    console.log(`IMPROVED Budget calculation for Upcoming Expenses component:`);
    console.log(`- Monthly Income: ${income.toFixed(2)} PLN`);
    console.log(`- All monthly expenses: ${allMonthlyExpenses.toFixed(2)} PLN`);
    console.log(`- Already spent expenses: ${spentExpensesTotal.toFixed(2)} PLN`);
    console.log(`- Today's expenses: ${todayExpenses.toFixed(2)} PLN`);
    console.log(`- Upcoming expenses: ${total.toFixed(2)} PLN`);
    console.log(`- Current available budget: ${currentAvailableBudget.toFixed(2)} PLN`);
    console.log(`- What will remain after paying upcoming: ${afterPayingUpcoming.toFixed(2)} PLN`);
    
    // Save all the values we need for display
    setSpentExpensesAmount(spentExpensesTotal);
    setTotalUpcoming(total);
    setMonthlyIncome(income);
    setTodayExpensesAmount(todayExpenses);
    setAllMonthlyExpensesAmount(allMonthlyExpenses);
    
    // For the Upcoming Expenses component, we want to show what will remain AFTER paying upcoming expenses
    setRemainingBudget(afterPayingUpcoming);
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
        {/* Active Subscriptions Section */}
        <div className="mb-4 border-b pb-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <span className="mr-1">🔄</span> Active Subscriptions
          </h3>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {transactions
              .filter(tx => tx.isRecurring && tx.isExpense && tx.category?.name === 'Subscription')
              .map((subscription) => (
                <div 
                  key={subscription.id} 
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer group"
                  onClick={() => onEditTransaction(subscription)}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    <span className="font-medium text-sm">{subscription.title}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{subscription.amount.toFixed(2)} PLN</span>
                    <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Cancel
                    </span>
                  </div>
                </div>
              ))}
            {transactions.filter(tx => tx.isRecurring && tx.isExpense && tx.category?.name === 'Subscription').length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">No active subscriptions</div>
            )}
          </div>
        </div>
        
        {/* Weekly Recurring Expenses Section */}
        <div className="mb-4 border-b pb-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <span className="mr-1">📅</span> Weekly Recurring Expenses
          </h3>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {transactions
              .filter(tx => tx.isRecurring && tx.isExpense && tx.recurringInterval === 'weekly')
              .map((weeklyExpense) => (
                <div 
                  key={weeklyExpense.id} 
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer group"
                  onClick={() => onEditTransaction(weeklyExpense)}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                    <span className="font-medium text-sm">{weeklyExpense.title}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{weeklyExpense.amount.toFixed(2)} PLN</span>
                    <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded">
                      {weeklyExpense.category?.name || 'Weekly'}
                    </span>
                  </div>
                </div>
              ))}
            {transactions.filter(tx => tx.isRecurring && tx.isExpense && tx.recurringInterval === 'weekly').length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">No weekly recurring expenses</div>
            )}
          </div>
        </div>
        
        {/* Monthly Recurring Expenses Section */}
        <div className="mb-4 border-b pb-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <span className="mr-1">📆</span> Monthly Recurring Expenses
          </h3>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {transactions
              .filter(tx => tx.isRecurring && tx.isExpense && 
                    (tx.recurringInterval === 'monthly' || tx.recurringInterval === undefined) && 
                    tx.category?.name !== 'Subscription')
              .map((monthlyExpense) => (
                <div 
                  key={monthlyExpense.id} 
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer group"
                  onClick={() => onEditTransaction(monthlyExpense)}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="font-medium text-sm">{monthlyExpense.title} ⟳</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">{monthlyExpense.amount.toFixed(2)} PLN</span>
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded">
                      {format(new Date(monthlyExpense.date), 'dd.MM')}
                    </span>
                  </div>
                </div>
              ))}
            {transactions.filter(tx => tx.isRecurring && tx.isExpense && 
                  (tx.recurringInterval === 'monthly' || tx.recurringInterval === undefined) && 
                  tx.category?.name !== 'Subscription').length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">No monthly recurring expenses</div>
            )}
          </div>
        </div>

        {upcomingExpenses.length > 0 ? (
          <div className="space-y-3">
            {upcomingExpenses.map((expense, index) => {
              // Calculate days until due
              const today = startOfDay(new Date());
              
              // For recurring expenses, display the next instance in the current month
              // that is today or in the future
              let dueDate: Date;
              if (expense.isRecurring) {
                // Calculate the next instance for this month
                const originalDate = new Date(expense.date);
                const referenceDate = currentDate || new Date();
                const monthStart = startOfMonth(referenceDate);
                const monthEnd = endOfMonth(referenceDate);
                const interval = expense.recurringInterval || 'monthly';
                
                // Create tomorrow's date for filtering
                const tomorrow = addDays(today, 1);
                
                // If the original date is in this month and is tomorrow or later
                if (originalDate >= monthStart && 
                    originalDate <= monthEnd && 
                    originalDate >= tomorrow) {
                  dueDate = originalDate;
                } else {
                  // Find next occurrence in this month that's tomorrow or later
                  let nextDate = new Date(originalDate);
                  
                  // Keep advancing until we find a date that's:
                  // 1. In the selected month, AND
                  // 2. Tomorrow or later (not today)
                  let safetyCounter = 0;
                  while ((nextDate < monthStart || 
                          nextDate > monthEnd || 
                          nextDate < tomorrow) && 
                          safetyCounter < 50) {
                    safetyCounter++;
                    
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
                  }
                  dueDate = nextDate;
                }
              } else {
                // Regular non-recurring expense
                dueDate = new Date(expense.date);
              }
              
              const isExactlyToday = dueDate.toDateString() === today.toDateString();
              const isDueSoon = !isExactlyToday && isBefore(dueDate, addDays(today, 3));
              
              return (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => onEditTransaction(expense)}
                >
                  <div className="flex items-center gap-3">
                    {isExactlyToday ? (
                      <AlertCircle className="text-orange-500 h-5 w-5" />
                    ) : isDueSoon ? (
                      <AlertCircle className="text-yellow-500 h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="text-muted-foreground h-5 w-5" />
                    )}
                    <div>
                      <div className="font-medium leading-none flex items-center">
                        <span className={expense.isPaid ? 'opacity-75' : ''}>
                          {expense.title}
                        </span>
                        {expense.isRecurring && <span className="ml-1">⟳</span>}
                        {expense.isPaid && <span className="ml-1 text-green-500" title="Paid">✓</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(dueDate, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold">
                    {expense.amount.toFixed(2)} PLN
                  </div>
                </div>
              );
            })}
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Monthly income</span>
                <span className="font-bold text-green-500">{monthlyIncome.toFixed(2)} PLN</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total monthly expenses</span>
                <span className="font-bold text-red-500">{allMonthlyExpensesAmount.toFixed(2)} PLN</span>
              </div>
              <div className="flex justify-between pl-4 text-sm text-muted-foreground">
                <span>Already spent</span>
                <span>{spentExpensesAmount.toFixed(2)} PLN</span>
              </div>
              <div className="flex justify-between pl-4 text-sm text-muted-foreground">
                <span>Today's expenses</span>
                <span>{todayExpensesAmount.toFixed(2)} PLN</span>
              </div>
              <div className="flex justify-between pl-4 text-sm text-muted-foreground">
                <span>Upcoming expenses</span>
                <span>{totalUpcoming.toFixed(2)} PLN</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-semibold">Remaining budget</span>
                <span className={`font-bold ${remainingBudget >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {remainingBudget.toFixed(2)} PLN
                </span>
              </div>
              <div className="flex justify-between text-xs pl-4 text-muted-foreground italic">
                <span>Calculation: {monthlyIncome.toFixed(2)} - {spentExpensesAmount.toFixed(2)} - {todayExpensesAmount.toFixed(2)} - {totalUpcoming.toFixed(2)}</span>
              </div>
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