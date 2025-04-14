import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCog, Lightbulb, Sparkles, TrendingUp, Heart, DollarSign, Target } from 'lucide-react';
import { TransactionWithCategory } from "@shared/schema";

// Types of advice we can provide
enum AdviceType {
  SPENDING_PATTERN = 'spending_pattern',
  SAVINGS_OPPORTUNITY = 'savings_opportunity',
  BUDGET_INSIGHT = 'budget_insight',
  SUBSCRIPTION_TIP = 'subscription_tip',
  SPENDING_CATEGORY = 'spending_category',
  FINANCIAL_GOAL = 'financial_goal',
}

// Interface for generated advice
interface FinancialAdvice {
  type: AdviceType;
  title: string;
  message: string;
  actionable?: string;
  icon: React.ReactNode;
  color: string;
}

interface BudgetCoachingCompanionProps {
  transactions: TransactionWithCategory[];
  currentDate?: Date;
  isLoading: boolean;
}

export default function BudgetCoachingCompanion({ 
  transactions, 
  currentDate,
  isLoading 
}: BudgetCoachingCompanionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAdvice, setActiveAdvice] = useState<FinancialAdvice | null>(null);
  const [allAdvice, setAllAdvice] = useState<FinancialAdvice[]>([]);

  // Generate personalized advice based on transaction data
  useEffect(() => {
    if (transactions.length === 0 || isLoading) return;
    
    const advice = generateFinancialAdvice(transactions, currentDate);
    setAllAdvice(advice);
    
    // Set an initial random piece of advice if none is active
    if (!activeAdvice && advice.length > 0) {
      const randomIndex = Math.floor(Math.random() * advice.length);
      setActiveAdvice(advice[randomIndex]);
    }
  }, [transactions, currentDate, isLoading]);

  // Function to get a new random piece of advice
  const getNewAdvice = () => {
    if (allAdvice.length <= 1) return;
    
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * allAdvice.length);
    } while (allAdvice[newIndex] === activeAdvice);
    
    setActiveAdvice(allAdvice[newIndex]);
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse bg-card/80">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {isOpen ? (
        <Card className="border-2 border-primary/20 shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BrainCog className="h-5 w-5 text-primary" />
                  Budget Coaching Companion
                </CardTitle>
                <CardDescription>Personalized financial insights for you</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-8 -mt-1 -mr-2"
              >
                Minimize
              </Button>
            </div>
          </CardHeader>
          
          {activeAdvice && (
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${activeAdvice.color} text-white shrink-0`}>
                    {activeAdvice.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">{activeAdvice.title}</h3>
                    <p className="text-sm text-muted-foreground">{activeAdvice.message}</p>
                    {activeAdvice.actionable && (
                      <Badge variant="outline" className="mt-2 bg-primary/10 border-primary/20">
                        Tip: {activeAdvice.actionable}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
          
          <CardFooter className="flex justify-between pt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={getNewAdvice}
              disabled={allAdvice.length <= 1}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              New insight
            </Button>
            <Badge variant="outline" className="bg-primary/5">
              {allAdvice.length} insights available
            </Badge>
          </CardFooter>
        </Card>
      ) : (
        <Button 
          variant="outline" 
          className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
          onClick={() => setIsOpen(true)}
        >
          <BrainCog className="h-4 w-4 mr-2" />
          Budget Coaching Companion
        </Button>
      )}
    </div>
  );
}

// Helper function to generate personalized financial advice
function generateFinancialAdvice(
  transactions: TransactionWithCategory[], 
  currentDate?: Date
): FinancialAdvice[] {
  const advice: FinancialAdvice[] = [];
  
  if (transactions.length === 0) {
    return [
      {
        type: AdviceType.FINANCIAL_GOAL,
        title: "Welcome to your financial journey!",
        message: "Start by adding your expenses and income to receive personalized financial insights.",
        actionable: "Add your first transaction to get started",
        icon: <Sparkles className="h-4 w-4" />,
        color: "bg-blue-500",
      }
    ];
  }
  
  // Get transactions from the current month
  const now = currentDate || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  // Calculate total income and expenses for this month
  const monthlyIncome = thisMonthTransactions
    .filter(t => !t.isExpense)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthlyExpenses = thisMonthTransactions
    .filter(t => t.isExpense)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome * 100 : 0;
  
  // Find recurring expenses (subscriptions)
  const subscriptions = transactions.filter(t => 
    t.isExpense && t.isRecurring && t.category?.name === 'Subscription'
  );
  
  const totalSubscriptionCost = subscriptions.reduce((sum, t) => sum + t.amount, 0);
  
  // Categorize spending by category
  const spendingByCategory = new Map<string, number>();
  
  thisMonthTransactions
    .filter(t => t.isExpense && t.category)
    .forEach(t => {
      const category = t.category?.name || 'Other';
      const current = spendingByCategory.get(category) || 0;
      spendingByCategory.set(category, current + t.amount);
    });
  
  // Find the top spending category
  let topCategory = '';
  let topAmount = 0;
  
  spendingByCategory.forEach((amount, category) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = category;
    }
  });
  
  // Add savings rate advice
  if (monthlyIncome > 0) {
    let savingsAdvice: FinancialAdvice;
    
    if (savingsRate >= 20) {
      savingsAdvice = {
        type: AdviceType.SAVINGS_OPPORTUNITY,
        title: "Great savings rate!",
        message: `You're saving ${savingsRate.toFixed(1)}% of your income this month. Financial experts recommend saving 15-20% of income, and you're above that target!`,
        actionable: "Consider investing some of your savings for long-term growth",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "bg-green-500",
      };
    } else if (savingsRate >= 10) {
      savingsAdvice = {
        type: AdviceType.SAVINGS_OPPORTUNITY,
        title: "Good savings progress",
        message: `You're saving ${savingsRate.toFixed(1)}% of your income this month, which is a solid foundation.`,
        actionable: "Try to increase to 15-20% for optimal financial health",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "bg-emerald-500",
      };
    } else if (savingsRate > 0) {
      savingsAdvice = {
        type: AdviceType.SAVINGS_OPPORTUNITY,
        title: "Room for saving improvement",
        message: `You're currently saving ${savingsRate.toFixed(1)}% of your income this month.`,
        actionable: "Review your expenses to find savings opportunities",
        icon: <Lightbulb className="h-4 w-4" />,
        color: "bg-amber-500",
      };
    } else {
      savingsAdvice = {
        type: AdviceType.BUDGET_INSIGHT,
        title: "Spending exceeds income",
        message: "Your expenses are currently higher than your income this month.",
        actionable: "Identify non-essential expenses you could reduce",
        icon: <Lightbulb className="h-4 w-4" />,
        color: "bg-red-500",
      };
    }
    
    advice.push(savingsAdvice);
  }
  
  // Add subscription advice if relevant
  if (subscriptions.length > 0) {
    advice.push({
      type: AdviceType.SUBSCRIPTION_TIP,
      title: "Subscription overview",
      message: `You have ${subscriptions.length} active subscriptions costing PLN ${totalSubscriptionCost.toFixed(2)} per month.`,
      actionable: "Review if you're actively using all subscriptions",
      icon: <DollarSign className="h-4 w-4" />,
      color: "bg-violet-500",
    });
  }
  
  // Add category spending insight if we have data
  if (topCategory) {
    const categoryPercentage = (topAmount / monthlyExpenses) * 100;
    
    advice.push({
      type: AdviceType.SPENDING_CATEGORY,
      title: `Top spending category: ${topCategory}`,
      message: `You've spent PLN ${topAmount.toFixed(2)} (${categoryPercentage.toFixed(1)}% of expenses) on ${topCategory} this month.`,
      actionable: categoryPercentage > 40 ? "This category dominates your budget - look for savings here" : undefined,
      icon: <Target className="h-4 w-4" />,
      color: "bg-blue-500",
    });
  }
  
  // Add financial health score
  const healthScore = calculateFinancialHealthScore(monthlyIncome, monthlyExpenses, savingsRate, transactions);
  
  advice.push({
    type: AdviceType.FINANCIAL_GOAL,
    title: `Financial health score: ${healthScore}/100`,
    message: getHealthScoreMessage(healthScore),
    actionable: getHealthScoreActionable(healthScore),
    icon: <Heart className="h-4 w-4" />,
    color: getHealthScoreColor(healthScore),
  });
  
  return advice;
}

