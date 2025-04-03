import { useMemo } from 'react';
import { format, parseISO, isToday, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Category, TransactionWithCategory, persons } from '@shared/schema';
import FinancialSummary from './FinancialSummary';
import { Skeleton } from '@/components/ui/skeleton';

// Person color mapping
const personColors: Record<string, string> = {
  "Beni": "#3b82f6",  // Blue
  "Fabi": "#ec4899",  // Pink
  "Michał": "#10b981", // Green
  "Together": "#8b5cf6" // Purple
};

interface ExpenseSidebarProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
  currentMonthYear: string;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
  isLoading: boolean;
}

export default function ExpenseSidebar({
  transactions,
  categories,
  currentMonthYear,
  activeFilter,
  onFilterChange,
  isLoading
}: ExpenseSidebarProps) {
  // Group transactions by date for the sidebar list
  const groupedTransactions = useMemo(() => {
    if (!transactions.length) return [];

    const grouped: { date: string; formattedDate: string; items: TransactionWithCategory[] }[] = [];
    const dateMap = new Map<string, TransactionWithCategory[]>();
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    sortedTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const dateStr = format(transactionDate, 'yyyy-MM-dd');
      const formattedDate = format(transactionDate, "MMMM do, yyyy");
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
        grouped.push({
          date: dateStr,
          formattedDate,
          items: dateMap.get(dateStr)!
        });
      }
      
      dateMap.get(dateStr)!.push(transaction);
    });
    
    return grouped;
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <Skeleton className="h-6 w-32 mb-2" />
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Sidebar Header with Filters */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-2">{currentMonthYear}</h2>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button 
            className={`px-3 py-1 ${activeFilter === null ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 text-gray-600'} rounded-full text-xs font-medium whitespace-nowrap`}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          
          {categories.map((category) => (
            <button 
              key={category.id}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}
              style={{ 
                backgroundColor: activeFilter === category.name ? `${category.color}30` : 'rgb(243 244 246)',
                color: activeFilter === category.name ? category.color : 'rgb(31 41 55)'
              }}
              onClick={() => onFilterChange(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto">
        {groupedTransactions.length > 0 ? (
          groupedTransactions.map((dateGroup, idx) => (
            <div key={idx} className="border-b border-gray-200">
              <div className="bg-gray-50 px-4 py-2 font-medium text-sm text-gray-600">
                {dateGroup.formattedDate}
              </div>
              <div className="divide-y divide-gray-100">
                {dateGroup.items.map((transaction, itemIdx) => {
                  const category = categories.find(c => c.id === transaction.categoryId);
                  
                  return (
                    <div key={itemIdx} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{transaction.title}</span>
                            {category && (
                              <span 
                                className="ml-2 px-2 py-0.5 text-xs rounded-full"
                                style={{ backgroundColor: `${category.color}30`, color: category.color }}
                              >
                                {category.name}
                              </span>
                            )}
                            {!category && transaction.isExpense === false && (
                              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">Income</span>
                            )}
                          </div>
                          {transaction.notes && (
                            <div className="text-sm text-gray-500 mt-0.5">{transaction.notes}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`${transaction.isExpense ? 'text-red-500' : 'text-green-500'} font-medium font-mono`}>
                            {transaction.isExpense ? '-' : '+'}{transaction.amount.toFixed(2)} PLN
                          </div>
                          {transaction.personLabel && (
                            <div className="flex items-center mt-1">
                              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: personColors[transaction.personLabel as keyof typeof personColors] }}></div>
                              <span className="text-xs text-gray-500">{transaction.personLabel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transactions to display
          </div>
        )}
      </div>
      
      {/* Financial Summary */}
      <FinancialSummary transactions={transactions} />
    </div>
  );
}
