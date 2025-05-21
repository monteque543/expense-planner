import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

/**
 * This component implements a dynamic budget protection system that blocks expense additions
 * when the current month's balance is negative
 */
const BlockAllExpenses = () => {
  const { toast } = useToast();
  const [isBlocking, setIsBlocking] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  // Get current month's transactions to calculate balance
  const { data: transactions } = useQuery({ 
    queryKey: ['/api/transactions'],
    staleTime: 10000 // Refresh data fairly often
  });

  // Calculate current month's balance
  useEffect(() => {
    if (transactions) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      console.log(`Calculating budget for ${format(currentDate, 'MMMM yyyy')}`);
      
      // Filter transactions for current month
      const currentMonthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
      
      // Calculate income and expenses
      let totalIncome = 0;
      let totalExpense = 0;
      
      currentMonthTransactions.forEach(tx => {
        if (tx.isExpense) {
          totalExpense += tx.amount;
        } else {
          totalIncome += tx.amount;
        }
      });
      
      const balance = totalIncome - totalExpense;
      setCurrentBalance(balance);
      
      // Only block if balance is negative
      setIsBlocking(balance < 0);
      
      console.log(`Current month balance: ${balance.toFixed(2)} PLN (Income: ${totalIncome.toFixed(2)} PLN, Expenses: ${totalExpense.toFixed(2)} PLN)`);
      console.log(`Budget protection: ${balance < 0 ? 'ACTIVE' : 'INACTIVE'}`);
    }
  }, [transactions]);
  
  useEffect(() => {
    if (isBlocking) {
      console.log('🚫 CRITICAL: Installing global expense blocker');
      
      // Override fetch globally to block expense creation
      const originalFetch = window.fetch;
      
      window.fetch = async function(input, init) {
        // Check if this is an expense creation request
        if (init?.method === 'POST' && 
            input.toString().includes('/api/transactions') &&
            init.body) {
          
          try {
            const body = JSON.parse(init.body.toString());
            
            if (body.isExpense === true) {
              console.log('🚫 CRITICAL: Blocking expense creation attempt', body);
              
              // Show notification with current balance
              toast({
                title: "Budget Protection Active",
                description: `Cannot add expenses when balance is negative (${currentBalance.toFixed(2)} PLN)`,
                variant: "destructive",
                duration: 3000
              });
              
              // Return a mock response to prevent the actual request
              return Promise.resolve(new Response(JSON.stringify({
                error: 'BUDGET_NEGATIVE',
                message: 'Adding expenses is blocked when budget is negative'
              }), {
                status: 403,
                headers: {'Content-Type': 'application/json'}
              }));
            }
          } catch (e) {
            console.error('Error checking expense transaction:', e);
          }
        }
        
        // Allow all other requests to proceed normally
        return originalFetch.apply(window, [input, init]);
      };
      
      // Display initial notification
      toast({
        title: "Budget Protection Activated",
        description: `Budget is negative (${currentBalance.toFixed(2)} PLN). Adding expenses is blocked.`,
        duration: 5000
      });
      
      return () => {
        // Restore original fetch when component unmounts
        window.fetch = originalFetch;
      };
    }
  }, [isBlocking, currentBalance, toast]);
  
  return null; // This is a utility component with no UI
};

export default BlockAllExpenses;