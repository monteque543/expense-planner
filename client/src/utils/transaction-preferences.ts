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

const AMOUNT_PREFERENCES_KEY = 'transaction-amount-preferences';

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

// Call this when the module is imported to set up default preferences
initializeDefaultPreferences();