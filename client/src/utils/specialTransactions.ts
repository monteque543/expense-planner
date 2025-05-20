/**
 * Special handling for problematic transactions like webflow
 */

// Special transaction IDs that need extra handling
export const SPECIAL_TRANSACTION_IDS = [7]; // 7 = webflow

/**
 * Check if a transaction needs special handling
 */
export function isSpecialTransaction(transactionId: number): boolean {
  return SPECIAL_TRANSACTION_IDS.includes(transactionId);
}

/**
 * Special handling for the webflow transaction when marking it as paid
 * This addresses the issue where the webflow transaction keeps resetting its paid status
 */
export function updateWebflowPaidStatus(transactionId: number, isPaid: boolean): void {
  // Only run this for webflow transaction
  if (transactionId !== 7) return;
  
  try {
    // Special treatment for webflow transaction - store in a dedicated key
    localStorage.setItem('webflow_transaction_paid_status', isPaid ? 'true' : 'false');
    console.log(`[SPECIAL] Webflow transaction (ID: 7) paid status set to ${isPaid}`);
  } catch (err) {
    console.error('Error setting webflow paid status:', err);
  }
}

/**
 * Get webflow paid status
 */
export function getWebflowPaidStatus(): boolean {
  try {
    return localStorage.getItem('webflow_transaction_paid_status') === 'true';
  } catch (err) {
    console.error('Error getting webflow paid status:', err);
    return false;
  }
}