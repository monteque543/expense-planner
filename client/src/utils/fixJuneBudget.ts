import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

/**
 * Fix June 2025 budget calculation by properly including all transactions
 * Based on the 1,100 PLN discrepancy found in the analysis
 */
export function fixJuneBudget(transactions: TransactionWithCategory[]) {
  console.log('=== FIXING JUNE 2025 BUDGET CALCULATION ===');
  
  const june2025 = new Date('2025-06-01');
  
  // Get all June 2025 transactions including recurring instances
  const juneTransactions: TransactionWithCategory[] = [];
  
  transactions.forEach(transaction => {
    const txDate = new Date(transaction.date);
    const isJuneTransaction = txDate.getFullYear() === 2025 && txDate.getMonth() === 5;
    
    if (isJuneTransaction) {
      juneTransactions.push(transaction);
      console.log(`[JUNE TX] Original: ${transaction.title} - ${transaction.amount} PLN (${format(txDate, 'yyyy-MM-dd')})`);
    }
    
    // Add recurring instances that should appear in June 2025
    if (transaction.isRecurring && !isJuneTransaction) {
      const originalDate = new Date(transaction.date);
      
      // Check if this recurring transaction would have an instance in June 2025
      if (originalDate < june2025) {
        // Calculate the June 2025 instance date
        let instanceDate = new Date(originalDate);
        const interval = transaction.recurringInterval || 'monthly';
        
        // Fast-forward to June 2025
        while (instanceDate < june2025) {
          switch (interval) {
            case 'monthly':
              instanceDate = new Date(instanceDate.getFullYear(), instanceDate.getMonth() + 1, instanceDate.getDate());
              break;
            case 'yearly':
              instanceDate = new Date(instanceDate.getFullYear() + 1, instanceDate.getMonth(), instanceDate.getDate());
              break;
            default:
              instanceDate = new Date(instanceDate.getFullYear(), instanceDate.getMonth() + 1, instanceDate.getDate());
          }
        }
        
        // If it falls in June 2025, include it
        if (instanceDate.getFullYear() === 2025 && instanceDate.getMonth() === 5) {
          const recurringInstance: TransactionWithCategory = {
            ...transaction,
            displayDate: instanceDate,
            isRecurringInstance: true
          };
          juneTransactions.push(recurringInstance);
          console.log(`[JUNE TX] Recurring: ${transaction.title} - ${transaction.amount} PLN (${format(instanceDate, 'yyyy-MM-dd')})`);
        }
      }
    }
  });
  
  console.log(`Found ${juneTransactions.length} total transactions for June 2025`);
  
  // Calculate the correct totals
  let totalIncome = 0;
  let totalActiveExpenses = 0;
  let totalSkippedExpenses = 0;
  
  juneTransactions.forEach(transaction => {
    const isSkipped = isTransactionSkippedForMonth(transaction.id, june2025);
    const amount = Number(transaction.amount);
    
    if (transaction.isExpense) {
      if (isSkipped) {
        totalSkippedExpenses += amount;
        console.log(`[SKIPPED] ${transaction.title}: ${amount} PLN`);
      } else {
        totalActiveExpenses += amount;
        console.log(`[ACTIVE EXPENSE] ${transaction.title}: ${amount} PLN`);
      }
    } else {
      totalIncome += amount;
      console.log(`[INCOME] ${transaction.title}: ${amount} PLN`);
    }
  });
  
  const correctedBalance = totalIncome - totalActiveExpenses;
  
  console.log('\n=== CORRECTED JUNE 2025 CALCULATION ===');
  console.log(`Total Income: ${totalIncome.toFixed(2)} PLN`);
  console.log(`Total Active Expenses: ${totalActiveExpenses.toFixed(2)} PLN`);
  console.log(`Total Skipped Expenses: ${totalSkippedExpenses.toFixed(2)} PLN`);
  console.log(`Corrected Balance: ${correctedBalance.toFixed(2)} PLN`);
  
  // Compare with user's reported balance
  const userReportedBalance = -364.30;
  const difference = correctedBalance - userReportedBalance;
  
  console.log(`User Reported Balance: ${userReportedBalance.toFixed(2)} PLN`);
  console.log(`Difference: ${difference.toFixed(2)} PLN`);
  
  if (Math.abs(difference) < 50) {
    console.log('✅ Budget calculation now matches user report!');
  } else {
    console.log('❌ Still a discrepancy - need to investigate further');
    
    // Look for specific missing transactions
    const expectedTotalExpenses = totalIncome - userReportedBalance;
    const missingExpenses = expectedTotalExpenses - totalActiveExpenses;
    console.log(`Expected total expenses: ${expectedTotalExpenses.toFixed(2)} PLN`);
    console.log(`Missing expenses: ${missingExpenses.toFixed(2)} PLN`);
    
    // Check if there are large one-time expenses missing
    if (missingExpenses > 1000) {
      console.log('🔍 Looking for large missing expenses...');
      // Check for Temu order (462 PLN) which was recently updated
      const temuOrder = juneTransactions.find(t => t.title.toLowerCase().includes('temu'));
      if (temuOrder) {
        console.log(`Found Temu order: ${temuOrder.amount} PLN`);
      }
    }
  }
  
  return {
    totalIncome,
    totalActiveExpenses,
    totalSkippedExpenses,
    correctedBalance,
    difference,
    juneTransactions
  };
}

// Auto-execute the fix
if (typeof window !== 'undefined') {
  (window as any).fixJuneBudget = fixJuneBudget;
  console.log('June budget fix utility loaded.');
}