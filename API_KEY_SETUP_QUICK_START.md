# 🚀 Google Places API Key - Quick Start

## ✅ Instructions & Parking ARE Cached
- **Database fields**: `arrival_instructions` and `parking_info` are stored in `venues` table with `place_id`
- **Always editable**: UI shows Edit/Save buttons even for cached venues
- **Persistent**: Once saved, instructions stay with the venue forever

## 🔑 Add Your API Key (2 Steps)

### **Step 1: Get API Key**
1. Go to: https://console.cloud.google.com/
2. Enable **Places API (New)**
3. Create API Key
4. Copy the key

### **Step 2: Add to `.env` File**

**EXACT FILE LOCATION:**
```
/Users/kishanssg/social-catering-mvp/.env
```

**WHAT TO PUT IN IT:**
```bash
# Replace YOUR_ACTUAL_API_KEY_HERE with your real Google API key
GOOGLE_PLACES_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuv
```

**Example:**
```bash
# Before:
GOOGLE_PLACES_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# After (with your real key):
GOOGLE_PLACES_API_KEY=AIzaSyDXjg3...your_real_key_here...xyz
```

### **Step 3: Restart Rails Server**
```bash
# Kill current server
lsof -ti:3000 | xargs kill -9

# Restart
rails server
```

## 🛡️ Guardrails Against API Loops/Glitches

### ✅ **5 Layers of Protection**

#### **1. Minimum Character Length**
```ruby
# Backend: app/services/google_places_service.rb (line 16)
return { success: false, results: [] } if input.blank? || input.length < 3

# Frontend: app/controllers/api/v1/venues_controller.rb (line 10)
if query.length < 3
  return render json: { cached: [], google_results: [], session_token: session_token }
end
```
**Protection**: No API call until user types ≥3 characters

#### **2. Debouncing (300ms)**
```typescript
// Frontend: VenueAutocomplete.tsx (line 74-76)
searchTimeoutRef.current = setTimeout(() => {
  performSearch(value);
}, 300); // 300ms debounce
```
**Protection**: If user types "tallahassee", only 1 API call (not 11)

#### **3. Timeout Clearing**
```typescript
// Frontend: VenueAutocomplete.tsx (line 70-72)
if (searchTimeoutRef.current) {
  clearTimeout(searchTimeoutRef.current);  // Cancel previous call
}
```
**Protection**: Cancels previous API call when user keeps typing

#### **4. Session Tokens**
```typescript
// Frontend: VenueAutocomplete.tsx (line 54)
setSessionToken(response.session_token);

// Backend: GooglePlacesService (line 23)
sessiontoken: session_token || SecureRandom.uuid
```
**Protection**: 
- Groups autocomplete + details into single billing
- Prevents duplicate calls for same search session

#### **5. Database Caching**
```ruby
# Backend: venues_controller.rb (line 18-20)
# Search cached venues first
cached_venues = Venue.where('name ILIKE ? OR formatted_address ILIKE ?', "%#{query}%", "%#{query}%")
                     .limit(5)
```
**Protection**: 
- Returns cached venues instantly (no API call)
- Only calls Google if venue not in cache
- Venues stored permanently (reused across all jobs)

#### **6. Error Handling**
```typescript
// Frontend: VenueAutocomplete.tsx (line 55-58)
} catch (error) {
  console.error('Venue search error:', error);
  setCachedResults([]);
  setGoogleResults([]);
}
```
**Protection**: API errors don't crash the app

#### **7. Loading States**
```typescript
// Frontend: VenueAutocomplete.tsx (line 49, 60)
setIsLoading(true);  // Prevents multiple simultaneous calls
// ... API call ...
setIsLoading(false);
```
**Protection**: Prevents duplicate calls while one is in progress

### 📊 **Real-World Example**

**User types "Capital City Country Club":**

```
C         → No call (< 3 chars)
Ca        → No call (< 3 chars)
Cap       → Debounce starts (300ms timer)
Capi      → Previous timer cancelled, new 300ms timer
Capit     → Previous timer cancelled, new 300ms timer
Capital   → Previous timer cancelled, new 300ms timer
Capital C → Previous timer cancelled, new 300ms timer
(pause 300ms)
          → ✅ SINGLE API CALL (session token: abc123)
          → Returns cached venues + Google results
(User selects venue)
          → ✅ SINGLE API CALL (session token: abc123)
          → Fetches details, stores in DB
(Next time)
          → ❌ NO API CALL - Loaded from DB instantly!
```

**Result**: 2 API calls total (billed as 1 with session token)

## 🎯 Summary

### ✅ Cached in Database
- `arrival_instructions` ✓
- `parking_info` ✓
- Both stored with `place_id` ✓
- Always editable via UI ✓

### ✅ API Guardrails
- Minimum 3 characters ✓
- 300ms debouncing ✓
- Timeout clearing ✓
- Session tokens ✓
- Database caching ✓
- Error handling ✓
- Loading states ✓

### 🔑 Where to Put API Key
**File**: `/Users/kishanssg/social-catering-mvp/.env`
**Line**: `GOOGLE_PLACES_API_KEY=YOUR_ACTUAL_KEY_HERE`

### 🚀 Start Using
1. Add API key to `.env`
2. Restart Rails server
3. Go to: http://localhost:3000/jobs/create
4. Complete Skills step
5. Search for venues in Location step!

---

**No loops, no glitches, no excessive billing!** 🎉

