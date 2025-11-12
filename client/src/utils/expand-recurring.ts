import { TransactionWithCategory } from "@shared/schema";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfMonth, endOfMonth } from "date-fns";

export function expandRecurringTransactions(
  transactions: TransactionWithCategory[],
  startDate: Date,
  endDate: Date
): TransactionWithCategory[] {
  const expanded: TransactionWithCategory[] = [];

  for (const transaction of transactions) {
    if (!transaction.isRecurring || !transaction.recurringInterval) {
      expanded.push(transaction);
      continue;
    }

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
        expanded.push({
          ...transaction,
          displayDate: new Date(currentDate),
          isRecurringInstance: true,
        });
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
  }

  return expanded;
}
