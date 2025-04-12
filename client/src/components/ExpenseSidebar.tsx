import { useMemo } from 'react';
import { format, parseISO, isToday, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Category, TransactionWithCategory, persons } from '@shared/schema';
import FinancialSummary from './FinancialSummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

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
  activePersonFilter: string | null;
  onPersonFilterChange: (filter: string | null) => void;
  onEditTransaction: (transaction: TransactionWithCategory) => void;
  onDeleteTransaction: (id: number) => void;
  isLoading: boolean;
  currentDate?: Date;
}

export default function ExpenseSidebar({
  transactions,
  categories,
  currentMonthYear,
  activeFilter,
  onFilterChange,
  activePersonFilter,
  onPersonFilterChange,
  onEditTransaction,
  onDeleteTransaction,
  isLoading,
  currentDate
}: ExpenseSidebarProps) {
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
  
  // Calculate category and person counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { count: number, color: string }> = {};
    
    // Initialize with all categories
    categories.forEach(category => {
      counts[category.name] = { count: 0, color: category.color };
    });
    
    // Count transactions per category
    transactions.forEach(transaction => {
      const category = categories.find(c => c.id === transaction.categoryId);
      if (category) {
        if (!counts[category.name]) {
          counts[category.name] = { count: 0, color: category.color };
        }
        counts[category.name].count += 1;
      }
    });
    
    return counts;
  }, [transactions, categories]);
  
  // Calculate person counts
  const personCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialize with all person labels
    persons.forEach(person => {
      counts[person] = 0;
    });
    
    // Count transactions per person
    transactions.forEach(transaction => {
      if (transaction.personLabel) {
        if (!counts[transaction.personLabel]) {
          counts[transaction.personLabel] = 0;
        }
        counts[transaction.personLabel] += 1;
      }
    });
    
    return counts;
  }, [transactions]);
  
  // Filter transactions based on category and person filters
  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];
    
    return transactions.filter(transaction => {
      // Apply category filter
      if (activeFilter !== null) {
        const category = categories.find(c => c.id === transaction.categoryId);
        if (!category || category.name !== activeFilter) {
          return false;
        }
      }
      
      // Apply person filter
      if (activePersonFilter !== null) {
        if (transaction.personLabel !== activePersonFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [transactions, activeFilter, activePersonFilter, categories]);
  
  // Group transactions by date for the sidebar list
  const groupedTransactions = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const grouped: { date: string; formattedDate: string; items: TransactionWithCategory[] }[] = [];
    const dateMap = new Map<string, TransactionWithCategory[]>();
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
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
  }, [filteredTransactions]);
  
  return (
    <div className="w-full md:w-96 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Sidebar Header with Filters */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium text-foreground mb-2">{currentMonthYear}</h2>
        
        {/* Category Filters */}
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Categories</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <button 
            className={`px-3 py-1 ${activeFilter === null ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} rounded-full text-xs font-medium whitespace-nowrap`}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          
          {categories.map((category) => (
            <button 
              key={category.id}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center`}
              style={{ 
                backgroundColor: activeFilter === category.name ? `${category.color}30` : 'hsl(var(--muted))',
                color: activeFilter === category.name ? category.color : 'hsl(var(--foreground))'
              }}
              onClick={() => onFilterChange(category.name)}
            >
              {category.name}
              {categoryCounts[category.name] && (
                <span className="ml-1 bg-background/50 rounded-full px-1.5 py-0.5 text-[10px] font-normal">
                  {categoryCounts[category.name].count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Person Filters */}
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Person</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            className={`px-3 py-1 ${activePersonFilter === null ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} rounded-full text-xs font-medium whitespace-nowrap`}
            onClick={() => onPersonFilterChange(null)}
          >
            All
          </button>
          
          {persons.map((person) => (
            <button 
              key={person}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center`}
              style={{ 
                backgroundColor: activePersonFilter === person ? `${personColors[person]}30` : 'hsl(var(--muted))',
                color: activePersonFilter === person ? personColors[person] : 'hsl(var(--foreground))'
              }}
              onClick={() => onPersonFilterChange(person)}
            >
              {person}
              {personCounts[person] > 0 && (
                <span className="ml-1 bg-background/50 rounded-full px-1.5 py-0.5 text-[10px] font-normal">
                  {personCounts[person]}
                </span>
              )}
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
                    <div 
                      key={itemIdx} 
                      className="px-4 py-3 hover:bg-muted/40 group cursor-pointer"
                      onClick={() => onEditTransaction(transaction)}
                    >
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
                        <div className="flex items-start gap-2">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()} // Prevent parent click
                              >
                                <MoreHorizontal className="h-4 w-4" />
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
      <FinancialSummary transactions={transactions} currentDate={currentDate} />
    </div>
  );
}
