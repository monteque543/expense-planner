/**
 * Type definitions for the monthly tracker module
 */

export function markMonthlyTransactionAsPaid(transactionId: number, date: Date, isPaid: boolean): void;
export function getMonthlyTransactionPaidStatus(transactionId: number, date: Date): boolean;
export function clearAllMonthlyStatuses(): void;
export function skipRecurringTransactionForMonth(transactionId: number, date: Date): void;
export function isRecurringTransactionSkipped(transactionId: number, date: Date): boolean;
export function unskipRecurringTransactionForMonth(transactionId: number, date: Date): void;
export function getSkippedMonthsForTransaction(transactionId: number): string[];