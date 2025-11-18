/**
 * Phone number formatting utilities
 * Formats phone numbers for display and normalizes them for storage
 */

/**
 * Format a phone number string to display format (e.g., "3864568799" -> "386-456-8799")
 * @param phone - Phone number string (can be digits only or already formatted)
 * @returns Formatted phone string or original if invalid
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's exactly 10 digits, format as XXX-XXX-XXXX
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  
  // Return original if not 10 digits (might be international or partial)
  return phone;
}

/**
 * Normalize a phone number for storage (strip all non-digits)
 * @param phone - Phone number string (can be formatted or unformatted)
 * @returns Digits-only string
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number as user types (auto-inserts dashes)
 * @param value - Current input value
 * @returns Formatted value with dashes inserted
 */
export function formatPhoneInput(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format with dashes
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

