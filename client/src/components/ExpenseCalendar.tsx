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
  isToday
} from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

interface ExpenseCalendarProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
  currentMonthYear: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectToday: () => void;
  isLoading: boolean;
}

export default function ExpenseCalendar({
  transactions,
  currentDate,
  currentMonthYear,
  onPrevMonth,
  onNextMonth,
  onSelectToday,
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

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, TransactionWithCategory[]> = {};
    
    transactions.forEach(transaction => {
      const dateStr = typeof transaction.date === 'string' 
        ? format(parseISO(transaction.date), 'yyyy-MM-dd')
        : format(transaction.date, 'yyyy-MM-dd');
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(transaction);
    });
    
    return grouped;
  }, [transactions]);

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
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button 
              onClick={onPrevMonth}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-800">{currentMonthYear}</h2>
            <button 
              onClick={onNextMonth}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <button 
            onClick={onSelectToday}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Today
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 text-center">
          {/* Weekday Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div key={idx} className="bg-gray-50 py-2 font-medium text-gray-500">{day}</div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day, idx) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTransactions = transactionsByDate[dayStr] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            
            return (
              <div 
                key={idx} 
                className={`bg-white p-1 calendar-cell ${isTodayDate ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-right ${!isCurrentMonth ? 'text-gray-400' : isTodayDate ? 'font-medium text-blue-700' : 'font-medium'} text-sm`}>
                  {format(day, 'd')}
                </div>
                <div className="mt-1 overflow-y-auto max-h-[80px]">
                  {dayTransactions.map((transaction, transIdx) => (
                    <div 
                      key={transIdx}
                      className={`expense-pill ${transaction.isExpense ? 'bg-red-500' : 'bg-green-500'} text-white rounded-sm px-1 py-0.5 mb-1`}
                      title={`${transaction.title}: ${transaction.amount.toFixed(2)} PLN`}
                    >
                      {transaction.title}: {transaction.amount.toFixed(2)} PLN
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
