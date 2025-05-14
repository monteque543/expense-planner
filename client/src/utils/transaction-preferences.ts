// This file stores user preferences for specific transactions
import { format } from 'date-fns';

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
  // Format date to YYYY-MM-DD
  let dateStr: string;
  
  if (date instanceof Date) {
    // Use format from date-fns for consistent formatting
    dateStr = format(date, 'yyyy-MM-dd');
  } else if (typeof date === 'string') {
    // Handle different string formats to ensure we get YYYY-MM-DD
    if (date.includes('T')) {
      // Handle ISO format with time
      dateStr = date.split('T')[0];
    } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Already in YYYY-MM-DD format
      dateStr = date;
    } else {
      // Try to parse the date
      try {
        // Use format from date-fns for consistent formatting
        dateStr = format(new Date(date), 'yyyy-MM-dd');
      } catch (e) {
        console.error(`[Key Generate] Invalid date string: ${date}`, e);
        dateStr = format(new Date(), 'yyyy-MM-dd');
      }
    }
  } else {
    console.warn(`[Key Generate] Unexpected date type: ${typeof date}, using current date`);
    dateStr = format(new Date(), 'yyyy-MM-dd');
  }
  
  const key = `${title}_${dateStr}`;
  console.log(`[Key Generate] Created key: "${key}" for title="${title}", date=${String(date)}`);
  return key;
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
    
    // First attempt: direct key match
    let status = statuses.find(s => s.key === key);
    
    // If not found, try more flexible matching (date might be formatted differently)
    if (!status && typeof date === 'string') {
      // Extract just the title and date part (YYYY-MM-DD) for comparison
      const [titlePart, datePart] = key.split('_');
      
      // Look for any key with same title and date part
      status = statuses.find(s => {
        const [storedTitle, storedDate] = s.key.split('_');
        // Check if title matches and date contains the same date part
        // This handles cases where one has time component and other doesn't
        return storedTitle === titlePart && storedDate.includes(datePart);
      });
      
      if (status) {
        console.log(`[Lookup Debug] Found status via flexible matching for "${key}": ${status.isPaid}`);
      }
    }
    
    if (status) {
      console.log(`[Lookup Debug] Found status for "${key}": ${status.isPaid}`);
      return status.isPaid;
    }
    
    console.log(`[Lookup Debug] No status found for "${key}" after all matching attempts`);
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
    
    // First attempt: direct key match
    let existingIndex = statuses.findIndex(s => s.key === key);
    
    // If not found, try more flexible matching (date might be formatted differently)
    if (existingIndex < 0 && typeof date === 'string') {
      // Extract just the title and date part (YYYY-MM-DD) for comparison
      const [titlePart, datePart] = key.split('_');
      
      // Look for any key with same title and date part
      existingIndex = statuses.findIndex(s => {
        const [storedTitle, storedDate] = s.key.split('_');
        // Check if title matches and date contains the same date part
        return storedTitle === titlePart && storedDate.includes(datePart);
      });
      
      if (existingIndex >= 0) {
        console.log(`[Storage Debug] Found existing entry via flexible matching at index ${existingIndex}`);
      }
    }
    
    if (existingIndex >= 0) {
      // Update existing status
      statuses[existingIndex] = {
        key, // Always use the consistent, newly generated key
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
    
    // Clear out any duplicate entries for the same transaction/date
    // This should run after the save to clean up any lingering duplicates
    const cleanedStatuses = cleanupDuplicateStatuses();
    console.log(`[Storage Cleanup] After deduplication: ${cleanedStatuses.length} entries`);
    
  } catch (error) {
    console.error('Error saving paid status for occurrence:', error);
  }
}

/**
 * Clean up duplicate status entries for the same transaction/date
 * This is needed because there might be different key formats for the same transaction
 */
function cleanupDuplicateStatuses(): RecurringTransactionPaidStatus[] {
  try {
    const statuses = getRecurringTransactionPaidStatuses();
    
    // Group entries by their core parts (title_YYYY-MM-DD)
    const groupedEntries = new Map<string, RecurringTransactionPaidStatus[]>();
    
    statuses.forEach(status => {
      // Extract the parts of the key
      const parts = status.key.split('_');
      const title = parts[0];
      
      // Extract just the date part (YYYY-MM-DD) from the second part
      let datePart = parts[1];
      if (datePart.includes('T')) {
        datePart = datePart.split('T')[0];
      } else if (datePart.match(/^\d{4}-\d{2}-\d{2}/)) {
        datePart = datePart.match(/^\d{4}-\d{2}-\d{2}/)![0];
      }
      
      // Create a normalized key
      const normalizedKey = `${title}_${datePart}`;
      
      // Add to the appropriate group
      if (!groupedEntries.has(normalizedKey)) {
        groupedEntries.set(normalizedKey, []);
      }
      groupedEntries.get(normalizedKey)!.push(status);
    });
    
    // For each group, keep only the most recently updated entry
    const dedupedStatuses: RecurringTransactionPaidStatus[] = [];
    
    groupedEntries.forEach(group => {
      // Sort by lastUpdated in descending order and take the first one
      const sortedGroup = [...group].sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      
      dedupedStatuses.push(sortedGroup[0]);
    });
    
    // Save back to localStorage
    localStorage.setItem(PAID_STATUS_KEY, JSON.stringify(dedupedStatuses));
    console.log(`[Cleanup] Deduplicated statuses from ${statuses.length} to ${dedupedStatuses.length} entries`);
    
    return dedupedStatuses;
  } catch (error) {
    console.error('Error cleaning up status entries:', error);
    return getRecurringTransactionPaidStatuses();
  }
}

// Call this when the module is imported to set up default preferences
initializeDefaultPreferences();