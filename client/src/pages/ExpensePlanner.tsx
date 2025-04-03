import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ExpenseCalendar from "@/components/ExpenseCalendar";
import ExpenseSidebar from "@/components/ExpenseSidebar";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import type { Category, Transaction, TransactionWithCategory } from "@shared/schema";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Keyboard } from "lucide-react";

export default function ExpensePlanner() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'month' | 'week' | 'year'>('month');
  const { toast } = useToast();
  
  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to keypress without modifier keys (except shift)
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      
      // If a modal is open or user is typing in an input, don't trigger shortcuts
      const activeElement = document.activeElement;
      if (
        showExpenseModal || 
        showIncomeModal || 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      switch (e.key.toUpperCase()) {
        case 'E': // Add Expense
          setShowExpenseModal(true);
          break;
        case 'I': // Add Income
          setShowIncomeModal(true);
          break;
        case 'T': // Today view
          handleToday();
          break;
        case 'W': // Week view
          setActiveView('week');
          break;
        case 'M': // Month view
          setActiveView('month');
          break;
        case 'Y': // Year view
          setActiveView('year');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExpenseModal, showIncomeModal]);

  // Fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<TransactionWithCategory[]>({
    queryKey: ['/api/transactions'],
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: (transactionData: Omit<Transaction, "id">) => {
      return apiRequest('POST', '/api/transactions', transactionData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowExpenseModal(false);
      setShowIncomeModal(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add transaction: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Date manipulation for current view
  const currentMonthYear = format(selectedDate, 'MMMM yyyy');

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Get date range based on active view
  const getDateRange = () => {
    const today = new Date();
    switch (activeView) {
      case 'week':
        return {
          start: startOfWeek(today),
          end: endOfWeek(today)
        };
      case 'year':
        return {
          start: startOfYear(today),
          end: endOfYear(today)
        };
      case 'month':
      default:
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
    }
  };

  // Filter transactions based on active category
  const filteredTransactions = activeFilter 
    ? transactions.filter((t) => 
        t.category?.name === activeFilter)
    : transactions;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Expense Planner</h1>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex rounded-md overflow-hidden border border-gray-200 shadow-sm mr-2">
              <button 
                onClick={() => setActiveView('week')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'week' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setActiveView('month')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'month' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setActiveView('year')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'year' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Year
              </button>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition font-medium text-sm"
                  >
                    Add Expense
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Press 'E' to quickly add expense</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowIncomeModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition font-medium text-sm"
                  >
                    Add Income
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Press 'I' to quickly add income</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 text-gray-500 hover:text-gray-700 transition">
                    <Keyboard className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="w-60">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Keyboard Shortcuts</h4>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span>E</span><span>Add Expense</span>
                      <span>I</span><span>Add Income</span>
                      <span>T</span><span>Today</span>
                      <span>W</span><span>Week View</span>
                      <span>M</span><span>Month View</span>
                      <span>Y</span><span>Year View</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Calendar View */}
        <ExpenseCalendar 
          transactions={filteredTransactions}
          currentDate={selectedDate}
          currentMonthYear={currentMonthYear}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectToday={handleToday}
          isLoading={isLoadingTransactions}
        />

        {/* Sidebar View */}
        <ExpenseSidebar 
          transactions={filteredTransactions}
          categories={categories}
          currentMonthYear={currentMonthYear}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isLoading={isLoadingTransactions || isLoadingCategories}
        />
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onAddExpense={(data) => addTransaction.mutate({ ...data, isExpense: true })}
        categories={categories.filter((c: Category) => c.isExpense)}
        isPending={addTransaction.isPending}
      />

      <AddIncomeModal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onAddIncome={(data) => addTransaction.mutate({ ...data, isExpense: false })}
        isPending={addTransaction.isPending}
      />
    </div>
  );
}
