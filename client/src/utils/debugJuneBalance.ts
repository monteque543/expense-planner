import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';
import { format } from 'date-fns';

/**
 * Debug the exact June 2025 balance calculation issue
 */
export function debugJuneBalance(transactions: TransactionWithCategory[]) {
  console.log('=== DEBUGGING JUNE 2025 BALANCE ISSUE ===');
  
  const june2025 = new Date('2025-06-01');
  
  // Get all transactions that appear in June 2025 (both original and recurring instances)
  const juneTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const isJuneTransaction = transactionDate.getFullYear() === 2025 && transactionDate.getMonth() === 5;
    
    // Also check for recurring transactions that would occur in June
    if (t.isRecurring && !isJuneTransaction) {
      // Check if this recurring transaction would have an instance in June 2025
      const originalDate = new Date(t.date);
      if (originalDate <= june2025) {
        // This is a recurring transaction that started before or during June
        return true;
      }
    }
    
    return isJuneTransaction;
  });
  
  let totalIncome = 0;
  let totalActiveExpenses = 0;
  let totalSkippedExpenses = 0;
  let recurringExpenses = 0;
  let oneTimeExpenses = 0;
  
  console.log(`\nAnalyzing ${juneTransactions.length} transactions for June 2025:`);
  
  juneTransactions.forEach(transaction => {
    const amount = Number(transaction.amount);
    const isSkipped = isTransactionSkippedForMonth(transaction.id, june2025);
    const dateStr = format(new Date(transaction.date), 'yyyy-MM-dd');
    
    if (transaction.isExpense) {
      if (isSkipped) {
        totalSkippedExpenses += amount;
        console.log(`[SKIPPED EXPENSE] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN - ${dateStr} - ${transaction.isRecurring ? 'RECURRING' : 'ONE-TIME'}`);
      } else {
        totalActiveExpenses += amount;
        if (transaction.isRecurring) {
          recurringExpenses += amount;
        } else {
          oneTimeExpenses += amount;
        }
        console.log(`[ACTIVE EXPENSE] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN - ${dateStr} - ${transaction.isRecurring ? 'RECURRING' : 'ONE-TIME'} - ${transaction.isPaid ? 'PAID' : 'UNPAID'}`);
      }
    } else {
      totalIncome += amount;
      console.log(`[INCOME] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN - ${dateStr} - ${transaction.isRecurring ? 'RECURRING' : 'ONE-TIME'}`);
    }
  });
  
  console.log('\n=== JUNE 2025 FINANCIAL SUMMARY ===');
  console.log(`Total Income: ${totalIncome.toFixed(2)} PLN`);
  console.log(`Total Active Expenses: ${totalActiveExpenses.toFixed(2)} PLN`);
  console.log(`  - Recurring Expenses: ${recurringExpenses.toFixed(2)} PLN`);
  console.log(`  - One-time Expenses: ${oneTimeExpenses.toFixed(2)} PLN`);
  console.log(`Total Skipped Expenses: ${totalSkippedExpenses.toFixed(2)} PLN`);
  console.log(`Net Balance (Income - Active): ${(totalIncome - totalActiveExpenses).toFixed(2)} PLN`);
  console.log(`If skipped were included: ${(totalIncome - totalActiveExpenses - totalSkippedExpenses).toFixed(2)} PLN`);
  
  // Check localStorage skip entries
  console.log('\n=== LOCALSTORAGE SKIP ENTRIES ===');
  const allSkipKeys = Object.keys(localStorage).filter(key => key.includes('skipped_transaction_'));
  const juneSkipKeys = allSkipKeys.filter(key => key.includes('2025-06'));
  
  console.log(`Total skip entries in localStorage: ${allSkipKeys.length}`);
  console.log(`June 2025 skip entries: ${juneSkipKeys.length}`);
  
  juneSkipKeys.forEach(key => {
    const value = localStorage.getItem(key);
    const transactionId = key.match(/skipped_transaction_(\d+)_/)?.[1];
    const transaction = transactions.find(t => t.id === Number(transactionId));
    console.log(`- ${key}: ${value} (${transaction?.title || 'Unknown'} - ${transaction?.amount || 'Unknown'} PLN)`);
  });
  
  // Calculate expected balance based on user report of -364.30 PLN
  const expectedBalance = -364.30;
  const actualBalance = totalIncome - totalActiveExpenses;
  const difference = actualBalance - expectedBalance;
  
  console.log('\n=== BALANCE ANALYSIS ===');
  console.log(`Expected balance (user report): ${expectedBalance.toFixed(2)} PLN`);
  console.log(`Calculated balance: ${actualBalance.toFixed(2)} PLN`);
  console.log(`Difference: ${difference.toFixed(2)} PLN`);
  
  if (Math.abs(difference) > 1) {
    console.log(`❌ Significant difference detected! Need to investigate further.`);
    
    // Check if there are hidden transactions or calculation errors
    const possibleMissingExpenses = Math.abs(difference);
    console.log(`Possible missing expenses: ${possibleMissingExpenses.toFixed(2)} PLN`);
  } else {
    console.log(`✅ Balance calculation appears correct.`);
  }
  
  return {
    totalIncome,
    totalActiveExpenses,
    totalSkippedExpenses,
    calculatedBalance: totalIncome - totalActiveExpenses,
    expectedBalance,
    difference
  };
}

// Auto-execute on load
if (typeof window !== 'undefined') {
  (window as any).debugJuneBalance = debugJuneBalance;
  console.log('June balance debug utility loaded.');
}