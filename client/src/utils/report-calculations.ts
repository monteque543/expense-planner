import { TransactionWithCategory } from "@shared/schema";
import { startOfMonth, endOfMonth, isSameMonth, addMonths, isWithinInterval } from "date-fns";

/**
 * Calculate the total expenses for the previous month
 */
export function getPreviousMonthTotal(transactions: TransactionWithCategory[], currentDate: Date): number {
  // Calculate previous month date range
  const prevMonth = addMonths(currentDate, -1);
  const prevMonthStart = startOfMonth(prevMonth);
  const prevMonthEnd = endOfMonth(prevMonth);
  
  // Filter transactions to only include expenses from previous month
  return transactions
    .filter(transaction => {
      const transactionDate = typeof transaction.date === 'string'
        ? new Date(transaction.date)
        : transaction.date;
      
      return transaction.isExpense && 
        isWithinInterval(transactionDate, {
          start: prevMonthStart,
          end: prevMonthEnd
        });
    })
    .reduce((total, transaction) => total + (transaction.amount || 0), 0);
}

/**
 * Calculate the total expenses for the current month
 */
export function getCurrentMonthTotal(transactions: TransactionWithCategory[], currentDate: Date): number {
  return transactions
    .filter(transaction => {
      const transactionDate = typeof transaction.date === 'string'
        ? new Date(transaction.date)
        : transaction.date;
      
      return transaction.isExpense && isSameMonth(transactionDate, currentDate);
    })
    .reduce((total, transaction) => total + (transaction.amount || 0), 0);
}