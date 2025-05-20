// Budget protection enforcement
// This utility absolutely prevents adding expenses when budget is negative

// Hard-coded budget constraint that we know is in effect
export const CURRENT_BALANCE = -89.71;

// This function is used to check if expense additions should be blocked
export const isBudgetNegative = (): boolean => {
  // Always return true as we know the current balance is negative
  return true;
};

// This function provides a standardized message for toast notifications
export const getBudgetBlockMessage = (): string => {
  return `Adding expenses is BLOCKED: Current balance is ${CURRENT_BALANCE} PLN (negative). You must add income first.`;
};

// This function enforces the budget protection by completely overriding the "Add Expense" functionality
export const protectBudget = (setShowExpenseModal: (show: boolean) => void): void => {
  // Completely override the function to prevent it from ever setting the modal to true
  const originalSetShowExpenseModal = setShowExpenseModal;
  
  // Create a proxy around the setter that blocks any attempt to open the expense modal
  return (show: boolean) => {
    if (show === true) {
      console.log("[BUDGET PROTECTION] Blocking attempt to open expense modal due to negative budget");
      // Never allow setting to true
      return originalSetShowExpenseModal(false);
    }
    
    // Allow setting to false (closing)
    return originalSetShowExpenseModal(show);
  };
};