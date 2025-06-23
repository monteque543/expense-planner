import { TransactionWithCategory } from '@shared/schema';
import { isTransactionSkippedForMonth } from './skipMonthUtils';
import { format } from 'date-fns';

/**
 * Comprehensive verification of June 2025 transactions and skip status
 */
export function verifyJuneTransactions(transactions: TransactionWithCategory[]) {
  console.log('=== JUNE 2025 TRANSACTION VERIFICATION ===');
  
  const june2025 = new Date('2025-06-01');
  const juneTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getFullYear() === 2025 && transactionDate.getMonth() === 5; // June is month 5
  });
  
  console.log(`Found ${juneTransactions.length} transactions in June 2025:`);
  
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSkipped = 0;
  let activeExpenses = 0;
  
  const incomeTransactions: any[] = [];
  const expenseTransactions: any[] = [];
  const skippedTransactions: any[] = [];
  
  juneTransactions.forEach(transaction => {
    const isSkipped = isTransactionSkippedForMonth(transaction.id, june2025);
    const amount = Number(transaction.amount);
    
    const transactionInfo = {
      id: transaction.id,
      title: transaction.title,
      amount: amount,
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      isExpense: transaction.isExpense,
      isPaid: transaction.isPaid,
      isRecurring: transaction.isRecurring,
      isSkipped: isSkipped
    };
    
    if (transaction.isExpense) {
      expenseTransactions.push(transactionInfo);
      if (isSkipped) {
        skippedTransactions.push(transactionInfo);
        totalSkipped += amount;
        console.log(`[SKIPPED] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN`);
      } else {
        totalExpenses += amount;
        activeExpenses += amount;
        console.log(`[ACTIVE EXPENSE] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN`);
      }
    } else {
      incomeTransactions.push(transactionInfo);
      totalIncome += amount;
      console.log(`[INCOME] ${transaction.title} (ID: ${transaction.id}) - ${amount} PLN`);
    }
  });
  
  console.log('\n=== JUNE 2025 SUMMARY ===');
  console.log(`Total Income: ${totalIncome.toFixed(2)} PLN`);
  console.log(`Total Active Expenses: ${activeExpenses.toFixed(2)} PLN`);
  console.log(`Total Skipped Expenses: ${totalSkipped.toFixed(2)} PLN`);
  console.log(`Net Balance (Income - Active Expenses): ${(totalIncome - activeExpenses).toFixed(2)} PLN`);
  console.log(`If we included skipped: ${(totalIncome - activeExpenses - totalSkipped).toFixed(2)} PLN`);
  
  console.log('\n=== INCOME BREAKDOWN ===');
  incomeTransactions.forEach(t => {
    console.log(`- ${t.title}: ${t.amount} PLN (${t.date})`);
  });
  
  console.log('\n=== ACTIVE EXPENSES BREAKDOWN ===');
  expenseTransactions.filter(t => !t.isSkipped).forEach(t => {
    console.log(`- ${t.title}: ${t.amount} PLN (${t.date}) [${t.isPaid ? 'PAID' : 'UNPAID'}]`);
  });
  
  console.log('\n=== SKIPPED EXPENSES BREAKDOWN ===');
  skippedTransactions.forEach(t => {
    console.log(`- ${t.title}: ${t.amount} PLN (${t.date}) [SKIPPED]`);
  });
  
  // Check localStorage for all skip entries
  console.log('\n=== LOCALSTORAGE SKIP VERIFICATION ===');
  const skipKeys = Object.keys(localStorage).filter(key => key.includes('skipped_transaction_') && key.includes('2025-06'));
  console.log(`Found ${skipKeys.length} skip entries in localStorage:`);
  skipKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`- ${key}: ${value}`);
  });
  
  return {
    totalIncome,
    activeExpenses,
    totalSkipped,
    netBalance: totalIncome - activeExpenses,
    incomeTransactions,
    expenseTransactions: expenseTransactions.filter(t => !t.isSkipped),
    skippedTransactions
  };
}

// Auto-execute verification
if (typeof window !== 'undefined') {
  // Export function to global scope for manual execution
  (window as any).verifyJuneTransactions = verifyJuneTransactions;
  console.log('June transaction verification utility loaded. Call verifyJuneTransactions(transactions) to run.');
}