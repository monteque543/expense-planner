import { TransactionWithCategory } from "@shared/schema";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfMonth, endOfMonth } from "date-fns";

export function expandRecurringTransactions(
  transactions: TransactionWithCategory[],
  startDate: Date,
  endDate: Date
): TransactionWithCategory[] {
  const expanded: TransactionWithCategory[] = [];

  console.log(`[EXPAND] Expanding ${transactions.length} transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  for (const transaction of transactions) {
    if (!transaction.isRecurring || !transaction.recurringInterval) {
      expanded.push(transaction);
      console.log(`[EXPAND] Adding non-recurring transaction: ${transaction.title}`);
      continue;
    }

    console.log(`[EXPAND] 🔁 Expanding recurring transaction: ${transaction.title}, interval: ${transaction.recurringInterval}, base date: ${transaction.date}, isRecurring: ${transaction.isRecurring}`);

    // Add the base recurring transaction first (for SubscriptionSummary and RecurringExpensesSummary)
    expanded.push({
      ...transaction,
      isRecurringInstance: false,
    });
    console.log(`[EXPAND] Added base recurring transaction: ${transaction.title}`);

    let instanceCount = 0;

    const baseDate = new Date(transaction.date);
    let currentDate = new Date(baseDate);

    const endLimit = transaction.recurringEndDate
      ? new Date(transaction.recurringEndDate)
      : endDate;

    while (isBefore(currentDate, endLimit) || currentDate.getTime() === endLimit.getTime()) {
      if (
        (isAfter(currentDate, startDate) || currentDate.getTime() === startDate.getTime()) &&
        (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime())
      ) {
        instanceCount++;
        expanded.push({
          ...transaction,
          date: new Date(currentDate),
          displayDate: new Date(currentDate),
          isRecurringInstance: true,
        });
        console.log(`[EXPAND] Created instance ${instanceCount} of ${transaction.title} for ${currentDate.toISOString()}`);
      }

      switch (transaction.recurringInterval) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, 1);
          break;
        default:
          currentDate = new Date(endLimit.getTime() + 1);
      }

      if (isAfter(currentDate, endLimit)) {
        break;
      }
    }

    console.log(`[EXPAND] Completed expanding ${transaction.title}: created ${instanceCount} instances`);
  }

  console.log(`[EXPAND] Total expanded transactions: ${expanded.length}`);
  return expanded;
}
