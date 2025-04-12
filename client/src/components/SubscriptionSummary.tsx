import React from 'react';
import { useMemo } from 'react';
import { format, parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { TransactionWithCategory } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, CalendarIcon, CreditCard } from 'lucide-react';

interface SubscriptionSummaryProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
}

export default function SubscriptionSummary({ transactions, isLoading }: SubscriptionSummaryProps) {
  // Filter subscription transactions
  const subscriptions = useMemo(() => {
    if (!transactions.length) return [];
    
    return transactions.filter(transaction => 
      transaction.isRecurring && 
      transaction.categoryId && 
      transaction.category && 
      transaction.category.name === 'Subscription'
    );
  }, [transactions]);

  // Calculate next payment dates
  const subscriptionsWithNextPayment = useMemo(() => {
    return subscriptions.map(subscription => {
      let nextPaymentDate = new Date();
      const lastPaymentDate = typeof subscription.date === 'string' 
        ? parseISO(subscription.date) 
        : subscription.date;
      
      // Ensure recurring interval is defined, default to monthly
      const interval = subscription.recurringInterval || 'monthly';
      
      // Calculate next payment based on interval
      switch (interval) {
        case 'daily':
          nextPaymentDate = addDays(lastPaymentDate, 1);
          break;
        case 'weekly':
          nextPaymentDate = addWeeks(lastPaymentDate, 1);
          break;
        case 'monthly':
          nextPaymentDate = addMonths(lastPaymentDate, 1);
          break;
        case 'yearly':
          nextPaymentDate = addYears(lastPaymentDate, 1);
          break;
        default:
          nextPaymentDate = addMonths(lastPaymentDate, 1); // Default to monthly
      }
      
      return {
        ...subscription,
        nextPaymentDate,
        recurringInterval: interval // Ensure it's defined
      };
    }).sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime());
  }, [subscriptions]);

  // Calculate total monthly subscription cost
  const monthlyTotal = useMemo(() => {
    return subscriptions.reduce((total, subscription) => {
      const { amount } = subscription;
      const interval = subscription.recurringInterval || 'monthly';
      let monthlyAmount = amount;
      
      // Convert to monthly amount
      switch (interval) {
        case 'daily':
          monthlyAmount = amount * 30; // Approximate
          break;
        case 'weekly':
          monthlyAmount = amount * 4.33; // Approximate (52/12)
          break;
        case 'yearly':
          monthlyAmount = amount / 12;
          break;
        case 'monthly':
        default:
          // Already monthly
          monthlyAmount = amount;
      }
      
      return total + monthlyAmount;
    }, 0);
  }, [subscriptions]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> 
            Active Subscriptions
          </CardTitle>
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
            {monthlyTotal.toFixed(2)} PLN/mo
          </div>
        </div>
        <CardDescription>Your recurring subscription payments</CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptionsWithNextPayment.length > 0 ? (
          <div className="space-y-3">
            {subscriptionsWithNextPayment.map((subscription, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-border"
              >
                <div>
                  <h3 className="font-medium text-foreground">{subscription.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {subscription.recurringInterval 
                      ? subscription.recurringInterval.charAt(0).toUpperCase() + subscription.recurringInterval.slice(1)
                      : 'Monthly'}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono font-medium text-red-500">{subscription.amount.toFixed(2)} PLN</span>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    Next: {format(subscription.nextPaymentDate, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>No active subscriptions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}