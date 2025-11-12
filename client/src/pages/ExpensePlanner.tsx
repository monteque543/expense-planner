import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ExpenseCalendar from "@/components/ExpenseCalendar";
import ExpenseSidebar from "@/components/ExpenseSidebar";
import SubscriptionSummary from "@/components/SubscriptionSummary";
import UpcomingExpenses from "@/components/UpcomingExpenses";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
import AddSavingsModal from "@/components/AddSavingsModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import ThemeToggle from "@/components/ThemeToggle";
import RecurringExpensesSummary from "@/components/RecurringExpensesSummary";
import MonthlySavingsSummary from "@/components/MonthlySavingsSummary";
import SavingsSummary from "@/components/SavingsSummary";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import JuneBirthdayFix from "@/components/JuneBirthdayFix";
import BudgetCoachingCompanion from "@/components/BudgetCoachingCompanion";
import ExpensesPieChart from "@/components/ExpensesPieChart";
import ExpensesByCategoryChart from "@/components/ExpensesByCategoryChart";
import ManageSkippedTransactions from "@/components/ManageSkippedTransactions";
import type { Category, Transaction, TransactionWithCategory, Savings } from "@shared/schema";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createHardcodedIncomeTransactions } from "@/utils/income-hardcoder";
import { 
  createHardcodedExpenseTransactions,
  isTransactionDeleted,
  markTransactionAsDeleted,
  deletedHardcodedTransactionIds
} from "@/utils/expense-hardcoder";
import { markMonthlyTransactionAsPaid } from "@/utils/monthlyTracker";
import {
  saveEditedTransaction,
  markTransactionAsDeleted as persistDeletedTransaction
} from "@/utils/user-preferences";
import {
  applyTransactionPreferences,
  filterTransactions
} from "@/utils/transaction-transformers";
import {
  markPaid,
  isPaid,
  markDeleted,
  isDeleted,
  applyMonthlyStatuses
} from "../utils/monthlyStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Keyboard } from "lucide-react";
import { getUniqueTitles } from "@/utils/titleUtils";
import IdleSessionHandler from "@/components/IdleSessionHandler";
import SecurityOverlay from "@/components/SecurityOverlay";
import { expandRecurringTransactions } from "@/utils/expand-recurring";



