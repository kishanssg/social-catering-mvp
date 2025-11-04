# Deployment Guide for Social Catering MVP

## Quick Start

### Local Development
```bash
# Start frontend dev server (from social-catering-ui/)
npm run dev

# Start Rails backend (from project root)
bin/rails server
```

Frontend runs on `http://localhost:5173` (or Vite's default port).

---

## Deploying to Staging

### Option 1: One-Command Deploy Script
```bash
./deploy.sh
```

This script:
1. Builds the frontend with Vite
2. Copies all assets to `public/`
3. Commits the changes
4. Pushes to staging

### Option 2: Manual Deploy
```bash
# From social-catering-ui/
npm run build

# From project root
rm -rf public/assets && mkdir -p public/assets
cp -a social-catering-ui/dist/*.js public/assets/
cp -a social-catering-ui/dist/*.css public/assets/
cp social-catering-ui/dist/index.html public/index.html

git add public/
git commit -m "feat: Sync Vite build"
git push staging dev:main
```

### Option 3: NPM Script (from UI directory)
```bash
cd social-catering-ui
npm run deploy:staging
```

Or just build/copy without committing:
```bash
npm run deploy:staging:quick
```

---

## Critical Rules

### Never touch `social-catering-ui/index.html` for deployment
- ✅ **Dev**: Points to `/src/main.tsx` (HMR works)
- ✅ **Production**: Built `dist/index.html` goes to `public/index.html`

### Always copy the ENTIRE build
```bash
# This copies EVERYTHING
cp -a social-catering-ui/dist/*.js public/assets/
cp -a social-catering-ui/dist/*.css public/assets/
cp social-catering-ui/dist/index.html public/index.html
```

### Verify Deployment
After deploy, check:
```bash
# Should return 200
curl -I https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/assets/index-*.js | grep HTTP
```

---

## File Structure

```
social-catering-ui/
  ├── index.html          # Dev only (points to /src/main.tsx)
  ├── src/
  └── dist/               # Built output
      ├── index.html      # Production HTML
      ├── *.js            # All JS chunks
      └── *.css           # All CSS

public/                    # Deployed to Heroku
  ├── index.html          # Copied from dist/index.html
  └── assets/             # All JS/CSS chunks
```

---

## Troubleshooting

### "Failed to fetch dynamically imported module" Error

**Cause**: Missing or stale assets on Heroku.

**Fix**:
```bash
# 1. Rebuild
cd social-catering-ui
rm -rf dist
npm run build

# 2. Copy EVERYTHING
cd ..
rm -rf public/assets public/index.html
mkdir -p public/assets
cp -a social-catering-ui/dist/*.js public/assets/
cp -a social-catering-ui/dist/*.css public/assets/
cp social-catering-ui/dist/index.html public/index.html

# 3. Commit and deploy
git add public/
git commit -m "fix: Complete asset sync"
git push staging dev:main
```

### Stale Cache in Browser

**Fix**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear cache in DevTools.

---

## What Gets Deployed

### Build Process
1. TypeScript compiles → JavaScript
2. Vite bundles JS/CSS with content hashing
3. `dist/` contains all production assets

### Asset Copying
- ✅ All `.js` files → `public/assets/`
- ✅ All `.css` files → `public/assets/`
- ✅ `index.html` → `public/index.html`

### What's NOT in Git
- `social-catering-ui/node_modules/`
- `social-catering-ui/dist/` (built locally, copied to `public/`)
- `public/assets/` contents before deploy (replaced each time)

---

## Environment Setup

### Staging App
- **URL**: https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/
- **Heroku App**: `sc-mvp-staging`
- **Branch**: `dev` → `main` (staging)

### Required Config Vars
```bash
RAILS_SERVE_STATIC_FILES=true
RAILS_ENV=production
DATABASE_URL=<auto-set>
SECRET_KEY_BASE=<auto-set>
```

---

## Best Practices

1. **Always test locally first**
   ```bash
   npm run dev  # Frontend on 5173
   bin/rails s  # Backend on 3000
   ```

2. **Build once, deploy once**
   - Run the deploy script once per release
   - Don't rebuild mid-deployment

3. **Verify assets before testing**
   - Check Heroku logs for 404s
   - Verify chunk URLs return 200

4. **Use descriptive commits**
   ```bash
   git commit -m "feat: QuickFill modal consistency"
   git commit -m "fix: Complete asset sync"
   ```

---

## Quick Reference

| Task | Command |
|------|---------|
| Local dev | `npm run dev` + `bin/rails s` |
| Deploy to staging | `./deploy.sh` |
| Build only | `cd social-catering-ui && npm run build` |
| Check logs | `heroku logs --tail -a sc-mvp-staging` |
| Verify health | `curl https://sc-mvp-staging-c6ef090c6c41.herokuapp.com/healthz` |
| Restart app | `heroku restart -a sc-mvp-staging` |

