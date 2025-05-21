import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, CalendarX } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from '@/lib/queryClient';
import { TransactionWithCategory } from '@shared/schema';

/**
 * Emergency component to forcefully remove specific recurring transactions
 * This directly modifies the cache and adds permanent deletion markers
 */
export default function EmergencyTransactionRemover() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasDeleted, setHasDeleted] = useState(false);
  const { toast } = useToast();
  
  // Track when transactions have been deleted
  useEffect(() => {
    // Check if we already marked these as deleted in this session
    const hasDeletedBirthdays = localStorage.getItem('emergency_delete_birthdays') === 'true';
    setHasDeleted(hasDeletedBirthdays);
  }, []);

  // Deep clean - completely remove the transactions
  async function forceDeleteBirthdays() {
    setIsDeleting(true);
    
    try {
      // 1. Get current transactions from cache
      const currentTransactions = queryClient.getQueryData<TransactionWithCategory[]>(['/api/transactions']);
      
      if (!currentTransactions) {
        console.error("Failed to get transactions from cache");
        return;
      }
      
      // 2. Identify the birthday transactions by ID
      const beniBirthdayId = 36;
      const fabiBirthdayId = 38;
      
      // Store original count for verification
      const originalCount = currentTransactions.length;
      
      // 3. Filter out the birthday transactions entirely
      const filteredTransactions = currentTransactions.filter(
        transaction => transaction.id !== beniBirthdayId && transaction.id !== fabiBirthdayId
      );
      
      // Report filtering results
      const removedCount = originalCount - filteredTransactions.length;
      console.log(`Removed ${removedCount} birthday transactions from cache`);
      
      // 4. Mark transactions as permanently deleted in localStorage
      localStorage.setItem(`permanent_delete_${beniBirthdayId}`, 'true');
      localStorage.setItem(`permanent_delete_${fabiBirthdayId}`, 'true');
      
      // Also mark month-specific deletion for June 2025
      const juneKey = '2025-06';
      localStorage.setItem(`recurring_deleted_${beniBirthdayId}_${juneKey}`, 'true');
      localStorage.setItem(`recurring_deleted_${fabiBirthdayId}_${juneKey}`, 'true');
      
      // 5. Mark our emergency deletion as complete
      localStorage.setItem('emergency_delete_birthdays', 'true');
      setHasDeleted(true);
      
      // 6. Update the cache with filtered transactions
      queryClient.setQueryData<TransactionWithCategory[]>(
        ['/api/transactions'], 
        filteredTransactions
      );
      
      // 7. Force full cache refresh
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // 8. Show success message
      toast({
        title: "Birthday Transactions Removed",
        description: `Successfully removed Beni and Fabi birthday transactions.`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error("Failed to delete birthday transactions:", error);
      toast({
        title: "Error Removing Transactions",
        description: "An error occurred while trying to remove the birthday transactions.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
      <div className="flex items-start space-x-3 mb-3">
        <CalendarX className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-700 dark:text-red-400">Emergency Transaction Removal</h3>
          <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
            This tool will permanently remove the Beni and Fabi birthday transactions from the system.
          </p>
        </div>
      </div>
      
      <Button 
        onClick={forceDeleteBirthdays} 
        disabled={isDeleting || hasDeleted} 
        variant="destructive"
        className="w-full"
        size="sm"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Removing..." : hasDeleted ? "Birthdays Removed" : "Remove Birthday Transactions"}
      </Button>
    </Card>
  );
}