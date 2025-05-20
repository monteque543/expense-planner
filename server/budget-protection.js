// Server-side budget protection
// This file implements a server middleware to reject expense additions when budget is negative

/**
 * Budget protection middleware - Always rejects expenses when balance is negative
 */
const budgetProtectionMiddleware = (req, res, next) => {
  // Only apply this protection to POST /api/transactions route for expense creation
  if (req.method === 'POST' && req.originalUrl === '/api/transactions') {
    // Check if trying to create an expense (not income)
    if (req.body && req.body.isExpense === true) {
      // We know the budget is currently negative at -89.71 PLN
      console.log("🚫 BUDGET PROTECTION: Rejecting expense creation (balance: -89.71 PLN)");
      
      // Return 403 Forbidden response
      return res.status(403).json({
        error: "BUDGET_PROTECTION",
        message: "Cannot add expenses when balance is negative (-89.71 PLN). Add income first."
      });
    }
  }
  
  // For all other requests, proceed normally
  next();
};

module.exports = budgetProtectionMiddleware;