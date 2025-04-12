import React, { useMemo, useState } from 'react';
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

interface ExpenseCalendarProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
  currentMonthYear: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectToday: () => void;
  onEditTransaction: (transaction: TransactionWithCategory) => void;
  onDeleteTransaction: (id: number) => void;
  isLoading: boolean;
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
  isLoading
}: ExpenseCalendarProps) {
  const calendarDays = useMemo(() => {
    // Get the start and end dates for the month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    
    // Get the start and end of the first week of the month
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    // Get all days between calendarStart and calendarEnd
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group transactions by date, including recurring transactions
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, TransactionWithCategory[]> = {};
    const today = new Date();
    
    transactions.forEach(transaction => {
      // Handle regular transactions
      const dateStr = typeof transaction.date === 'string' 
        ? format(parseISO(transaction.date), 'yyyy-MM-dd')
        : format(transaction.date, 'yyyy-MM-dd');
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(transaction);
      
      // For recurring transactions, show future occurrences across all months including the current view
      if (transaction.isRecurring) {
        const originalDate = typeof transaction.date === 'string' 
          ? parseISO(transaction.date) 
          : transaction.date;
        
        const interval = transaction.recurringInterval || 'monthly';
        let nextDate: Date;
        
        // Calculate first occurrence based on interval
        switch (interval) {
          case 'daily':
            nextDate = addDays(originalDate, 1);
            break;
          case 'weekly':
            nextDate = addWeeks(originalDate, 1);
            break;
          case 'monthly':
            nextDate = addMonths(originalDate, 1);
            break;
          case 'yearly':
            nextDate = addYears(originalDate, 1);
            break;
          default:
            nextDate = addMonths(originalDate, 1); // Default to monthly
        }
        
        // Get the view boundaries - for the current month
        const viewStart = startOfMonth(currentDate);
        const viewEnd = endOfMonth(currentDate);
        
        // Calculate max future date (let's say 5 years from today)
        const maxFutureDate = addYears(today, 5);
        const recurringEndDate = transaction.recurringEndDate ? 
          (typeof transaction.recurringEndDate === 'string' ? parseISO(transaction.recurringEndDate) : transaction.recurringEndDate) 
          : maxFutureDate;
        
        // Keep adding occurrences as long as they're in the future and don't exceed the end date
        while (nextDate <= recurringEndDate) {
          // Only add instances that fall within the current calendar view
          if (nextDate >= viewStart && nextDate <= viewEnd) {
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
          }
          
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
        }
      }
    });
    
    return grouped;
  }, [transactions, currentDate]);

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
          <button 
            onClick={onSelectToday}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
          >
            Today
          </button>
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
            const dayTransactions = transactionsByDate[dayStr] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const isPastDay = isBefore(day, new Date());
            const dayHasTransactions = dayTransactions.length > 0;
            const showCompletedMark = dayHasTransactions && isPastDay;
            
            return (
              <div 
                key={idx} 
                className={`relative bg-card p-1 calendar-cell ${isTodayDate ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : ''}`}
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
                          text-white rounded-sm px-1 py-0.5 mb-1 text-xs flex justify-between items-center 
                          group cursor-pointer hover:opacity-90 ${isRecurringInstance ? 'border-l-2 border-white' : ''}`}
                        title={`${transaction.title}: ${transaction.amount.toFixed(2)} PLN${isRecurringInstance ? ' (Recurring)' : ''}`}
                        onClick={() => onEditTransaction(transaction)}
                      >
                        <span className="truncate flex items-center">
                          {(transaction.isRecurring || isRecurringInstance) && (
                            <span className="mr-0.5">⟳</span>
                          )}
                          {transaction.title}
                        </span>
                        <div className="flex items-center">
                          <span className="whitespace-nowrap mr-1 font-medium">{transaction.amount.toFixed(2)} PLN</span>
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
