import React, { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  format, 
  parseISO,
  isToday,
  isBefore,
  isWithinInterval,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears
} from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Helper function to get date range based on active view
function getDateRangeForView(date: Date, view: 'week' | 'month' | 'year'): { start: Date, end: Date } {
  switch (view) {
    case 'week':
      return {
        start: startOfWeek(date),
        end: endOfWeek(date)
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date)
      };
    case 'month':
    default:
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
  }
}

// Calculate total income for the given view period
function calculateTotalIncome(transactions: TransactionWithCategory[], date: Date, view: 'week' | 'month' | 'year'): number {
  const { start, end } = getDateRangeForView(date, view);
  
  return transactions
    .filter(t => !t.isExpense) // Get only income transactions
    .filter(t => {
      const transactionDate = typeof t.date === 'string' ? new Date(t.date) : new Date(t.date);
      return isWithinInterval(transactionDate, { start, end });
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// Calculate total expenses for the given view period
function calculateTotalExpenses(transactions: TransactionWithCategory[], date: Date, view: 'week' | 'month' | 'year'): number {
  const { start, end } = getDateRangeForView(date, view);
  
  return transactions
    .filter(t => t.isExpense) // Get only expense transactions
    .filter(t => {
      const transactionDate = typeof t.date === 'string' ? new Date(t.date) : new Date(t.date);
      return isWithinInterval(transactionDate, { start, end });
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// Calculate balance (income - expenses)
function calculateBalance(transactions: TransactionWithCategory[], date: Date, view: 'week' | 'month' | 'year'): number {
  const income = calculateTotalIncome(transactions, date, view);
  const expenses = calculateTotalExpenses(transactions, date, view);
  return income - expenses;
}

// Get CSS class for balance value
function getBalanceClass(transactions: TransactionWithCategory[], date: Date, view: 'week' | 'month' | 'year'): string {
  const balance = calculateBalance(transactions, date, view);
  return balance >= 0 ? 'text-green-500' : 'text-red-500';
}

interface ExpenseCalendarProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
  currentMonthYear: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectToday: () => void;
  onEditTransaction: (transaction: TransactionWithCategory) => void;
  onDeleteTransaction: (id: number) => void;
  onDayClick?: (date: Date) => void;
  isLoading: boolean;
  activeView: 'week' | 'month' | 'year';
}

export default function ExpenseCalendar({
  transactions,
  currentDate,
  currentMonthYear,
  onPrevMonth,
  onNextMonth,
  onSelectToday,
  onEditTransaction,
  onDeleteTransaction,
  onDayClick,
  isLoading,
  activeView
}: ExpenseCalendarProps) {
  const calendarDays = useMemo(() => {
    if (activeView === 'week') {
      // For week view, only show the current week
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // For month or year view, show the entire month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      
      // Get the start and end of the first week of the month
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      
      // Get all days between calendarStart and calendarEnd
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, activeView]);

  // Group transactions by date, including recurring transactions
  const transactionsByDate = useMemo(() => {
    console.log('Current date in calendar:', currentDate);
    
    const grouped: Record<string, TransactionWithCategory[]> = {};
    const today = new Date();
    
    // Log recurring transactions
    const recurringOnes = transactions.filter(t => t.isRecurring);
    console.log('Recurring transactions:', recurringOnes);
    
    // Calculate view boundaries based on active view
    let viewStart: Date;
    let viewEnd: Date;
    
    if (activeView === 'week') {
      viewStart = startOfWeek(currentDate);
      viewEnd = endOfWeek(currentDate);
      console.log(`View period for week: ${format(viewStart, 'yyyy-MM-dd')} to ${format(viewEnd, 'yyyy-MM-dd')}`);
    } else if (activeView === 'year') {
      viewStart = startOfYear(currentDate);
      viewEnd = endOfYear(currentDate);
      console.log(`View period for year: ${format(viewStart, 'yyyy-MM-dd')} to ${format(viewEnd, 'yyyy-MM-dd')}`);
    } else {
      // Default to month view
      viewStart = startOfMonth(currentDate);
      viewEnd = endOfMonth(currentDate);
      console.log(`View period for month: ${format(viewStart, 'yyyy-MM-dd')} to ${format(viewEnd, 'yyyy-MM-dd')}`);
    }
    
    // First, add the non-recurring transactions that fall within the current view period
    console.log(`Filtering non-recurring transactions from ${format(viewStart, 'yyyy-MM-dd')} to ${format(viewEnd, 'yyyy-MM-dd')}`);
    
    transactions.filter(t => !t.isRecurring).forEach(transaction => {
      // Parse the transaction date
      const transactionDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date)
        : transaction.date;
      
      // Only include transactions that fall within the current view period
      const isInViewPeriod = transactionDate >= viewStart && transactionDate <= viewEnd;
      
      if (isInViewPeriod) {
        const dateStr = format(transactionDate, 'yyyy-MM-dd');
        console.log(`Adding non-recurring transaction "${transaction.title}" (${dateStr}) to view`);
        
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(transaction);
      } else {
        // For debugging purposes
        console.log(`Skipping non-recurring transaction "${transaction.title}" (${format(transactionDate, 'yyyy-MM-dd')}) - outside view period`);
      }
    });
    
    // Then, separately process recurring transactions to show future occurrences
    recurringOnes.forEach(transaction => {
      const originalDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date) 
        : transaction.date;
      
      const interval = transaction.recurringInterval || 'monthly';
      
      console.log(`Processing recurring transaction: ${transaction.title}, interval: ${interval}, original date: ${format(originalDate, 'yyyy-MM-dd')}`);
      
      // Calculate the first occurrence starting point
      let startingDate: Date;
      
      if (originalDate >= viewStart) {
        // If the original date is in or after the current view, 
        // we start from the original date for the first instance
        startingDate = originalDate;
      } else {
        // The original date is before the current view - we need to find 
        // the first occurrence that falls within or after the view
        startingDate = originalDate;
        
        // Create a counter to prevent infinite loops
        let safety = 0;
        const MAX_SAFETY = 100;
        
        // Skip ahead until we find a date near or in our view range
        while (startingDate < viewStart && safety < MAX_SAFETY) {
          safety++;
          
          // Calculate next occurrence
          switch (interval) {
            case 'daily':
              startingDate = addDays(startingDate, 1);
              break;
            case 'weekly':
              startingDate = addWeeks(startingDate, 1);
              break;
            case 'monthly':
              startingDate = addMonths(startingDate, 1);
              break;
            case 'yearly':
              startingDate = addYears(startingDate, 1);
              break;
            default:
              startingDate = addMonths(startingDate, 1);
          }
        }
        
        if (safety >= MAX_SAFETY) {
          console.warn(`Safety limit reached for ${transaction.title}, skipping.`);
          return; // Skip this transaction
        }
      }
      
      // Now calculate the recurring instances starting from our computed starting date
      let nextDate = startingDate;
      
      // Calculate max future date (5 years from the selected date)
      const maxFutureDate = addYears(currentDate, 5);
      const recurringEndDate = transaction.recurringEndDate ? 
        (typeof transaction.recurringEndDate === 'string' ? parseISO(transaction.recurringEndDate) : transaction.recurringEndDate) 
        : maxFutureDate;
      
      // Create a counter to limit iterations
      let counter = 0;
      const MAX_ITERATIONS = 60;
      
      // Track the previous date to detect if we're not advancing
      let prevDate = new Date(0); // Start with a date far in the past
      
      // Generate recurring instances within the current view
      while (nextDate <= recurringEndDate && counter < MAX_ITERATIONS) {
        counter++;
        
        const inView = nextDate >= viewStart && nextDate <= viewEnd;
        console.log(`Checking occurrence date: ${format(nextDate, 'yyyy-MM-dd')}, in view: ${inView}`);
        
        // Only add instances that fall within the current calendar view
        if (inView) {
          const nextDateStr = format(nextDate, 'yyyy-MM-dd');
          if (!grouped[nextDateStr]) {
            grouped[nextDateStr] = [];
          }
          
          // Create a copy of the transaction with the future date
          const futureCopy = {
            ...transaction,
            displayDate: nextDate, // Store occurrence date
            isRecurringInstance: true // Flag to indicate this is a recurring instance
          };
          
          grouped[nextDateStr].push(futureCopy);
          console.log(`Added future occurrence on ${nextDateStr}`);
        }
        
        // Store current date for comparison
        prevDate = new Date(nextDate);
        
        // Calculate the next occurrence
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
        
        // Check if date is advancing (prevent infinite loop)
        if (nextDate.getTime() === prevDate.getTime()) {
          console.error('Date not advancing, breaking loop');
          break;
        }
        
        // If we're past the view end, we can stop
        if (nextDate > viewEnd && counter > 2) {
          console.log('Reached past view end, stopping iteration');
          break;
        }
      }
      
      if (counter >= MAX_ITERATIONS) {
        console.warn(`Max iterations (${MAX_ITERATIONS}) reached for ${transaction.title}`);
      }
    });
    
    return grouped;
  }, [transactions, currentDate, activeView]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="h-96">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-2 md:p-6 min-h-[500px]">
      <div className="bg-card rounded-lg shadow overflow-auto">
        {/* Calendar Header */}
        <div className="bg-muted px-4 py-3 border-b border-border flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button 
              onClick={onPrevMonth}
              className="p-1 rounded-full hover:bg-muted/80 dark:hover:bg-muted/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-foreground/70" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-foreground">{currentMonthYear}</h2>
            <button 
              onClick={onNextMonth}
              className="p-1 rounded-full hover:bg-muted/80 dark:hover:bg-muted/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-foreground/70" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onSelectToday}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            >
              Today
            </button>
          </div>
        </div>
        
        {/* Financial Summary Section */}
        <div className="bg-muted/30 px-4 py-3 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">
              {activeView === 'week' ? 'Weekly' : activeView === 'month' ? 'Monthly' : 'Yearly'} Summary
            </h3>
            <div className="text-xs text-muted-foreground">
              {activeView === 'week' ? 'Current Week' : activeView === 'month' ? 'Current Month' : 'Current Year'}
            </div>
          </div>
          
          {/* Financial Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            {/* Income */}
            <div className="bg-card p-2 rounded-md border border-border">
              <div className="text-xs text-muted-foreground mb-1">Income</div>
              <div className="text-green-500 font-semibold">
                {calculateTotalIncome(transactions, currentDate, activeView).toFixed(2)} PLN
              </div>
            </div>
            
            {/* Expenses */}
            <div className="bg-card p-2 rounded-md border border-border">
              <div className="text-xs text-muted-foreground mb-1">Expenses</div>
              <div className="text-red-500 font-semibold">
                {calculateTotalExpenses(transactions, currentDate, activeView).toFixed(2)} PLN
              </div>
            </div>
            
            {/* Balance */}
            <div className="bg-card p-2 rounded-md border border-border">
              <div className="text-xs text-muted-foreground mb-1">Balance</div>
              <div className={`font-semibold ${getBalanceClass(transactions, currentDate, activeView)}`}>
                {calculateBalance(transactions, currentDate, activeView).toFixed(2)} PLN
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-muted text-center">
          {/* Weekday Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div key={idx} className="bg-muted/50 py-2 font-medium text-muted-foreground">{day}</div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            // Only show transactions for days that are in the current month view
            const isCurrentMonth = isSameMonth(day, currentDate);
            // Filter transactions - only show for current month days
            const dayTransactions = isCurrentMonth ? (transactionsByDate[dayStr] || []) : [];
            const isTodayDate = isToday(day);
            const isPastDay = isBefore(day, new Date());
            const dayHasTransactions = dayTransactions.length > 0;
            const showCompletedMark = dayHasTransactions && isPastDay;
            
            return (
              <div 
                key={idx} 
                className={`relative bg-card p-1 calendar-cell ${isTodayDate ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : ''} ${isCurrentMonth ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                onClick={() => {
                  if (isCurrentMonth && onDayClick) {
                    // Create a new date object to ensure we're passing a fresh instance
                    const clickedDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    console.log('Calendar day clicked:', format(clickedDate, 'yyyy-MM-dd'));
                    onDayClick(clickedDate);
                  }
                }}
              >
                {/* Day number with highlighting for today */}
                <div className={`flex justify-between items-center ${!isCurrentMonth ? 'text-muted-foreground' : isTodayDate ? 'font-medium text-red-700 dark:text-red-400' : 'font-medium'} text-sm`}>
                  <span className={`${isTodayDate ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Completed mark for past days with transactions */}
                  {showCompletedMark && (
                    <span className="text-green-500" title="Completed">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </div>
                
                {/* Transactions for this day */}
                <div className="mt-1 overflow-y-auto max-h-[80px]">
                  {dayTransactions.map((transaction, transIdx) => {
                    // Determine if this is a recurring transaction instance (future occurrence)
                    const isRecurringInstance = 'isRecurringInstance' in transaction;
                    
                    return (
                      <div 
                        key={transIdx}
                        className={`expense-pill ${transaction.isExpense ? 'bg-red-500' : 'bg-green-500'} 
                          text-white rounded-sm px-1 py-0.5 mb-1 text-xs flex flex-col 
                          group cursor-pointer hover:opacity-90 
                          ${isRecurringInstance ? 'border-l-2 border-white' : ''}
                          ${transaction.isPaid ? 'opacity-75' : ''}`}
                        title={`${transaction.title}: ${transaction.amount.toFixed(2)} PLN${isRecurringInstance ? ' (Recurring)' : ''}`}
                        onClick={() => onEditTransaction(transaction)}
                      >
                        {/* First row: Title with recurring indicator and paid status */}
                        <div className="flex items-center w-full break-words">
                          {/* Recurring indicator */}
                          {(transaction.isRecurring || isRecurringInstance) && (
                            <span className="mr-0.5 flex-shrink-0">⟳</span>
                          )}
                          
                          {/* Paid status indicator */}
                          {transaction.isPaid && (
                            <span className="mr-0.5 flex-shrink-0" title="Paid">✓</span>
                          )}
                          
                          <span className="break-words">{transaction.title}</span>
                        </div>
                        
                        {/* Second row: Amount and actions */}
                        <div className="flex justify-between items-center w-full mt-0.5">
                          <span className="font-medium">{transaction.amount.toFixed(2)} PLN</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                onClick={(e) => e.stopPropagation()} // Prevent triggering the parent onClick
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTransaction(transaction);
                                }}
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTransaction(transaction.id);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}