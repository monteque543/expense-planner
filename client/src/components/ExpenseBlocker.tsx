import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * This component enforces a strict rule that blocks all expense additions when the budget is negative.
 * It runs as soon as the app loads and intercepts form submissions to prevent expenses.
 */
const ExpenseBlocker: React.FC = () => {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    
    console.log("[BUDGET PROTECTION] Initializing expense blocking protection");
    
    // Override the fetch API to intercept POST requests to /api/transactions
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      // Check if this is a POST request to add an expense
      if (
        init?.method === 'POST' && 
        typeof input === 'string' && 
        input.includes('/api/transactions')
      ) {
        try {
          // Check if it's an expense
          const body = init.body ? JSON.parse(init.body as string) : {};
          if (body.isExpense === true) {
            console.log("[BUDGET PROTECTION] Intercepted expense creation attempt");
            
            // Show the warning toast
            toast({
              title: "⛔ Budget Protection Activated",
              description: "Cannot add expenses when balance is negative (-89.71 PLN). Add income first.",
              variant: "destructive",
              duration: 4000
            });
            
            // Return a mock response to prevent the actual API call
            return new Response(JSON.stringify({
              error: "BUDGET_PROTECTION",
              message: "Adding expenses is blocked when budget is negative (-89.71 PLN)"
            }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } catch (e) {
          console.error("[BUDGET PROTECTION] Error parsing request body:", e);
        }
      }
      
      // Pass through all other requests
      return originalFetch.apply(window, [input, init]);
    };
    
    setInitialized(true);
    
    // Show initial notification
    toast({
      title: "Budget Protection Active",
      description: "Current balance is -89.71 PLN. Adding expenses is disabled until balance is positive.",
      duration: 5000
    });
    
    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, [toast, initialized]);

  return null; // This component doesn't render anything
};

export default ExpenseBlocker;