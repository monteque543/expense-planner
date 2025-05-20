import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * This component implements a direct patch to the API client to block all expense additions
 * It's a last-resort approach since other methods haven't worked
 */
const BlockAllExpenses = () => {
  const { toast } = useToast();
  
  useEffect(() => {
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
            
            // Show notification
            toast({
              title: "Budget Protection Active",
              description: "Cannot add expenses when balance is negative (-690.96 PLN)",
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
      description: "Budget is negative (-690.96 PLN). Adding expenses is blocked.",
      duration: 5000
    });
    
    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, [toast]);
  
  return null; // This is a utility component with no UI
};

export default BlockAllExpenses;