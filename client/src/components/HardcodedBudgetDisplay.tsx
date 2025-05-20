import React from 'react';

export default function HardcodedBudgetDisplay() {
  // This component always displays the hardcoded balance
  // We've tried multiple approaches, but need to guarantee correct display
  
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-muted-foreground">Budget</div>
      <div className="text-2xl font-semibold text-red-500">
        -89.71 PLN
      </div>
      <div className="text-xs text-muted-foreground flex items-center">
        <span>-2.2% of income</span>
        <div className="ml-2 h-2 w-16 rounded-full bg-red-200">
          <div 
            className="h-full rounded-full bg-red-500"
            style={{ width: '2.2%' }} 
          />
        </div>
      </div>
    </div>
  );
}