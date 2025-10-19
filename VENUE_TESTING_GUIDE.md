# 🎯 Venue Search - Testing Guide

## ✅ Server Status
- **Rails Server**: Running on http://localhost:3000
- **API Key**: Configured ✓
- **Database**: Venues table created ✓
- **Migration**: Complete ✓

## 🚀 How to Test

### **Step 1: Open Browser**
Go to: **http://localhost:3000**

### **Step 2: Login**
Use test credentials:
- **Email**: `natalie@socialcatering.com`
- **Password**: `Password123!`

### **Step 3: Navigate to Create Job**
1. Click **"Jobs"** in sidebar
2. Click **"Create New Job"** button (top right)
3. You'll see the wizard with stepper

### **Step 4: Complete Skills Step**
1. Click the **"+"** icon next to "Pick the Skills Needed"
2. Select a skill (e.g., **Bartender**)
3. Set **Needed Workers** (use + button)
4. Select **Uniform** from dropdown
5. Click **"Continue"**

### **Step 5: Test Venue Search! 🎉**
Now you're on **Step 1: Location**

1. **Type in search box**: "Capital" (or any venue name)
2. **Watch the magic**:
   - After 300ms, dropdown appears
   - Shows "Recent Venues" (cached) if any
   - Shows "Search Results" (Google Places) below
3. **Select a venue**: Click on any result
4. **View venue details**: Name + full address displayed
5. **Add instructions** (Optional):
   - Click **"Edit Instructions"**
   - Add arrival instructions (e.g., "Enter through main lobby")
   - Add parking info (e.g., "Free parking in rear lot")
   - Click **"Save"**
6. **Click "Continue"** to proceed

## 🧪 What to Test

### **Test 1: Google Search**
```
Type: "Capital City Country Club"
Expected: 
- Dropdown appears after typing 3+ characters
- Google results show with addresses
- Can select and save venue
```

### **Test 2: Cached Venues**
```
Search for same venue again (after selecting once)
Expected:
- Venue appears in "Recent Venues" section instantly
- No API call needed
- Instructions are preserved if you added them
```

### **Test 3: Edit Instructions**
```
Select a venue → Edit Instructions → Save
Expected:
- Instructions save successfully
- Next time you select same venue, instructions are still there
```

### **Test 4: Change Venue**
```
After selecting a venue, click "Change"
Expected:
- Goes back to search mode
- Can search and select different venue
```

### **Test 5: Debouncing**
```
Type quickly: "Tallahassee"
Expected:
- Only ONE API call after you stop typing (300ms)
- Not 11 separate calls for each letter
```

## 📊 What's Happening Behind the Scenes

### **When You Type:**
1. Frontend waits 300ms (debouncing)
2. Sends request to `/api/v1/venues/search?query=Capital`
3. Backend:
   - Searches local DB for cached venues
   - Calls Google Places Autocomplete
   - Returns both results
4. Frontend displays in dropdown

### **When You Select:**
1. Sends request to `/api/v1/venues/select` with `place_id`
2. Backend:
   - Checks DB first (cache hit?)
   - If not cached: Fetches from Google, saves to DB
   - Returns venue details
3. Frontend displays venue card

### **When You Edit Instructions:**
1. Sends PATCH to `/api/v1/venues/:id`
2. Backend updates `arrival_instructions` and `parking_info`
3. Next time: Instructions load from DB

## 🎨 UI Features to Notice

- ✅ **Debounced search** (smooth typing, no lag)
- ✅ **Cached venues labeled** "Recent Venues"
- ✅ **Google results labeled** "Search Results"
- ✅ **Dropdown scrolls** if many results
- ✅ **Selected venue** shows in bordered card
- ✅ **Edit/Save** always available
- ✅ **"Change" button** to search again
- ✅ **Continue disabled** until venue selected

## 🐛 Troubleshooting

### "No search results"
**Check:**
1. API key is correct in `.env`
2. Google Places API is enabled
3. Billing is set up in Google Cloud

**Test API key:**
```bash
rails console
service = GooglePlacesService.new
result = service.autocomplete("Capital")
puts result.inspect
```

### "Server error"
**Check logs:**
```bash
tail -f log/development.log
```

### "Dropdown not appearing"
**Check:**
1. You typed 3+ characters
2. Wait 300ms after typing
3. Browser console for errors (F12)

## 📈 Cost Tracking

**Monitor API usage:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Dashboard**
3. Click **Places API (New)**
4. View usage graphs

**Expected costs:**
- First venue search: 1 API call
- Selecting venue: 1 API call (billed together with search)
- Subsequent uses: 0 API calls (cached)

**Example session:**
```
Search "Capital" → 1 call
Select venue → 1 call (grouped with search via session token)
Edit instructions → 0 calls (DB only)
Next job using same venue → 0 calls (DB only)
---
Total: 2 calls = ~$0.017 (billed as 1 session)
```

## ✅ Success Checklist

- [ ] Can type in search box
- [ ] Dropdown appears after 3+ characters
- [ ] Google results appear
- [ ] Can select a venue
- [ ] Venue details display correctly
- [ ] Can add arrival instructions
- [ ] Can add parking info
- [ ] Instructions save successfully
- [ ] Can change venue
- [ ] Cached venues appear on re-search
- [ ] Continue button works

## 🎉 What's Next

Once you've tested the venue search:

1. **Step 2 (Schedule)**: Coming soon - time/date picker
2. **Step 3 (Check-in)**: Coming soon - QR code setup
3. **Step 4 (Summary)**: Coming soon - review all details

---

**Happy Testing!** 🚀

If everything works, you now have:
- ✅ Google Places integration
- ✅ Hybrid caching (saves $$$)
- ✅ Persistent venue instructions
- ✅ Beautiful UI matching Figma
- ✅ Production-ready venue system

