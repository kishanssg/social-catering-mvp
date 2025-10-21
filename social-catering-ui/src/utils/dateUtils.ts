import { format, parseISO, isValid } from 'date-fns';

/**
 * Safely formats a date string using parseISO and format from date-fns
 * @param dateString - The date string to format
 * @param formatString - The format string to use (default: 'MMM d, yyyy')
 * @param fallback - The fallback text to show if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback
 */
export function formatDate(dateString: string | null | undefined, formatString: string = 'MMM d, yyyy', fallback: string = 'N/A'): string {
  if (!dateString) return fallback;
  
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      console.warn('Invalid date format:', dateString);
      return fallback;
    }
    return format(parsedDate, formatString);
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return fallback;
  }
}

/**
 * Safely formats a time string using parseISO and format from date-fns
 * @param dateString - The date string to format
 * @param formatString - The format string to use (default: 'h:mm a')
 * @param fallback - The fallback text to show if date is invalid (default: 'N/A')
 * @returns Formatted time string or fallback
 */
export function formatTime(dateString: string | null | undefined, formatString: string = 'h:mm a', fallback: string = 'N/A'): string {
  if (!dateString) return fallback;
  
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      console.warn('Invalid time format:', dateString);
      return fallback;
    }
    return format(parsedDate, formatString);
  } catch (error) {
    console.warn('Error formatting time:', dateString, error);
    return fallback;
  }
}

/**
 * Safely formats a date and time string using parseISO and format from date-fns
 * @param dateString - The date string to format
 * @param formatString - The format string to use (default: 'MMM d, yyyy h:mm a')
 * @param fallback - The fallback text to show if date is invalid (default: 'N/A')
 * @returns Formatted date and time string or fallback
 */
export function formatDateTime(dateString: string | null | undefined, formatString: string = 'MMM d, yyyy h:mm a', fallback: string = 'N/A'): string {
  if (!dateString) return fallback;
  
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      console.warn('Invalid datetime format:', dateString);
      return fallback;
    }
    return format(parsedDate, formatString);
  } catch (error) {
    console.warn('Error formatting datetime:', dateString, error);
    return fallback;
  }
}

/**
 * Safely parses a date string and returns a Date object
 * @param dateString - The date string to parse
 * @returns Date object or null if invalid
 */
export function safeParseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const parsedDate = parseISO(dateString);
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.warn('Error parsing date:', dateString, error);
    return null;
  }
}
