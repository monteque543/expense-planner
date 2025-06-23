/**
 * Quick manual check of June 2025 transactions to resolve -364.30 PLN balance issue
 */
export function quickJuneCheck() {
  console.log('=== QUICK JUNE 2025 BALANCE CHECK ===');
  
  // Check localStorage for skipped transactions
  const skipKeys = Object.keys(localStorage).filter(key => 
    key.includes('skipped_transaction_') && key.includes('2025-06')
  );
  
  console.log(`Found ${skipKeys.length} skip entries for June 2025:`);
  let totalSkippedAmount = 0;
  
  skipKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`- ${key}: ${value}`);
    
    // Extract transaction ID and try to identify amount
    const transactionId = key.match(/skipped_transaction_(\d+)_/)?.[1];
    
    // Known amounts from previous logs
    const knownAmounts: { [key: string]: number } = {
      '139': 47,     // Fryzjer
      '140': 72.47,  // Orange
      '142': 67.90,  // webflow  
      '122': 76.77,  // Replit
      '118': 99      // Chatgpt
    };
    
    if (transactionId && knownAmounts[transactionId]) {
      totalSkippedAmount += knownAmounts[transactionId];
      console.log(`  -> ${transactionId}: ${knownAmounts[transactionId]} PLN`);
    }
  });
  
  console.log(`Total skipped amount: ${totalSkippedAmount.toFixed(2)} PLN`);
  
  // Based on console logs, we know:
  // Monthly Income: 5019.90 PLN
  // All monthly expenses: 4284.20 PLN (this might be wrong)
  // Current available budget: 1852.67 PLN (this is clearly wrong if user sees -364.30)
  
  const reportedIncome = 5019.90;
  const reportedExpenses = 4284.20;
  const calculatedBalance = reportedIncome - reportedExpenses;
  const userReportedBalance = -364.30;
  const discrepancy = calculatedBalance - userReportedBalance;
  
  console.log('\n=== BALANCE ANALYSIS ===');
  console.log(`Reported Income: ${reportedIncome.toFixed(2)} PLN`);
  console.log(`Reported Expenses: ${reportedExpenses.toFixed(2)} PLN`);
  console.log(`Calculated Balance: ${calculatedBalance.toFixed(2)} PLN`);
  console.log(`User Reported Balance: ${userReportedBalance.toFixed(2)} PLN`);
  console.log(`Discrepancy: ${discrepancy.toFixed(2)} PLN`);
  
  // The discrepancy is massive (2217.27 PLN), suggesting:
  // 1. Missing expenses not being counted
  // 2. Incorrect income calculation
  // 3. Skip logic not working properly
  
  if (Math.abs(discrepancy) > 1000) {
    console.log('🚨 MAJOR DISCREPANCY DETECTED');
    console.log('Possible causes:');
    console.log('1. Large expenses missing from calculation');
    console.log('2. Income being double-counted');
    console.log('3. Recurring transactions not properly handled');
    console.log('4. Skip logic applied incorrectly');
    
    // Check if the issue is that skipped transactions are being re-added
    if (totalSkippedAmount > 0) {
      const balanceWithSkips = calculatedBalance - totalSkippedAmount;
      console.log(`Balance if skips were wrongly included: ${balanceWithSkips.toFixed(2)} PLN`);
      
      if (Math.abs(balanceWithSkips - userReportedBalance) < 100) {
        console.log('✅ Found the issue! Skipped transactions are being incorrectly counted as expenses');
      }
    }
  }
  
  return {
    skipKeys,
    totalSkippedAmount,
    discrepancy,
    analysis: 'Major balance calculation error detected'
  };
}

// Execute immediately
if (typeof window !== 'undefined') {
  setTimeout(quickJuneCheck, 100);
}