import { queryClient } from '@/lib/queryClient';

/**
 * Clear all incorrect skips and only apply the single 47 PLN transaction skip
 * User only skipped one transaction worth 47 PLN, not 322.30 PLN worth
 */
export function clearIncorrectSkips() {
  console.log('=== CLEARING INCORRECT SKIPS ===');
  
  // Clear all June 2025 skips first
  const june2025Key = '2025-06';
  
  // List of transaction IDs that were incorrectly skipped
  const incorrectSkips = [140, 142, 122, 118]; // Orange, webflow, Replit, Chatgpt
  const correctSkip = 139; // Fryzjer - 47 PLN (the only one user actually skipped)
  
  console.log('Clearing incorrect skips...');
  
  // Clear the incorrect skips
  incorrectSkips.forEach(transactionId => {
    const key = `skipped_transaction_${transactionId}_${june2025Key}`;
    localStorage.removeItem(key);
    console.log(`✓ Cleared incorrect skip: Transaction ${transactionId}`);
  });
  
  // Ensure the correct skip is applied
  const correctSkipKey = `skipped_transaction_${correctSkip}_${june2025Key}`;
  localStorage.setItem(correctSkipKey, 'true');
  console.log(`✓ Confirmed correct skip: Transaction ${correctSkip} (Fryzjer - 47 PLN)`);
  
  // Invalidate cache to trigger recalculation
  queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  console.log('✓ Cache invalidated - budget will recalculate');
  
  console.log('=== SKIP CORRECTION COMPLETE ===');
  console.log('Expected result: Budget should show only -47 PLN skipped, not -322.30 PLN');
  
  return { clearedSkips: incorrectSkips, confirmedSkip: correctSkip };
}

// Auto-execute the correction
if (typeof window !== 'undefined') {
  setTimeout(clearIncorrectSkips, 500);
}