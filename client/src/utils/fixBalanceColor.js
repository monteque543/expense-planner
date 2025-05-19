/**
 * This is a utility file to help fix the positive balance showing as green
 * and the recurring transaction mark as paid functionality.
 */

// Function to apply correct color to remaining budget display
export function getBalanceColorClass(amount) {
  return amount >= 0 ? 'text-green-500' : 'text-red-500';
}

// Special function to mark recurring transactions as paid for specific months
export function markRecurringTransactionAsPaid(transaction, date, isPaid) {
  if (!transaction || !transaction.id || !date) {
    console.error('Invalid transaction or date for marking as paid');
    return false;
  }
  
  try {
    const monthKey = typeof date === 'string' 
      ? new Date(date).toISOString().substring(0, 7) // YYYY-MM format
      : date.toISOString().substring(0, 7);
      
    const storageKey = `paid_recurring_${transaction.id}_${monthKey}`;
    
    // Store in localStorage
    localStorage.setItem(storageKey, isPaid ? 'true' : 'false');
    
    console.log(`Successfully marked recurring transaction ${transaction.id} as ${isPaid ? 'PAID' : 'UNPAID'} for ${monthKey}`);
    return true;
  } catch (error) {
    console.error('Error marking recurring transaction as paid:', error);
    return false;
  }
}

// Get paid status for a recurring transaction in a specific month
export function getRecurringTransactionPaidStatus(transactionId, date) {
  if (!transactionId || !date) return false;
  
  try {
    const monthKey = typeof date === 'string' 
      ? new Date(date).toISOString().substring(0, 7) 
      : date.toISOString().substring(0, 7);
      
    const storageKey = `paid_recurring_${transactionId}_${monthKey}`;
    return localStorage.getItem(storageKey) === 'true';
  } catch (error) {
    console.error('Error getting recurring transaction paid status:', error);
    return false;
  }
}