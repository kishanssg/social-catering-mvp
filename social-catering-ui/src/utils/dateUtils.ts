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

/**
 * Formats a humanized date-time string: "Nov 7, 6:57 AM, 2025"
 * @param dateString - The date string to format
 * @returns Formatted date string or fallback
 */
export function formatHumanizedDateTime(dateString: string | null | undefined, fallback: string = 'N/A'): string {
  if (!dateString) return fallback;
  
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      return fallback;
    }
    return format(parsedDate, 'MMM d, h:mm a, yyyy');
  } catch (error) {
    console.warn('Error formatting humanized datetime:', dateString, error);
    return fallback;
  }
}

/**
 * Gets status message for an assignment (approved, denied, no-show)
 * @param assignment - Assignment object with status, approved_by_name, approved_at, approval_notes
 * @returns Status message string or null
 */
export function getAssignmentStatusMessage(assignment: {
  status?: string;
  approved?: boolean;
  approved_by_name?: string;
  approved_at?: string;
  approval_notes?: string;
}): string | null {
  if (assignment.status === 'no_show' && assignment.approved_by_name) {
    return `Marked as no-show by ${assignment.approved_by_name.split('@')[0]} on ${formatHumanizedDateTime(assignment.approved_at)}`;
  }
  if ((assignment.status === 'cancelled' || assignment.status === 'removed') && assignment.approved_by_name) {
    return `Denied by ${assignment.approved_by_name.split('@')[0]} on ${formatHumanizedDateTime(assignment.approved_at)}`;
  }
  if (assignment.approved && assignment.approved_by_name) {
    return `Approved by ${assignment.approved_by_name.split('@')[0]} on ${formatHumanizedDateTime(assignment.approved_at)}`;
  }
  return null;
}