function calculateFinancialHealthScore(
  income: number, 
  expenses: number, 
  savingsRate: number,
  transactions: TransactionWithCategory[]
): number {
  if (income === 0) return 50; // Not enough data
  
  // Calculate score components (maximum 100 points)
  let score = 50; // Start at neutral
  
  // Savings rate component (up to 40 points)
  if (savingsRate >= 20) {
    score += 40;
  } else if (savingsRate > 0) {
    score += (savingsRate / 20) * 40;
  } else {
    score -= 10; // Penalty for negative savings
  }
  
  // Diversification component (up to 20 points)
  const categories = new Set(transactions.map(t => t.category?.name).filter(Boolean));
  const diversificationScore = Math.min(categories.size * 4, 20);
  score += diversificationScore;
  
  // Balance component (up to 40 points)
  const balanceRatio = expenses / income;
  if (balanceRatio <= 0.7) {
    score += 30; // Excellent balance
  } else if (balanceRatio <= 0.85) {
    score += 20; // Good balance
  } else if (balanceRatio <= 1) {
    score += 10; // Acceptable balance
  } else {
    score -= 20; // Spending more than earning
  }
  
  // Cap at 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthScoreMessage(score: number): string {
  if (score >= 80) {
    return "Excellent! You're maintaining a strong financial position with good saving habits.";
  } else if (score >= 60) {
    return "Good financial health. You're on the right track with room for improvement.";
  } else if (score >= 40) {
    return "Your financial situation is stable but could benefit from some adjustments.";
  } else {
    return "There are several opportunities to improve your financial health.";
  }
}

function getHealthScoreActionable(score: number): string | undefined {
  if (score >= 80) {
    return "Consider long-term investments for your savings";
  } else if (score >= 60) {
    return "Focus on increasing your savings rate";
  } else if (score >= 40) {
    return "Review your budget to reduce unnecessary expenses";
  } else {
    return "Create a strict budget and prioritize debt reduction";
  }
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}