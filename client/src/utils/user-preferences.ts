/**
 * User Preferences utility
 * 
 * This file provides functions for storing and retrieving user preferences
 * such as customized transaction amounts, deleted transactions, etc.
 */

import { type Transaction } from "@shared/schema";

// Keys for localStorage
const EDITED_TRANSACTIONS_KEY = 'expensePlanner_editedTransactions';
const DELETED_TRANSACTIONS_KEY = 'expensePlanner_deletedTransactions';

// Interface for storing edited transaction data
interface EditedTransaction {
  id: number;
  title: string;
  amount: number;
  personLabel: string;
  isExpense: boolean;
  date?: string | null; // Store as ISO string or null
  lastEdited: number; // timestamp
}

/**
 * Get all edited transactions from localStorage
 */
export function getEditedTransactions(): Record<number, EditedTransaction> {
  try {
    const storedData = localStorage.getItem(EDITED_TRANSACTIONS_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error('Error retrieving edited transactions:', error);
  }
  return {};
}

/**
 * Save an edited transaction to localStorage
 */
export function saveEditedTransaction(transaction: Transaction): void {
  try {
    const editedTransactions = getEditedTransactions();
    
    // Store only the essential data we need to remember
    editedTransactions[transaction.id] = {
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      personLabel: transaction.personLabel || 'Michał', // Default value to avoid type errors
      isExpense: transaction.isExpense,
      date: transaction.date instanceof Date ? 
        transaction.date.toISOString() : 
        (typeof transaction.date === 'string' ? transaction.date : null),
      lastEdited: Date.now()
    };
    
    localStorage.setItem(
      EDITED_TRANSACTIONS_KEY, 
      JSON.stringify(editedTransactions)
    );
    
    console.log(`Saved user edit for transaction #${transaction.id}: ${transaction.title} amount: ${transaction.amount}`);
  } catch (error) {
    console.error('Error saving edited transaction:', error);
  }
}

/**
 * Check if a transaction has been edited by the user
 */
export function hasUserEditForTransaction(transactionId: number): boolean {
  const editedTransactions = getEditedTransactions();
  return !!editedTransactions[transactionId];
}

/**
 * Apply user edits to a transaction if they exist
 */
export function applyUserEditsIfExists<T extends Transaction>(transaction: T): T {
  const editedTransactions = getEditedTransactions();
  
  if (editedTransactions[transaction.id]) {
    const userEdit = editedTransactions[transaction.id];
    
    // Create a new object with user's edited values
    return {
      ...transaction,
      amount: userEdit.amount,
      title: userEdit.title,
      personLabel: userEdit.personLabel,
    };
  }
  
  return transaction;
}

/**
 * Apply user edits to an array of transactions
 */
export function applyUserEditsToTransactions<T extends Transaction>(transactions: T[]): T[] {
  return transactions.map(transaction => applyUserEditsIfExists(transaction));
}

/**
 * Get the list of deleted transaction IDs
 */
export function getDeletedTransactionIds(): number[] {
  try {
    const storedData = localStorage.getItem(DELETED_TRANSACTIONS_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error('Error retrieving deleted transactions:', error);
  }
  return [];
}

/**
 * Mark a transaction as deleted
 */
export function markTransactionAsDeleted(transactionId: number): void {
  try {
    const deletedIds = getDeletedTransactionIds();
    if (!deletedIds.includes(transactionId)) {
      deletedIds.push(transactionId);
      localStorage.setItem(DELETED_TRANSACTIONS_KEY, JSON.stringify(deletedIds));
      console.log(`Marked transaction #${transactionId} as deleted`);
    }
  } catch (error) {
    console.error('Error marking transaction as deleted:', error);
  }
}

/**
 * Check if a transaction has been deleted by the user
 */
export function isTransactionDeleted(transactionId: number): boolean {
  const deletedIds = getDeletedTransactionIds();
  return deletedIds.includes(transactionId);
}

/**
 * Filter out deleted transactions from an array
 */
export function filterDeletedTransactions<T extends Transaction>(transactions: T[]): T[] {
  const deletedIds = getDeletedTransactionIds();
  return transactions.filter(transaction => !deletedIds.includes(transaction.id));
}