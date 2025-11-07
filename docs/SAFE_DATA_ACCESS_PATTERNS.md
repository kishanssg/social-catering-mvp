# Safe Data Access Patterns - Preventing "Cannot read properties of undefined" Errors

**Last Updated:** 2025-01-27  
**Purpose:** Prevent recurring "Cannot read properties of undefined (reading '0')" errors across the codebase

---

## The Problem

We keep encountering the same error pattern:
```
Cannot read properties of undefined (reading '0')
```

This happens when we:
1. Access array indices without checking if the array exists
2. Access object properties without checking if the object exists
3. Assume data structure matches our expectations

---

## Root Cause Analysis

### Common Patterns That Cause Errors:

1. **Unsafe Array Access:**
   ```typescript
   // ❌ BAD - Will crash if array is undefined or index is out of bounds
   const item = array[index];
   const first = array[0];
   ```

2. **Unsafe Nested Access:**
   ```typescript
   // ❌ BAD - Will crash if any part of the chain is undefined
   const value = event.shifts_by_role[index].assigned_workers;
   ```

3. **Mixed Safe/Unsafe Access:**
   ```typescript
   // ❌ BAD - Checks one variable but accesses another
   {displayEvent.shifts_by_role?.[index] && (
     {(event.shifts_by_role[index] as any).assigned_workers} // Crashes here!
   )}
   ```

---

## Solutions

### 1. Use Optional Chaining (`?.`)

**Always use optional chaining for nested access:**

```typescript
// ✅ GOOD
const value = event?.shifts_by_role?.[index]?.assigned_workers;
const first = array?.[0];
```

### 2. Use Safe Array Access Utility

**Location:** `social-catering-ui/src/utils/number.ts`

```typescript
import { safeArrayAccess } from '../utils/number';

// ✅ GOOD
const role = safeArrayAccess(event.shifts_by_role, index);
if (role) {
  const count = role.assigned_workers || 0;
}
```

### 3. Use Safe Get Utility for Deep Paths

**Location:** `social-catering-ui/src/utils/number.ts`

```typescript
import { safeGet } from '../utils/number';

// ✅ GOOD
const assignedCount = safeGet(event, 'shifts_by_role.0.assigned_workers', 0);
```

### 4. Guard Clauses in Functions

**Always validate indices before array access:**

```typescript
// ✅ GOOD
const handleRoleChange = (index: number, field: string, value: any) => {
  if (index < 0 || index >= roles.length) return; // Guard clause
  const newRoles = [...roles];
  newRoles[index] = { ...newRoles[index], [field]: value };
  setRoles(newRoles);
};
```

### 5. Use IIFE for Complex Conditional Rendering

**When checking multiple conditions, use IIFE to avoid mixed safe/unsafe access:**

```typescript
// ❌ BAD
{displayEvent.shifts_by_role?.[index] && (
  {(event.shifts_by_role[index] as any).assigned_workers} // Mixed access!
)}

// ✅ GOOD
{(() => {
  const roleData = displayEvent?.shifts_by_role?.[index];
  const assignedCount = roleData?.assigned_workers || roleData?.filled_shifts || 0;
  return assignedCount > 0 ? (
    <div>{assignedCount} workers assigned</div>
  ) : null;
})()}
```

---

## Code Review Checklist

Before merging any PR, check for:

- [ ] **Array Access:** All `array[index]` uses have bounds checking or optional chaining
- [ ] **Nested Access:** All `obj.prop.subprop` uses have optional chaining `obj?.prop?.subprop`
- [ ] **Mixed Variables:** When checking one variable, don't access a different variable
- [ ] **Function Guards:** Functions that take indices validate bounds before access
- [ ] **Default Values:** Use `|| 0`, `|| []`, `|| {}` for fallbacks
- [ ] **Type Guards:** Check `Array.isArray()` before array operations

---

## Common Patterns to Fix

### Pattern 1: Array Index Access

```typescript
// ❌ BAD
const first = items[0];
const item = array[index];

// ✅ GOOD
const first = items?.[0];
const item = safeArrayAccess(array, index);
// OR
const item = array?.[index];
```

