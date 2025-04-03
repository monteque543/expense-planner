import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval
} from 'date-fns';

/**
 * Get calendar days grid for a specific month
 */
export function getCalendarDays(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  return eachDayOfInterval({ 
    start: calendarStart, 
    end: calendarEnd 
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string) {
  if (typeof date === 'string') {
    return format(parseISO(date), formatStr);
  }
  return format(date, formatStr);
}

/**
 * Check if a date is in the current month
 */
export function isCurrentMonth(date: Date, currentDate: Date) {
  return isSameMonth(date, currentDate);
}

/**
 * Get previous month
 */
export function getPreviousMonth(date: Date) {
  return subMonths(date, 1);
}

/**
 * Get next month
 */
export function getNextMonth(date: Date) {
  return addMonths(date, 1);
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date) {
  return isWithinInterval(date, { start: startDate, end: endDate });
}
