import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash, CalendarDays } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

// This component provides a targeted fix for the Fabi and Beni birthday transactions in June
export default function JuneBirthdayFix() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  function deleteJuneBirthdays() {
    setIsDeleting(true);
    
    try {
      // Specific dates for the birthday transactions in June
      const beniBirthdayDate = new Date(2025, 5, 9); // June 9, 2025
      const fabiBirthdayDate = new Date(2025, 5, 5); // June 5, 2025
      
      // Format for localStorage keys - YYYY-MM
      const juneKey = format(beniBirthdayDate, 'yyyy-MM');
      
      // Transaction IDs for Beni and Fabi birthdays
      const beniId = 36;
      const fabiId = 38;
      
      // Mark transactions as deleted in localStorage
      localStorage.setItem(`recurring_deleted_${beniId}_${juneKey}`, 'true');
      console.log(`[FIX] Beni birthday (ID: ${beniId}) marked as deleted for ${juneKey}`);
      
      localStorage.setItem(`recurring_deleted_${fabiId}_${juneKey}`, 'true');
      console.log(`[FIX] Fabi birthday (ID: ${fabiId}) marked as deleted for ${juneKey}`);
      
      // Refresh transaction data to apply changes
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Show success message
      toast({
        title: "Birthdays removed",
        description: "Successfully deleted Beni and Fabi birthdays for June 2025",
      });
      
    } catch (error) {
      console.error("[FIX ERROR]", error);
      toast({
        title: "Error",
        description: "Failed to delete birthday transactions",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <div className="p-4 mb-4 border rounded-md bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">June Birthday Fix</h3>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Delete Beni and Fabi birthday transactions for June 2025
      </p>
      
      <Button 
        onClick={deleteJuneBirthdays} 
        disabled={isDeleting} 
        variant="outline" 
        size="sm"
        className="w-full"
      >
        <Trash className="h-4 w-4 mr-2" />
        {isDeleting ? "Deleting..." : "Delete June Birthdays"}
      </Button>
    </div>
  );
}