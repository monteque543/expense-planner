import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ExpenseCalendar from "@/components/ExpenseCalendar";
import ExpenseSidebar from "@/components/ExpenseSidebar";
import SubscriptionSummary from "@/components/SubscriptionSummary";
import UpcomingExpenses from "@/components/UpcomingExpenses";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import ThemeToggle from "@/components/ThemeToggle";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
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
  
  // Update transaction mutation
  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Transaction> }) => {
      return apiRequest('PATCH', `/api/transactions/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowEditModal(false);
      setSelectedTransaction(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update transaction: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete transaction: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Handler for editing a transaction
  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

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
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-auto">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-foreground">Expense Planner</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <div className="hidden sm:flex rounded-md overflow-hidden border border-border shadow-sm mr-2">
              <button 
                onClick={() => setActiveView('week')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'week' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground hover:bg-muted/50'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setActiveView('month')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'month' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground hover:bg-muted/50'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setActiveView('year')}
                className={`px-3 py-1 text-xs font-medium ${activeView === 'year' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground hover:bg-muted/50'}`}
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
                  <button className="p-2 text-muted-foreground hover:text-foreground transition">
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
      
      {/* Summary Cards */}
      <div className="bg-background py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subscription Summary */}
          <SubscriptionSummary 
            transactions={transactions}
            isLoading={isLoadingTransactions || isLoadingCategories}
          />
          
          {/* Upcoming Expenses */}
          <UpcomingExpenses
            transactions={transactions}
            isLoading={isLoadingTransactions}
            onEditTransaction={handleEditTransaction}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col md:flex-row">
        {/* Calendar View */}
        <ExpenseCalendar 
          transactions={filteredTransactions}
          currentDate={selectedDate}
          currentMonthYear={currentMonthYear}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectToday={handleToday}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={(id) => deleteTransaction.mutate(id)}
          isLoading={isLoadingTransactions}
        />

        {/* Sidebar View */}
        <ExpenseSidebar 
          transactions={filteredTransactions}
          categories={categories}
          currentMonthYear={currentMonthYear}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={(id) => deleteTransaction.mutate(id)}
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
      
      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        onUpdateTransaction={(id, data) => updateTransaction.mutate({ id, data })}
        transaction={selectedTransaction}
        categories={categories}
        isPending={updateTransaction.isPending}
      />
    </div>
  );
}
