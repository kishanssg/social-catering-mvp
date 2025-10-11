import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Get all days to display in calendar month view
 * Includes days from previous/next month to fill the grid
 */
export const getCalendarDays = (date: Date): CalendarDay[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();
  
  return days.map(day => ({
    date: day,
    isCurrentMonth: isSameMonth(day, date),
    isToday: isSameDay(day, today),
  }));
};

/**
 * Get month name and year
 */
export const getMonthYear = (date: Date): string => {
  return format(date, 'MMMM yyyy');
};

/**
 * Navigate to previous month
 */
export const getPreviousMonth = (date: Date): Date => {
  return subMonths(date, 1);
};

/**
 * Navigate to next month
 */
export const getNextMonth = (date: Date): Date => {
  return addMonths(date, 1);
};

/**
 * Format date as YYYY-MM-DD for API queries
 */
export const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get day of week names
 */
export const getDayNames = (): string[] => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};
