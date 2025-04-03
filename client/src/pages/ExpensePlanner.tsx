import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ExpenseCalendar from "@/components/ExpenseCalendar";
import ExpenseSidebar from "@/components/ExpenseSidebar";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import type { Category, Transaction, TransactionWithCategory } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ExpensePlanner() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['/api/transactions'],
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
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

  // Filter transactions based on active category
  const filteredTransactions = activeFilter 
    ? transactions.filter((t: TransactionWithCategory) => 
        t.category?.name === activeFilter)
    : transactions;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Expense Planner</h1>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition font-medium text-sm"
            >
              Add Expense
            </button>
            <button 
              onClick={() => setShowIncomeModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition font-medium text-sm"
            >
              Add Income
            </button>
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
