import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Calendar } from 'lucide-react';
import { markDeleted } from '@/utils/monthlyStatus';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from '@/lib/queryClient';

/**
 * Emergency fix for deleting Beni and Fabi birthday transactions in June 2025
 */
export default function FixJuneBirthdays() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [deleted, setDeleted] = useState({
    beni: false,
    fabi: false
  });

  function deleteJuneBirthdays() {
    setIsLoading(true);
    try {
      // Special fix for Beni's birthday in June
      const beniDate = new Date(2025, 5, 9); // June 9, 2025
      markDeleted(36, beniDate, true);
      console.log("Deleted Beni birthday for June 2025");
      setDeleted(prev => ({...prev, beni: true}));
      
      // Special fix for Fabi's birthday in June
      const fabiDate = new Date(2025, 5, 5); // June 5, 2025
      markDeleted(38, fabiDate, true);
      console.log("Deleted Fabi birthday for June 2025");
      setDeleted(prev => ({...prev, fabi: true}));
      
      // Force refresh transactions
      queryClient.invalidateQueries({queryKey: ['/api/transactions']});
      
      // Show success message
      toast({
        title: "Birthdays removed",
        description: "Successfully deleted Beni and Fabi birthdays for June 2025",
      });
    } catch (error) {
      console.error("Error deleting birthdays:", error);
      toast({
        title: "Error",
        description: "Failed to delete birthday transactions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-lg mb-4 bg-muted/20">
      <h3 className="text-sm font-medium mb-2">Fix June Birthday Transactions</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Use this tool to delete the recurring birthday transactions for Beni and Fabi in June.
      </p>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <div className={`h-2 w-2 rounded-full ${deleted.beni ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Beni Birthday (June 9th)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`h-2 w-2 rounded-full ${deleted.fabi ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Fabi Birthday (June 5th)</span>
        </div>
      </div>
      
      <Button 
        onClick={deleteJuneBirthdays} 
        disabled={isLoading || (deleted.beni && deleted.fabi)} 
        size="sm"
        variant="outline"
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isLoading ? 'Deleting...' : 'Delete June Birthdays'}
      </Button>
    </div>
  );
}