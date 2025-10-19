# Login Fix - Quick Start Guide

## The Problem
You might be accessing the **wrong frontend** or the **old dev server**.

## The Solution

### ✅ Correct URL
**Go to:** http://localhost:3000

### ❌ Wrong URLs (don't use these)
- ~~http://localhost:5173~~ (old Vite dev server)
- ~~http://localhost:3001~~ (wrong port)

---

## Login Credentials

### Test Login Button (Easiest)
1. Go to http://localhost:3000
2. Click **🚀 Test Login (Auto-fill & Sign in)** button
3. Done!

### Manual Login
- **Email:** natalie@socialcatering.com
- **Password:** Password123!

---

## Current Server Status

✅ **Rails Backend:** Running on port 3000 (PID: 54134)
✅ **Frontend:** Deployed to `public/` folder
✅ **Test User:** natalie@socialcatering.com exists
✅ **Login API:** Working (tested via curl)

---

## If Login Still Fails

### Check Browser Console
1. Open http://localhost:3000
2. Press `F12` (Developer Tools)
3. Go to **Console** tab
4. Try to login
5. Look for red errors

### Common Issues

**Issue:** "Login failed" message
**Fix:** Clear browser cookies/cache for localhost

**Issue:** No test login button visible
**Fix:** Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

**Issue:** CORS or 401 errors
**Fix:** Make sure you're on port 3000, not 5173

---

## Restart Everything (Nuclear Option)

```bash
# Kill Rails
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -f tmp/pids/server.pid

# Rebuild frontend
cd social-catering-ui
npm run build

# Deploy to Rails
cd ..
cp -r social-catering-ui/dist/* public/

# Start Rails
rails server -p 3000
```

Then go to http://localhost:3000