export default function ExpensePlanner() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activePersonFilter, setActivePersonFilter] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'month' | 'week' | 'year'>('month');
  const [isIdle, setIsIdle] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const { toast } = useToast();
  
  // Handle when user becomes idle or returns
  const handleUserIdle = useCallback((isUserIdle?: boolean) => {
    // If isUserIdle is provided, use it directly, otherwise toggle
    setIsIdle(prevState => {
      const newState = isUserIdle !== undefined ? isUserIdle : !prevState;
      console.log(`User is ${newState ? 'idle - activating' : 'active - deactivating'} security overlay`);
      return newState;
    });
  }, []);
  
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
        showSavingsModal ||
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      switch (e.key.toUpperCase()) {
        case 'E': // Add Expense
          e.preventDefault(); // Prevent the 'e' from being added to input fields
          
          // Apply the same budget protection rules to keyboard shortcut
          if (currentBudget < 0) {
            // Show warning toast
            toast({
              title: "Budget Protection Activated",
              description: `Cannot add expenses when budget is negative (${currentBudget.toFixed(2)} PLN). Add income first.`,
              variant: "destructive",
              duration: 7000
            });
            return; // Don't open the expense modal
          }
          
          // If budget is positive, proceed normally
          setShowExpenseModal(true);
          break;
        case 'I': // Add Income
          e.preventDefault(); // Prevent the 'i' from being added to input fields
          setShowIncomeModal(true);
          break;
        case 'S': // Add Savings
          e.preventDefault(); // Prevent the 's' from being added to input fields
          setShowSavingsModal(true);
          break;
        case 'T': // Today view
          e.preventDefault(); // Prevent the 't' from being added to input fields
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
  }, [showExpenseModal, showIncomeModal, showSavingsModal]);

  // Fetch transactions
  const { data: rawTransactions = [], isLoading: isLoadingTransactions } = useQuery<TransactionWithCategory[]>({
    queryKey: ['/api/transactions'],
    staleTime: 0, // Always refetch to ensure fresh data
  });
  
  // Apply our client-side transformations to transactions
  // This includes filtering out problematic transactions and applying user preferences
  const transactions = useMemo(() => {
    console.log(`[TRANSFORM] Processing ${rawTransactions.length} transactions from server`);

    // First filter out problematic transactions (RP training app in May, etc.)
    const filteredResults = filterTransactions(rawTransactions);

    // Expand recurring transactions to show instances
    const today = new Date();
    const startRange = new Date(today.getFullYear() - 1, 0, 1);
    const endRange = new Date(today.getFullYear() + 2, 11, 31);
    const expandedResults = expandRecurringTransactions(filteredResults, startRange, endRange);

    // Then apply user preferences for transaction amounts (like Replit preferred amount)
    const transformedResults = applyTransactionPreferences(expandedResults);

    console.log(`[TRANSFORM] Returned ${transformedResults.length} transactions after filtering/transforming (expanded from ${rawTransactions.length})`);
    return transformedResults;
  }, [rawTransactions]);

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Fetch savings
  const { data: savings = [], isLoading: isLoadingSavings } = useQuery<Savings[]>({
    queryKey: ['/api/savings'],
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: (transactionData: Omit<Transaction, "id">) => {
      return apiRequest('POST', '/api/transactions', transactionData);
    },
    onSuccess: () => {
      // Removed success toast as requested by user
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
  
  // Define the handleDeleteTransaction function first 
  // so it can be used by the mutations - this completely avoids API calls
  // for hardcoded transactions
  const handleDeleteTransaction = (id: number, date?: Date) => {
    console.log(`Handling deletion for transaction ID: ${id}, with date: ${date ? format(date, 'yyyy-MM-dd') : 'none'}`);
    
    // For recurring transactions that use the calendar delete function, find based on both ID and date
    let transaction = transactions.find(t => t.id === id);
    
    // If we have a date parameter and couldn't find the transaction, it might be a recurring instance
    // so we need to look more carefully through generated recurring instances
    if (!transaction && date) {
      console.log(`[RECURRING DELETE] Searching for recurring instance with ID ${id} for month ${format(date, 'yyyy-MM')}`);
      
      // Get all transactions including recurring instances - use our cached transactions
      const allTransactions = transactions;
      
      // First try to find the base transaction - explicitly set the type for 't'
      transaction = allTransactions.find((t: TransactionWithCategory) => t.id === id);
      
      if (transaction) {
        console.log(`[RECURRING DELETE] Found base transaction: ${transaction.title}`);
        
        // Since we found the base transaction, we can proceed with month-specific deletion
        if (transaction.isRecurring) {
          console.log(`[INSTANCE DELETE] Handling recurring transaction: ${transaction.title} for date ${format(date, 'yyyy-MM-dd')}`);
          
          // Use our recurring tracker utility
          const { markDeleted } = require('../utils/monthlyStatus');
          markDeleted(id, date, true);
          
          console.log(`[RECURRING DELETE] Set transaction ${id} (${transaction.title}) as deleted for month ${format(date, 'yyyy-MM')}`);
          
          toast({
            title: "Instance Hidden",
            description: `Removed "${transaction.title}" for ${format(date, 'MMM yyyy')} only`,
          });
          
          // Force refresh of the transactions cache to update the UI
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
          
          return; // Skip the regular deletion
        }
      }
    }
    
    // Handle regular recurring transactions
    if (transaction?.isRecurring && date) {
      console.log(`[INSTANCE DELETE] Handling recurring transaction: ${transaction.title} for date ${format(date, 'yyyy-MM-dd')}`);
      
      // Use our new skip functionality to hide this transaction just for this month
      const deleteDate = new Date(date);
      // Import the monthly tracking functions
      const { skipRecurringTransactionForMonth } = require('../utils/monthlyTracker');
      // Mark this transaction as skipped for this specific month
      skipRecurringTransactionForMonth(id, deleteDate);
      console.log(`[MONTHLY DELETE] Successfully marked recurring transaction ${id} as skipped for month ${format(deleteDate, 'yyyy-MM')}`);
      
      toast({
        title: "Instance Hidden",
        description: `Removed "${transaction.title}" for ${format(date, 'MMM yyyy')} only`,
      });
      
      // Force refresh of the transactions cache to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      return; // Skip the regular deletion
    }
    
    // If we still couldn't find the transaction, show an error
    if (!transaction) {
      console.error(`Cannot find transaction with ID ${id} to delete`);
      toast({
        title: "Error",
        description: "Transaction not found",
        variant: "destructive",
      });
      return;
    }
    
    // Special handling for "Grocerries" transactions which have known issues
    if (transaction.title === 'Grocerries') {
      console.log(`[SPECIAL DELETE] Detected Grocerries transaction ID: ${id}`);
      
      // Notify user of special handling
      toast({
        title: "Deleting Grocerries",
        description: "Removing all instances of this recurring transaction...",
      });
      
      // Call the special API handler and do additional cache cleanup
      deleteTransaction.mutate(id, {
        onSuccess: () => {
          console.log(`[GROCERRIES] Successfully deleted Grocerries transaction ${id}`);
          
          // Extra cache cleanup for ALL Grocerries transactions
          const currentQueryData = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
          if (currentQueryData) {
            const updatedQueryData = currentQueryData.filter(t => t.title !== 'Grocerries');
            queryClient.setQueryData<TransactionWithCategory[]>(
              ['/api/transactions'],
              updatedQueryData
            );
            console.log(`[GROCERRIES] Cleaned all Grocerries transactions from cache`);
          }
          
          // Force monthly view refresh to ensure everything updates correctly
          const currentDate = new Date(selectedDate);
          const nextMonth = new Date(selectedDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          // Force view refresh by changing months quickly
          setTimeout(() => {
            setSelectedDate(nextMonth);
            setTimeout(() => {
              setSelectedDate(currentDate);
            }, 200);
          }, 100);
        }
      });
      
      return; // Skip the rest of the function
    }
    
    // If it's a hardcoded transaction (ID in the 970000+ range)
    if (id >= 970000) {
      // For hardcoded transactions, implement pure client-side deletion using our tracker
      console.log(`[CLIENT-SIDE DELETE] Removing hardcoded transaction with ID: ${id}`);
      
      // Mark this transaction as deleted in our global tracker
      markTransactionAsDeleted(id);
      // Also save to localStorage for persistence
      persistDeletedTransaction(id);
      console.log(`Transaction ${id} marked as deleted in global tracker and saved to localStorage`);
      
      // Show success message immediately
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      
      try {
        // Store the current date to return to
        const currentDate = new Date(selectedDate);
        
        // Find and track the removed transaction title
        const transactionToDelete = filteredTransactions.find(t => t.id === id);
        const titleToRemove = transactionToDelete?.title;
        console.log(`Removing transaction: "${titleToRemove}" from UI`);
        
        // 1. Update react-query cache to immediately reflect the change in UI
        const currentQueryData = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
        if (currentQueryData) {
          // Filter out the deleted transaction from cache
          const updatedQueryData = currentQueryData.filter(t => t.id !== id);
          queryClient.setQueryData<TransactionWithCategory[]>(
            ['/api/transactions'],
            updatedQueryData
          );
          console.log(`Updated QueryClient cache to filter out transaction ${id}`);
        }
        
        // 2. Force complete cache invalidation to rebuild all derived data
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        console.log(`Invalidated transaction queries to force refresh`);
        
        // 3. Force refresh by temporarily changing month and coming back
        // This ensures all components re-render completely
        const nextMonth = new Date(selectedDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        // Immediate update to current month view
        setSelectedDate(new Date(currentDate));
        
        // Schedule the month change with delay (helps trigger full rerender)
        setTimeout(() => {
          console.log('Step 1: Moving to next month temporarily...');
          setSelectedDate(nextMonth);
          
          // Then immediately back to current month
          setTimeout(() => {
            console.log('Step 2: Returning to original month...');
            setSelectedDate(currentDate);
          }, 200);
        }, 100);
      } catch (error) {
        console.error('Error during client-side transaction deletion:', error);
        toast({
          title: "Error",
          description: "Failed to delete transaction, please try again",
          variant: "destructive",
        });
      }
      
      return; // Important: Don't continue to the API call
    }
    
    // For regular transactions, call the API
    console.log(`[API DELETE] Calling API to delete transaction: ${id}`);
    deleteTransaction.mutate(id);
  };
  
  // Update transaction mutation
  const updateTransaction = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Transaction> }) => {
      console.log(`[API REQUEST] PATCH /api/transactions/${id} with data:`, data);
      return apiRequest('PATCH', `/api/transactions/${id}`, data);
    },
    onSuccess: (_, variables) => {
      // Save the updated transaction to localStorage for persistence
      const { id, data } = variables;
      const currentQueryData = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
      const transaction = currentQueryData?.find(t => t.id === id);
      
      if (transaction) {
        // Create updated transaction
        const updatedTransaction = { ...transaction, ...data };
        
        // Save to localStorage for persistence across sessions
        saveEditedTransaction(updatedTransaction);
        console.log(`Saved regular transaction edit to localStorage: ${updatedTransaction.id} - ${updatedTransaction.amount}`);
      }
      
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
      // Regular transactions should use the DELETE request
      return apiRequest('DELETE', `/api/transactions/${id}`);
    },
    onSuccess: (_, id) => {
      // Also save to localStorage for consistent handling
      persistDeletedTransaction(id);
      console.log(`Regular transaction ${id} deletion saved to localStorage`);
      
      // Show success message
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      
      // Force a data refresh
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
  
  // Add savings mutation
  const addSavings = useMutation({
    mutationFn: (savingsData: Omit<Savings, "id">) => {
      return apiRequest('POST', '/api/savings', savingsData);
    },
    onSuccess: () => {
      // No success toast as per user preference
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      setShowSavingsModal(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add savings: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete savings mutation
  const deleteSavings = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/savings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Savings entry deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete savings: ${error}`,
        variant: "destructive",
      });
    }
  });
  
  // Handler for editing a transaction
  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    // Check if this is a "Mark as Paid" toggle from the calendar view
    if ('displayDate' in transaction && transaction.isPaid !== undefined) {
      console.log(`[MARK AS PAID] Handling paid toggle for ${transaction.title} (${transaction.id}): ${transaction.isPaid}`);
      
      // For recurring transactions, save to localStorage with month-specific key
      if (transaction.isRecurring) {
        const dateToUse = 'displayDate' in transaction ? transaction.displayDate : transaction.date;
        const dateObj = typeof dateToUse === 'string' ? new Date(dateToUse) : dateToUse;
        
        if (!dateObj) {
          console.error(`[ERROR] No valid date found for marking recurring transaction as paid`);
          toast({
            title: "Error",
            description: "Could not determine the date for this transaction",
            variant: "destructive"
          });
          return;
        }
        
        // Use our new helper function for month-specific tracking
        const isPaidValue = transaction.isPaid === true;
        const id = transaction.id;
        
        // Use the new utility function to mark this transaction as paid
        markMonthlyTransactionAsPaid(id, dateObj, isPaidValue);
        
        // Show success message
        toast({
          title: "Updated",
          description: `${transaction.title} marked as ${isPaidValue ? 'paid' : 'unpaid'} for ${format(dateObj, 'MMMM yyyy')}`,
          duration: 3000
        });
        

        
        console.log(`[MONTH SPECIFIC] Set transaction ${id} (${transaction.title}) paid status to ${isPaidValue} for month ${format(dateObj, 'yyyy-MM')}`);
        
        // Also store a master record entry for additional verification
        try {
          const monthKey = format(dateObj, 'yyyy-MM');
          const masterKey = `month_paid_statuses_${monthKey}`;
          const existingData = localStorage.getItem(masterKey) || '{}';
          const monthStatuses = JSON.parse(existingData);
          monthStatuses[id] = isPaid;
          localStorage.setItem(masterKey, JSON.stringify(monthStatuses));
        } catch (error) {
          console.error('Error updating master paid status record:', error);
        }
      
        
        // Force update cached data
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        
        toast({
          title: transaction.isPaid ? "Marked as Paid" : "Marked as Unpaid",
          description: `Transaction "${transaction.title}" updated successfully`
        });
        
        return;
      }
      
      // For regular transactions, update via API
      updateTransaction.mutate({ 
        id: transaction.id, 
        data: { isPaid: transaction.isPaid } 
      });
      
      return;
    }
    
    // Special handling for webflow transaction to ensure it's editable
    if (transaction.title === "webflow") {
      console.log("[WEBFLOW EDIT] Special handling for webflow transaction");
      
      // Ensure all fields are properly set
      const enhancedTransaction: TransactionWithCategory = {
        ...transaction,
        title: "webflow",
        // Make sure isRecurring is explicitly set
        isRecurring: true,
        // Don't pass any category object that might be incomplete
        category: categories.find(c => c.id === transaction.categoryId) || undefined
      };
      
      // Set the transaction and open the edit modal
      setSelectedTransaction(enhancedTransaction);
      setShowEditModal(true);
    } else {
      // For regular edits, show the modal
      setSelectedTransaction(transaction);
      setShowEditModal(true);
    }
  };
  
  // Date changes now handled through the edit modal

  // Date manipulation for current view
  const currentMonthYear = format(selectedDate, 'MMMM yyyy');
  
  // Define type for transaction paid status
  interface RecurringTransactionPaidStatus {
    key: string;
    isPaid: boolean;
    lastUpdated: string;
  }
  
  // Helper function to clear problematic transaction paid statuses when switching months
  const clearProblematicTransactionStatuses = () => {
    try {
      // Get the current paid statuses
      const storedData = localStorage.getItem('recurring-transaction-paid-status');
      if (!storedData) return;
      
      const statuses = JSON.parse(storedData) as RecurringTransactionPaidStatus[];
      
      // Problematic transactions that need special handling
      const problematicTitles = ['TRW', 'Replit', 'Netflix', 'Orange', 'Karma daisy', 'webflow'];
      
      // Create a filtered list without these transactions (we'll regenerate them properly next time)
      const filteredStatuses = statuses.filter(status => {
        const title = status.key.split('_')[0];
        return !problematicTitles.includes(title);
      });
      
      // Save back to localStorage
      localStorage.setItem('recurring-transaction-paid-status', JSON.stringify(filteredStatuses));
      console.log(`[MONTH CHANGE] Cleared paid statuses for problematic transactions: ${problematicTitles.join(', ')}`);
      
      // Force cache invalidation for transactions to ensure refresh
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    } catch (error) {
      console.error('Error clearing problematic transaction statuses:', error);
    }
  };

  const handlePrevMonth = () => {
    // Clear problematic transaction statuses before changing month
    clearProblematicTransactionStatuses();
    
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
    
    // Show a toast to inform the user what's happening
    toast({
      title: "Recurring Transaction Status Reset",
      description: "Paid status for recurring transactions has been refreshed for the new month view.",
      variant: "default",
    });
  };

  const handleNextMonth = () => {
    // Clear problematic transaction statuses before changing month
    clearProblematicTransactionStatuses();
    
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
    
    // Show a toast to inform the user what's happening
    toast({
      title: "Recurring Transaction Status Reset",
      description: "Paid status for recurring transactions has been refreshed for the new month view.",
      variant: "default",
    });
  };

  const handleToday = () => {
    // Clear problematic transaction statuses when going to today's view
    clearProblematicTransactionStatuses();
    
    setSelectedDate(new Date());
    
    // Show a toast to inform the user what's happening
    toast({
      title: "Today's View",
      description: "Showing today's transactions with refreshed recurring transaction statuses.",
      variant: "default",
    });
  };
  
  // For testing purposes: jump to May 2025
  const jumpToMay2025 = () => {
    const may2025 = new Date(2025, 4, 15); // May 15, 2025
    setSelectedDate(may2025);
  };
  
  // For testing purposes: jump to June 2025
  const jumpToJune2025 = () => {
    const june2025 = new Date(2025, 5, 15); // June 15, 2025
    setSelectedDate(june2025);
  };
  
  // Special function to create a new RP training app starting in June
  const createRPTrainingApp = () => {
    const june2025 = new Date(2025, 5, 12); // June 12, 2025
    
    // Create a recurring transaction that starts in June
    addTransaction.mutate({
      title: "RP Training App",
      amount: 151.12, // Original amount
      date: june2025,
      categoryId: categories.find(c => c.name === "Subscriptions")?.id || 1,
      personLabel: "Michał",
      isExpense: true,
      isRecurring: true,
      recurringInterval: "monthly",
      recurringEndDate: null, // No end date
      notes: "Created as a replacement starting from June 2025",
      isPaid: false
    });
    
    // Navigate to June to see it
    setSelectedDate(june2025);
    
    toast({
      title: "RP Training App Created",
      description: "Created new recurring transaction starting from June 2025",
      duration: 5000,
    });
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

  // Get hardcoded income transactions for critical months (May 2025-Mar 2026)
  // Filter out any transactions that have been marked as deleted
  const hardcodedIncome = useMemo(() => {
    // Get month and year for current view
    const viewMonth = selectedDate.getMonth();
    const viewYear = selectedDate.getFullYear();
    
    // Check if we're viewing May 2025 through March 2026
    if ((viewYear === 2025 && viewMonth >= 4) || (viewYear === 2026 && viewMonth <= 2)) {
      // Create hardcoded transactions for this view
      const hardcodedMap = createHardcodedIncomeTransactions(viewMonth, viewYear, transactions);
      
      // Convert the hardcoded map into an array of transactions
      const allTransactions = Object.values(hardcodedMap).flat();
      
      // Filter out any transactions that have been marked as deleted
      const result = allTransactions.filter(tx => !isTransactionDeleted(tx.id));
      
      // Log for debugging
      console.log(`🔥 Created ${result.length} hardcoded income transactions for ${format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}`);
      if (allTransactions.length !== result.length) {
        console.log(`[Income] Filtered out ${allTransactions.length - result.length} deleted transactions`);
      }
      
      return result;
    }
    
    // For normal months, return empty array
    return [];
  }, [transactions, selectedDate, deletedHardcodedTransactionIds]);
  
  // Get hardcoded recurring expenses/subscriptions for all months
  // Filter out any transactions that have been marked as deleted
  const hardcodedExpenses = useMemo(() => {
    // Get month and year for current view
    const viewMonth = selectedDate.getMonth();
    const viewYear = selectedDate.getFullYear();
    
    // Apply for all view months, focusing on 2025 and early 2026
    if ((viewYear === 2025) || (viewYear === 2026 && viewMonth <= 2)) {
      // Create hardcoded expense transactions for this view
      const hardcodedMap = createHardcodedExpenseTransactions(viewMonth, viewYear, transactions);
      
      // Convert the map into an array of transactions
      const allTransactions = Object.values(hardcodedMap).flat();
      
      // Filter out any transactions that have been marked as deleted
      const result = allTransactions.filter(tx => !isTransactionDeleted(tx.id));
      
      if (result.length > 0) {
        console.log(`🔄 Added ${result.length} hardcoded recurring expenses/subscriptions for ${format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}`);
        if (allTransactions.length !== result.length) {
          console.log(`[Expenses] Filtered out ${allTransactions.length - result.length} deleted transactions`);
        }
      }
      
      return result;
    }
    
    // For other months, return empty array
    return [];
  }, [transactions, selectedDate, deletedHardcodedTransactionIds]);
  
  // Filter transactions to only show ones from the current month in the sidebar
  const currentMonthTransactions = useMemo(() => {
    // Get the start and end of the current month
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    // Only include transactions that occur within the current month
    const regularTransactions = transactions.filter(transaction => {
      const transactionDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date) 
        : transaction.date;
      
      // Special filter for RP training app - exclude it from all months before June 2025
      if ((transaction.title === "RP training app" || transaction.title === "Rp training app")) {
        const month = transactionDate.getMonth();
        const year = transactionDate.getFullYear();
        
        // If we're viewing May 2025 or earlier, don't show RP training app
        if (year === 2025 && month <= 4) {
          console.log(`[View filter] Hiding RP training app in ${format(transactionDate, 'MMMM yyyy')} view`);
          return false;
        }
      }
        
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    // Start with regular transactions
    let result = regularTransactions;
    
    // If we have hardcoded income, add it (and filter out duplicates)
    if (hardcodedIncome.length > 0) {
      result = [
        ...hardcodedIncome,
        ...regularTransactions.filter(t => 
          // Keep all expenses
          t.isExpense || 
          // For income, filter out ones that would be duplicates of our hardcoded income
          !hardcodedIncome.some(ht => ht.title === t.title)
        )
      ];
    }
    
    // If we have hardcoded expenses, add them (and filter out duplicates) 
    if (hardcodedExpenses.length > 0) {
      // Filter out any transactions that would be duplicates of hardcoded expenses
      const filteredTransactions = result.filter(t => 
        // Keep all income
        !t.isExpense || 
        // For expenses, filter out ones that would be duplicates of our hardcoded expenses
        !hardcodedExpenses.some(he => 
          he.title === t.title && 
          he.isRecurring === t.isRecurring &&
          format(new Date(he.date), 'yyyy-MM-dd') === format(new Date(t.date), 'yyyy-MM-dd')
        )
      );
      
      // Return combined array with hardcoded expenses
      return [...filteredTransactions, ...hardcodedExpenses];
    }
    
    return result;
  }, [transactions, hardcodedIncome, hardcodedExpenses, selectedDate]);
  
  // Extract unique transaction titles for autocomplete
  const uniqueTitles = useMemo(() => {
    return getUniqueTitles(transactions);
  }, [transactions]);

  // Filter transactions based on active category and person
  const filteredTransactions = currentMonthTransactions.filter((t) => {
    // Apply category filter
    if (activeFilter !== null && t.category?.name !== activeFilter) {
      return false;
    }
    
    // Apply person filter
    if (activePersonFilter !== null && t.personLabel !== activePersonFilter) {
      return false;
    }
    
    return true;
  });

  return (
      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-auto">
        {/* Idle detection and security overlay */}
        <IdleSessionHandler 
          timeoutMs={2 * 60 * 1000} // 2 minutes timeout
          onTimeout={handleUserIdle} 
        />
        <SecurityOverlay isVisible={isIdle} />
        
        {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-foreground">Expense Planner</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // Debug function to check localStorage values
                  const paidStatuses = JSON.parse(localStorage.getItem('recurring-transaction-paid-status') || '[]') as RecurringTransactionPaidStatus[];
                  console.log('[DEBUG] Current paid statuses in localStorage:', paidStatuses);
                  
                  // Check for duplicates or issues
                  const titles: Set<string> = new Set();
                  const potentialDuplicates: string[] = [];
                  
                  paidStatuses.forEach(status => {
                    const [title, date] = status.key.split('_');
                    const simplifiedKey = `${title}_${date.substring(0, 10)}`;  // Only keep YYYY-MM-DD part
                    
                    if (titles.has(simplifiedKey)) {
                      potentialDuplicates.push(simplifiedKey);
                    }
                    titles.add(simplifiedKey);
                  });
                  
                  if (potentialDuplicates.length > 0) {
                    console.log('[DEBUG] Found potential duplicate keys:', potentialDuplicates);
                  }
                  
                  // Check for problematic transactions
                  const problematicTitles = ['TRW', 'Replit', 'Netflix', 'Orange', 'Karma daisy'];
                  const problematicStatuses = paidStatuses.filter(status => {
                    const title = status.key.split('_')[0];
                    return problematicTitles.includes(title);
                  });
                  
                  if (problematicStatuses.length > 0) {
                    console.log('[DEBUG] Problematic transaction statuses:', problematicStatuses);
                  }
                  
                  // Display toast to confirm debug ran
                  toast({
                    title: "Debug Complete",
                    description: `Check console for localStorage data. Found ${paidStatuses.length} paid statuses.`,
                    variant: "default",
                  });
                }}
                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-md"
              >
                Debug
              </button>
              
              <button 
                onClick={() => {
                  console.log("[FACTORY RESET STARTED] Clearing all paid statuses...");
                  
                  // Get all localStorage keys
                  const allKeys = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                      allKeys.push(key);
                    }
                  }
                  
                  console.log("[FACTORY RESET] All localStorage keys:", allKeys);
                  
                  // CLEAR ABSOLUTELY EVERYTHING
                  // 1. Clear the standard recurring transaction status store
                  localStorage.removeItem('recurring-transaction-paid-status');
                  console.log("[FACTORY RESET] Removed recurring-transaction-paid-status");
                  
                  // 2. Clear ALL transaction status-related storage
                  let found = 0;
                  allKeys.forEach(key => {
                    // Delete ALL status keys and debug info from all storage techniques
                    if (key.startsWith('fixed_status_') || 
                        key.includes('_debug') || 
                        key.includes('_timestamp') ||
                        key.startsWith('strict_paid_') ||
                        key.startsWith('txn_status_') ||
                        key.startsWith('monthly_strict_')) {
                      localStorage.removeItem(key);
                      found++;
                      console.log(`[FACTORY RESET] Removed key: ${key}`);
                    }
                  });
                  
                  // 3. Also clear our new strict monthly paid status system
                  const { clearAllMonthlyStatuses } = require('../utils/monthlyStatus');
                  const strictCleared = clearAllMonthlyStatuses();
                  console.log(`[FACTORY RESET] Cleared ${strictCleared} strict monthly status records`);
                  
                  // 4. Also clear any other transaction-related storage that might be causing issues
                  const additionalKeys = [
                    'transaction-amount-preferences',
                    'recurring-transaction-paid-status',
                    'transaction-preferences',
                    'karma-status',
                    'netflix-status',
                    'orange-status',
                    'trw-status',
                    'replit-status'
                  ];
                  
                  additionalKeys.forEach(key => {
                    if (localStorage.getItem(key)) {
                      localStorage.removeItem(key);
                      console.log(`[FACTORY RESET] Removed possible status key: ${key}`);
                      found++;
                    }
                  });
                  
                  console.log(`[FACTORY RESET] Removed ${found} status records in total`);
                  
                  // Force refresh of transactions
                  queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                  
                  // Display toast to confirm
                  toast({
                    title: "Factory Reset Complete",
                    description: `Deep clean of all statuses: removed ${found} records.`,
                    variant: "destructive",
                  });
                  
                  // Force refresh page to ensure clean state
                  window.location.reload();
                }}
                className="text-xs bg-rose-100 hover:bg-rose-200 dark:bg-rose-800 dark:hover:bg-rose-700 px-2 py-1 rounded-md"
              >
                Factory Reset
              </button>
              
              <button 
                onClick={() => {
                  // This tests our strict monthly isolation for Netflix across different months
                  const title = "Netflix";
                  
                  // Create a unique key for May
                  const mayKey = `strict_paid_${title.replace(/\s+/g, '_')}_2025-05`;
                  localStorage.setItem(mayKey, "true");
                  console.log(`[TEST] Set ${title} May status to TRUE (${mayKey})`);
                  
                  // Create a unique key for June
                  const juneKey = `strict_paid_${title.replace(/\s+/g, '_')}_2025-06`;
                  localStorage.setItem(juneKey, "false");
                  console.log(`[TEST] Set ${title} June status to FALSE (${juneKey})`);
                  
                  // Show notification
                  toast({
                    title: "Monthly Isolation Test Created",
                    description: "Netflix now has different status in May (paid) and June (unpaid). Switch months to verify isolation.",
                  });
                  
                  // Force refresh transactions
                  queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                }}
                className="text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 px-2 py-1 rounded-md ml-2"
              >
                Test Isolation
              </button>
            </div>
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
            
            {/* New Component: Manage Skipped Transactions */}
            <ManageSkippedTransactions 
              transactions={currentMonthTransactions}
              currentDate={selectedDate}
            />
            

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    {/* Budget Warning Indicator - Visible only when budget is negative */}
                    {currentBudget < 0 && (
                      <div className="absolute -right-2 -top-2 w-5 h-5 flex items-center justify-center bg-destructive text-white rounded-full text-xs">
                        !
                      </div>
                    )}
                    <div className="tooltip-wrapper" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Always show warning toast - hardcoded budget protection
                        toast({
                          title: "⛔ BUDGET PROTECTION ACTIVATED",
                          description: `Adding expenses is BLOCKED: Current balance is -89.71 PLN (negative). You must add income first.`,
                          variant: "destructive",
                          duration: 3000
                        });
                      }}
                    >
                      <button 
                        className="px-4 py-2 text-white rounded-md transition font-medium text-sm bg-gray-500 cursor-not-allowed opacity-70" 
                        disabled={true}
                      >
                        Add Expense
                      </button>
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {currentBudget < 0 
                    ? <p className="text-destructive font-semibold">Budget Protection: Current budget is {currentBudget.toFixed(2)} PLN. Add income first.</p>
                    : <p>Press 'E' to quickly add expense</p>
                  }
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
                  <button 
                    onClick={() => setShowSavingsModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-medium text-sm"
                  >
                    Add Savings
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Press 'S' to quickly add savings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <KeyboardShortcuts />
          </div>
        </div>
      </header>
      
      {/* Monthly Savings (Always Visible) */}
      <div className="bg-background pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <MonthlySavingsSummary 
          transactions={transactions}
          currentDate={selectedDate}
          isLoading={isLoadingTransactions}
        />
      </div>

      {/* Summary Cards */}
      <div className="bg-background py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="grid grid-cols-1 gap-4">
            {/* Subscription Summary */}
            <SubscriptionSummary 
              transactions={transactions}
              isLoading={isLoadingTransactions || isLoadingCategories}
            />
            
            {/* Recurring Expenses Summary */}
            <RecurringExpensesSummary 
              transactions={transactions}
              isLoading={isLoadingTransactions || isLoadingCategories}
            />
            
            {/* Savings Summary */}
            <SavingsSummary
              savings={savings}
              transactions={transactions}
              isLoading={isLoadingSavings || isLoadingTransactions}
              onDeleteSavings={(id) => deleteSavings.mutate(id)}
              isPending={deleteSavings.isPending}
              currentDate={selectedDate}
            />
          </div>
          
          {/* Right Column */}
          <div className="grid grid-cols-1 gap-4">
            {/* Upcoming Expenses */}
            <UpcomingExpenses
              transactions={transactions}
              isLoading={isLoadingTransactions}
              onEditTransaction={handleEditTransaction}
              currentDate={selectedDate}
              onBudgetUpdate={setCurrentBudget}
            />
            
            {/* Budget Coaching Companion */}
            <div className="mt-4">
              <BudgetCoachingCompanion
                transactions={transactions}
                isLoading={isLoadingTransactions}
                currentDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col w-full">
        {/* Calendar and Sidebar */}
        <main className="flex-1 overflow-auto flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4">
          {/* Calendar View */}
          <ExpenseCalendar 
            transactions={filteredTransactions}
            currentDate={selectedDate}
            currentMonthYear={currentMonthYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onSelectToday={handleToday}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onDayClick={(date) => {
              // Create a new date object at noon to ensure timezone consistency
              const year = date.getFullYear();
              const month = date.getMonth();
              const day = date.getDate();
              const clickedDate = new Date(year, month, day, 12, 0, 0);
              
              console.log('Day clicked:', 
                          `${year}-${month+1}-${day}`, 
                          'ISO:', clickedDate.toISOString());
              
              // ONLY update the selected date, don't show any modal
              setSelectedDate(clickedDate);
              
              // Explicitly cancel any popups that might be trying to show
              setShowExpenseModal(false);
              setShowIncomeModal(false);
            }}
            isLoading={isLoadingTransactions}
            activeView={activeView}
          />

          {/* Sidebar View */}
          <ExpenseSidebar 
            transactions={currentMonthTransactions}
            categories={categories}
            currentMonthYear={currentMonthYear}
            currentDate={selectedDate}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            activePersonFilter={activePersonFilter}
            onPersonFilterChange={setActivePersonFilter}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            isLoading={isLoadingTransactions || isLoadingCategories}
          />
        </main>
        
        {/* Expense Analysis Charts */}
        <div className="bg-background py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <h2 className="text-xl font-semibold mb-4">Expense Analysis</h2>
          
          {/* Use a current month key to force remounting of charts when month changes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" 
               key={`charts-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}>
            {/* Person Distribution Chart */}
            <ExpensesPieChart 
              transactions={currentMonthTransactions}
              currentDate={selectedDate}
              isLoading={isLoadingTransactions}
            />
            
            {/* Category Distribution Chart */}
            <ExpensesByCategoryChart
              transactions={currentMonthTransactions}
              currentDate={selectedDate}
              isLoading={isLoadingTransactions}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Pass the current selected date to modal */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onAddExpense={(data) => {
          // MAJOR DEBUG INFO - Log to identify if this code is being executed
          console.log(`[DEBUG-PLANNER] ⚠️ BUDGET CHECK RUNNING IN EXPENSE PLANNER - Budget: ${currentBudget} PLN, Expense: ${data.amount} PLN`);
          
          // DIRECT BUDGET CHECK - Most straightforward implementation
          if (currentBudget < 0) {
            console.log(`[DEBUG-PLANNER] 🚫 BLOCKING: Negative budget ${currentBudget.toFixed(2)} PLN`);
            
            // Show clear visible notification
            toast({
              title: "⛔ Budget Protection - BLOCKED",
              description: `Cannot add expense: Budget already negative (${currentBudget.toFixed(2)} PLN)`,
              variant: "destructive",
              duration: 7000
            });
            
            // Close modal and prevent transaction
            setShowExpenseModal(false);
            return;
          }
          
          // If expense would exceed budget
          if (data.amount > currentBudget) {
            console.log(`[DEBUG-PLANNER] ⚠️ WARNING: Expense ${data.amount.toFixed(2)} PLN exceeds budget ${currentBudget.toFixed(2)} PLN`);
            
            // Show warning but don't handle here - let modal handle it
            toast({
              title: "⚠️ Budget Warning",
              description: `Expense (${data.amount.toFixed(2)} PLN) exceeds budget (${currentBudget.toFixed(2)} PLN)`,
              variant: "destructive",
              duration: 5000
            });
            return;
          }
          
          // Budget is sufficient, proceed with expense
          console.log(`[DEBUG-PLANNER] ✅ APPROVED: Budget check passed - adding transaction`);
          addTransaction.mutate({ ...data, isExpense: true });
        }}
        categories={categories.filter((c: Category) => c.isExpense)}
        isPending={addTransaction.isPending}
        titleSuggestions={uniqueTitles}
        defaultDate={selectedDate}
        currentBudget={currentBudget}
      />

      <AddIncomeModal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onAddIncome={(data) => addTransaction.mutate({ ...data, isExpense: false })}
        isPending={addTransaction.isPending}
        titleSuggestions={uniqueTitles}
      />
      
      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        onUpdateTransaction={(id, data) => {
          // Get the current transaction we're editing to check if it's part of our data model
          const transactionToUpdate = transactions.find(t => t.id === id);
          const transactionInHardcodedIncome = hardcodedIncome.find(t => t.id === id);  
          const transactionInHardcodedExpenses = hardcodedExpenses.find(t => t.id === id);
          
          // Get the title of the transaction being edited
          const transactionTitle = selectedTransaction?.title || '';
          
          // Special hardcoded transactions we know need client-side handling
          // NOTE: We've removed special transaction detection by title to allow all transactions with large amounts
          // to be properly stored in the database
          const specialTransactionTitles: string[] = [];
          const isSpecialTransaction = false;
          
          // Specifically exclude certain real database transactions from being treated as hardcoded
          // even if they appear in hardcoded arrays due to being recurring
          const excludeFromHardcoded = ["Grocerries", "Sukienka Fabi", "Coffee Machine"];
          const shouldForceAPI = id < 970000 && excludeFromHardcoded.includes(transactionTitle);
          
          // Check if it's a hardcoded transaction (either by ID range, presence in hardcoded arrays, or special title)
          // If it's in our exclude list, always use the API
          const isHardcoded = shouldForceAPI ? false : 
                            (id >= 970000 || 
                            transactionInHardcodedIncome !== undefined || 
                            transactionInHardcodedExpenses !== undefined ||
                            isSpecialTransaction);
          
          console.log(`Transaction ID to update: ${id} - Is it hardcoded?`, {
            title: transactionTitle,
            byIdRange: id >= 970000,
            inHardcodedIncome: transactionInHardcodedIncome !== undefined,
            inHardcodedExpenses: transactionInHardcodedExpenses !== undefined,
            isSpecialTransaction,
            isExcluded: excludeFromHardcoded.includes(transactionTitle),
            shouldForceAPI,
            finalDecision: isHardcoded
          });
          
          if (isHardcoded) {
            console.log(`Client-side handling for hardcoded transaction edit: ${id}`);
            
            // Show success toast
            toast({
              title: "Success",
              description: "Transaction updated (client-side only)",
            });
            
            // 1. Get the current data from cache
            const currentQueryData = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
            
            // 2. Save the updated transaction to localStorage for persistence
            const transaction = currentQueryData?.find(t => t.id === id);
            if (transaction) {
              // Create updated transaction
              const updatedTransaction = { ...transaction, ...data };
              
              // If this is a recurring transaction and isPaid is changing, use month-specific tracking
              if (updatedTransaction.isRecurring && 'isPaid' in data) {
                // Get the date to use (either displayDate for recurring instances or regular date)
                const dateToUse = (updatedTransaction as any).displayDate || updatedTransaction.date;
                const dateObj = new Date(dateToUse);
                
                // Import the monthly status tracking function
                const { markPaid } = require('@/utils/monthlyStatus');
                
                // Save the paid status with month-specific isolation
                markPaid(
                  updatedTransaction.id, 
                  dateObj, 
                  Boolean(data.isPaid)
                );
                console.log(`[STRICT ISOLATION] Saved month-specific paid status for ${updatedTransaction.title} on ${format(new Date(dateToUse), 'yyyy-MM-dd')}: ${data.isPaid}`);
              }
              
              // Save to localStorage for persistence across sessions (as a backup)
              saveEditedTransaction(updatedTransaction);
              console.log(`Saved transaction edit to localStorage: ${updatedTransaction.id} - ${updatedTransaction.amount}`);
            }
            
            // 3. Update react-query cache to immediately reflect the change in UI
            if (currentQueryData) {
              // Find and update the transaction in cache
              const updatedQueryData = currentQueryData.map(t => {
                if (t.id === id) {
                  // Return updated transaction 
                  return { ...t, ...data };
                }
                return t;
              });
              
              // Update cache
              queryClient.setQueryData<TransactionWithCategory[]>(
                ['/api/transactions'],
                updatedQueryData
              );
              console.log(`Updated QueryClient cache for transaction ${id}`);
            }
            
            // 2. Force complete cache invalidation to rebuild all derived data
            queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
            console.log(`Invalidated transaction queries to force refresh`);
            
            // 3. Force refresh by temporarily changing month and coming back
            const currentDate = new Date(selectedDate);
            const nextMonth = new Date(selectedDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            // Immediate update to current month view
            setSelectedDate(new Date(currentDate));
            
            // Schedule the month changes with delay (helps trigger full rerender)
            setTimeout(() => {
              console.log('Step 1: Moving to next month temporarily...');
              setSelectedDate(nextMonth);
              
              // Then back to current month
              setTimeout(() => {
                console.log('Step 2: Returning to original month...');
                setSelectedDate(currentDate);
              }, 200);
            }, 100);
            
            // Close the modal
            setShowEditModal(false);
            setSelectedTransaction(null);
          } else {
            // Regular transaction update via API
            console.log("Sending API update for transaction:", id);
            console.log("Update data:", data);
            updateTransaction.mutate({ id, data });
          }
        }}
        transaction={selectedTransaction}
        categories={categories}
        isPending={updateTransaction.isPending}
        titleSuggestions={uniqueTitles}
      />
      
      <AddSavingsModal
        isOpen={showSavingsModal}
        onClose={() => setShowSavingsModal(false)}
        onAddSavings={(data) => {
          // Ensure notes is never undefined
          const sanitizedData = {
            ...data,
            notes: data.notes || null
          };
          addSavings.mutate(sanitizedData);
        }}
        isPending={addSavings.isPending}
      />
    </div>
  );
}
