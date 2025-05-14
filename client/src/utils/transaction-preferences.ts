// This file stores user preferences for specific transactions

/**
 * Store a mapping of transaction titles to their preferred amounts
 * This allows us to override specific transaction amounts without hard-coding them in backend
 */
export interface TransactionAmountPreference {
  transactionTitle: string;
  preferredAmount: number;
  lastUpdated: string; // ISO date string
}

/**
 * Store paid status for specific occurrences of recurring transactions
 * The key is a combination of transaction title and date (YYYY-MM-DD)
 * This allows marking individual occurrences as paid without affecting the base recurring transaction
 */
export interface RecurringTransactionPaidStatus {
  key: string; // Format: "title_YYYY-MM-DD"
  isPaid: boolean;
  lastUpdated: string; // ISO date string
}

const AMOUNT_PREFERENCES_KEY = 'transaction-amount-preferences';
const PAID_STATUS_KEY = 'recurring-transaction-paid-status';

/**
 * Save a preferred amount for a specific transaction title
 */
export function saveTransactionAmountPreference(transactionTitle: string, amount: number): void {
  // Get current preferences
  const currentPreferences = getTransactionAmountPreferences();
  
  // Find if we already have a preference for this transaction
  const existingIndex = currentPreferences.findIndex(p => p.transactionTitle === transactionTitle);
  
  if (existingIndex >= 0) {
    // Update existing preference
    currentPreferences[existingIndex] = {
      transactionTitle,
      preferredAmount: amount,
      lastUpdated: new Date().toISOString()
    };
  } else {
    // Add new preference
    currentPreferences.push({
      transactionTitle,
      preferredAmount: amount,
      lastUpdated: new Date().toISOString()
    });
  }
  
  // Save updated preferences
  localStorage.setItem(AMOUNT_PREFERENCES_KEY, JSON.stringify(currentPreferences));
  console.log(`Saved amount preference for "${transactionTitle}": ${amount} PLN`);
}

/**
 * Get all transaction amount preferences
 */
export function getTransactionAmountPreferences(): TransactionAmountPreference[] {
  const storedPreferences = localStorage.getItem(AMOUNT_PREFERENCES_KEY);
  if (!storedPreferences) return [];
  
  try {
    return JSON.parse(storedPreferences);
  } catch (error) {
    console.error('Error parsing transaction preferences:', error);
    return [];
  }
}

/**
 * Get preferred amount for a specific transaction title if one exists
 */
export function getPreferredAmount(transactionTitle: string): number | null {
  const preferences = getTransactionAmountPreferences();
  const preference = preferences.find(p => p.transactionTitle === transactionTitle);
  
  if (preference) {
    console.log(`Found preferred amount for "${transactionTitle}": ${preference.preferredAmount} PLN`);
    return preference.preferredAmount;
  }
  
  return null;
}

// Initialize with default preferences
export function initializeDefaultPreferences(): void {
  // Only initialize if we don't have preferences yet
  if (getTransactionAmountPreferences().length === 0) {
    // Add default preference for Replit transaction
    saveTransactionAmountPreference('Replit', 76.77);
    console.log('Initialized default transaction preferences');
  }
}

/**
 * Get all recurring transaction paid statuses
 */
export function getRecurringTransactionPaidStatuses(): RecurringTransactionPaidStatus[] {
  try {
    const storedData = localStorage.getItem(PAID_STATUS_KEY);
    return storedData ? JSON.parse(storedData) : [];
  } catch (error) {
    console.error('Error retrieving recurring transaction paid statuses:', error);
    return [];
  }
}

/**
 * Generate a unique key for a recurring transaction occurrence
 */
export function generateOccurrenceKey(title: string, date: Date | string): string {
  // Convert date to string format YYYY-MM-DD if it's a Date object
  const dateStr = date instanceof Date 
    ? date.toISOString().split('T')[0] 
    : (typeof date === 'string' ? date.split('T')[0] : '');
  
  return `${title}_${dateStr}`;
}

/**
 * Get paid status for a specific recurring transaction occurrence
 */
export function getOccurrencePaidStatus(title: string, date: Date | string): boolean | null {
  try {
    const key = generateOccurrenceKey(title, date);
    const statuses = getRecurringTransactionPaidStatuses();
    
    console.log(`[Lookup Debug] Looking up paid status for "${key}"`);
    console.log(`[Lookup Debug] Available status keys:`, statuses.map(s => s.key));
    
    const status = statuses.find(s => s.key === key);
    
    if (status) {
      console.log(`[Lookup Debug] Found status for "${key}": ${status.isPaid}`);
      return status.isPaid;
    }
    
    console.log(`[Lookup Debug] No status found for "${key}"`);
    return null;
  } catch (error) {
    console.error('Error retrieving paid status for occurrence:', error);
    return null;
  }
}

/**
 * Save paid status for a specific recurring transaction occurrence
 */
export function saveOccurrencePaidStatus(title: string, date: Date | string, isPaid: boolean): void {
  try {
    const key = generateOccurrenceKey(title, date);
    const statuses = getRecurringTransactionPaidStatuses();
    
    console.log(`[Storage Debug] Saving paid status for key "${key}", isPaid=${isPaid}`);
    console.log(`[Storage Debug] Current stored statuses:`, statuses);
    
    // Find if we already have a status for this key
    const existingIndex = statuses.findIndex(s => s.key === key);
    
    if (existingIndex >= 0) {
      // Update existing status
      statuses[existingIndex] = {
        key,
        isPaid,
        lastUpdated: new Date().toISOString()
      };
      console.log(`[Storage Debug] Updated existing entry at index ${existingIndex}`);
    } else {
      // Add new status
      statuses.push({
        key,
        isPaid,
        lastUpdated: new Date().toISOString()
      });
      console.log(`[Storage Debug] Added new entry to statuses array`);
    }
    
    // Save to localStorage
    localStorage.setItem(PAID_STATUS_KEY, JSON.stringify(statuses));
    console.log(`[Storage Confirm] Saved paid status for ${title} on ${date}: ${isPaid}`);
    console.log(`[Storage Confirm] Updated status array:`, statuses);
    
    // Verify the data was saved correctly
    const savedData = localStorage.getItem(PAID_STATUS_KEY);
    const parsedData = savedData ? JSON.parse(savedData) : [];
    console.log(`[Storage Verify] Data after save:`, parsedData);
    
  } catch (error) {
    console.error('Error saving paid status for occurrence:', error);
  }
}

// Call this when the module is imported to set up default preferences
initializeDefaultPreferences();