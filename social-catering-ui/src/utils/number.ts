export function safeNumber(value: any, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? (n as number) : fallback
}

export function safeToFixed(value: any, digits = 2, fallback = '0'): string {
  const n = safeNumber(value, NaN)
  if (!Number.isFinite(n)) return fallback
  try {
    return n.toFixed(digits)
  } catch {
    return fallback
  }
}

export function formatMoneyCents(value: any): string {
  return `$${safeToFixed(value, 2, '0.00')}`
}

export function formatHours(value: any): string {
  return `${safeToFixed(value, 2, '0.00')}`
}

/**
 * Safely access an array element by index, returning undefined if out of bounds
 * @param array The array to access
 * @param index The index to access
 * @returns The element at index, or undefined if not available
 */
export function safeArrayAccess<T>(array: T[] | undefined | null, index: number): T | undefined {
  if (!array || !Array.isArray(array)) return undefined;
  if (index < 0 || index >= array.length) return undefined;
  return array[index];
}

/**
 * Safely access a nested object property with optional chaining
 * @param obj The object to access
 * @param path The property path (e.g., 'shifts_by_role.0.assigned_workers')
 * @param fallback The value to return if path doesn't exist
 * @returns The value at path, or fallback
 */
export function safeGet(obj: any, path: string, fallback: any = undefined): any {
  if (!obj) return fallback;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null) return fallback;
    // Handle array indices
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      if (!Array.isArray(current) || index < 0 || index >= current.length) {
        return fallback;
      }
      current = current[index];
    } else {
      current = current[key];
    }
  }
  return current !== undefined ? current : fallback;
}


