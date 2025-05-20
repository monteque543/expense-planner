import { useState, useEffect } from 'react';
import { TransactionWithCategory } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, RefreshCw, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  getSkippedTransactionsForMonth,
  unskipTransactionForMonth
} from '@/utils/skipMonthUtils';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ManageSkippedTransactionsProps {
  transactions: TransactionWithCategory[];
  currentDate: Date;
}

export default function ManageSkippedTransactions({ 
  transactions,
  currentDate 
}: ManageSkippedTransactionsProps) {
  const [skippedIds, setSkippedIds] = useState<number[]>([]);
  const [skippedTransactions, setSkippedTransactions] = useState<TransactionWithCategory[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Get skipped transactions when dialog opens or currentDate changes
  useEffect(() => {
    if (open) {
      const skippedIds = getSkippedTransactionsForMonth(currentDate);
      setSkippedIds(skippedIds);
      
      // Find the full transaction details for each skipped ID
      const skippedTxns = transactions.filter(t => skippedIds.includes(t.id));
      setSkippedTransactions(skippedTxns);
      
      console.log(`Found ${skippedIds.length} skipped transactions for ${format(currentDate, 'MMMM yyyy')}`);
    }
  }, [open, currentDate, transactions]);

  // Function to restore a skipped transaction
  const handleRestoreTransaction = (transaction: TransactionWithCategory) => {
    try {
      // Restore the transaction by removing its skipped status
      unskipTransactionForMonth(transaction.id, currentDate);
      
      // Update the list
      const updatedIds = skippedIds.filter(id => id !== transaction.id);
      setSkippedIds(updatedIds);
      setSkippedTransactions(skippedTransactions.filter(t => t.id !== transaction.id));
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Show success message
      toast({
        title: "Transaction Restored",
        description: `"${transaction.title}" will now appear in ${format(currentDate, 'MMMM yyyy')} again.`,
        duration: 3000,
      });
    } catch (err) {
      console.error('Error restoring transaction:', err);
      toast({
        title: "Error",
        description: "Failed to restore transaction.",
        variant: "destructive",
      });
    }
  };
  
  // Function to restore all skipped transactions
  const handleRestoreAll = () => {
    try {
      // Restore all skipped transactions
      skippedTransactions.forEach(transaction => {
        unskipTransactionForMonth(transaction.id, currentDate);
      });
      
      // Clear lists
      setSkippedIds([]);
      setSkippedTransactions([]);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Close dialog
      setOpen(false);
      
      // Show success message
      toast({
        title: "All Transactions Restored",
        description: `All skipped transactions for ${format(currentDate, 'MMMM yyyy')} have been restored.`,
        duration: 3000,
      });
    } catch (err) {
      console.error('Error restoring all transactions:', err);
      toast({
        title: "Error",
        description: "Failed to restore all transactions.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Undo2 className="h-4 w-4" />
          <span>Restore Skipped</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Skipped Transactions</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {skippedTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p>No skipped transactions for {format(currentDate, 'MMMM yyyy')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {skippedTransactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between border p-3 rounded-md"
                  >
                    <div>
                      <div className="font-medium">{transaction.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.date), 'MMM d, yyyy')} · {transaction.amount.toFixed(2)} PLN
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRestoreTransaction(transaction)}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          {skippedTransactions.length > 0 && (
            <Button 
              variant="secondary" 
              onClick={handleRestoreAll}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Restore All
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}