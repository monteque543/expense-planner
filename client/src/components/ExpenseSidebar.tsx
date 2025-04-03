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
      <div className="w-full md:w-96 bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
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
        <div className="border-t border-border p-4 bg-muted">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-96 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Sidebar Header with Filters */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium text-foreground mb-2">{currentMonthYear}</h2>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button 
            className={`px-3 py-1 ${activeFilter === null ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} rounded-full text-xs font-medium whitespace-nowrap`}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          
          {categories.map((category) => (
            <button 
              key={category.id}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}
              style={{ 
                backgroundColor: activeFilter === category.name ? `${category.color}30` : 'hsl(var(--muted))',
                color: activeFilter === category.name ? category.color : 'hsl(var(--foreground))'
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
            <div key={idx} className="border-b border-border">
              <div className="bg-muted px-4 py-2 font-medium text-sm text-muted-foreground">
                {dateGroup.formattedDate}
              </div>
              <div className="divide-y divide-border">
                {dateGroup.items.map((transaction, itemIdx) => {
                  const category = categories.find(c => c.id === transaction.categoryId);
                  
                  return (
                    <div key={itemIdx} className="px-4 py-3 hover:bg-muted/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium text-foreground">{transaction.title}</span>
                            {category && (
                              <span 
                                className="ml-2 px-2 py-0.5 text-xs rounded-full"
                                style={{ backgroundColor: `${category.color}30`, color: category.color }}
                              >
                                {category.name}
                              </span>
                            )}
                            {!category && transaction.isExpense === false && (
                              <span className="ml-2 px-2 py-0.5 bg-muted text-foreground text-xs rounded-full">Income</span>
                            )}
                          </div>
                          {transaction.notes && (
                            <div className="text-sm text-muted-foreground mt-0.5">{transaction.notes}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`${transaction.isExpense ? 'text-red-500' : 'text-green-500'} font-medium font-mono`}>
                            {transaction.isExpense ? '-' : '+'}{transaction.amount.toFixed(2)} PLN
                          </div>
                          {transaction.personLabel && (
                            <div className="flex items-center mt-1">
                              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: personColors[transaction.personLabel as keyof typeof personColors] }}></div>
                              <span className="text-xs text-muted-foreground">{transaction.personLabel}</span>
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
          <div className="text-center py-8 text-muted-foreground">
            No transactions to display
          </div>
        )}
      </div>
      
      {/* Financial Summary */}
      <FinancialSummary transactions={transactions} />
    </div>
  );
}