### Pattern 2: Nested Object Access

```typescript
// ❌ BAD
const count = event.shifts_by_role[index].assigned_workers;

// ✅ GOOD
const count = event?.shifts_by_role?.[index]?.assigned_workers || 0;
// OR
const count = safeGet(event, `shifts_by_role.${index}.assigned_workers`, 0);
```

### Pattern 3: Conditional Rendering

```typescript
// ❌ BAD
{data?.items?.[0] && (
  <div>{data.items[0].name}</div> // Mixed access!
)}

// ✅ GOOD
{(() => {
  const firstItem = data?.items?.[0];
  return firstItem ? (
    <div>{firstItem.name}</div>
  ) : null;
})()}
```

### Pattern 4: Map/Filter Operations

```typescript
// ❌ BAD
{items.map((item, index) => (
  <div>{relatedData[index].value}</div> // Assumes same length!
))}

// ✅ GOOD
{items.map((item, index) => {
  const related = safeArrayAccess(relatedData, index);
  return related ? (
    <div>{related.value}</div>
  ) : null;
})}
```

---

## Utility Functions Reference

### `safeArrayAccess<T>(array, index)`

Safely access array element by index.

```typescript
import { safeArrayAccess } from '../utils/number';

const role = safeArrayAccess(event.shifts_by_role, 0);
if (role) {
  // Use role safely
}
```

### `safeGet(obj, path, fallback)`

Safely access nested object property.

```typescript
import { safeGet } from '../utils/number';

const count = safeGet(event, 'shifts_by_role.0.assigned_workers', 0);
const name = safeGet(user, 'profile.name', 'Unknown');
```

### `safeNumber(value, fallback)`

Safely convert to number.

```typescript
import { safeNumber } from '../utils/number';

const hours = safeNumber(assignment.hours_worked, 0);
```

### `safeToFixed(value, digits, fallback)`

Safely format number with decimals.

```typescript
import { safeToFixed } from '../utils/number';

const formatted = safeToFixed(total, 2, '0.00');
```

---

## Testing Strategy

### 1. Test with Missing Data

Always test components with:
- `undefined` values
- `null` values
- Empty arrays `[]`
- Missing properties

### 2. Test Edge Cases

- Empty arrays: `[]`
- Single item arrays: `[item]`
- Out of bounds indices
- Deeply nested undefined values

### 3. Use TypeScript Strict Mode

Enable strict null checks in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

---

## Prevention Workflow

### When Adding New Code:

1. **Before writing:** Ask "What if this data is undefined?"
2. **While writing:** Use optional chaining for all nested access
3. **After writing:** Test with undefined/null/empty data
4. **Before commit:** Run the checklist above

### When Reviewing Code:

1. **Scan for:** `[index]`, `[0]`, `.property.subproperty`
2. **Check:** Are there guards? Optional chaining? Fallbacks?
3. **Test:** Can this crash with missing data?

---

## Examples from Our Codebase

### Fixed: EditEventModal.tsx

**Before (BROKEN):**
```typescript
{displayEvent.shifts_by_role?.[index] && (
  {(event.shifts_by_role[index] as any).assigned_workers} // ❌ Crashes!
)}
```

**After (FIXED):**
```typescript
{(() => {
  const roleData = displayEvent?.shifts_by_role?.[index];
  const assignedCount = roleData?.assigned_workers || roleData?.filled_shifts || 0;
  return assignedCount > 0 ? (
    <div>{assignedCount} worker(s) assigned</div>
  ) : null;
})()}
```

---

## Quick Reference Card

```
✅ DO:
- Use ?. for nested access
- Use safeArrayAccess() for indices
- Use || 0, || [], || {} for defaults
- Guard functions with bounds checks
- Use IIFE for complex conditionals

❌ DON'T:
- Access array[index] without checking
- Access obj.prop.subprop without ?.
- Check one variable, access another
- Assume data structure matches expectations
- Skip null/undefined checks
```

---

**Remember:** It's better to show nothing than to crash. Always provide fallbacks!

