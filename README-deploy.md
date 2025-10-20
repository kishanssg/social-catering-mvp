# QUICK DEPLOYMENT GUIDE - Social Catering MVP

## 🚀 One-Command Deploy (after initial setup)
```bash
cd social-catering-deployment
./deploy.sh both
```

## 📋 Initial Setup Checklist
1) Prerequisites
- Heroku CLI installed
- Git repository initialized
- Logged in to Heroku (`heroku login`)
- Rails app exists in root (API)
- React app exists in `social-catering-ui/`

2) Copy Configuration Files (if starting from a template)
```bash
# Rails
cp social-catering-api/Procfile YOUR_REPO/social-catering-api/
cp social-catering-api/config/puma.rb YOUR_REPO/social-catering-api/config/
cp social-catering-api/config/initializers/cors.rb YOUR_REPO/social-catering-api/config/initializers/
cp social-catering-api/app/controllers/health_controller.rb YOUR_REPO/social-catering-api/app/controllers/
cp social-catering-api/db/seeds.rb YOUR_REPO/social-catering-api/db/

# React
cp social-catering-ui/static.json YOUR_REPO/social-catering-ui/
cp social-catering-ui/tsconfig.json YOUR_REPO/social-catering-ui/
cp social-catering-ui/vite.config.ts YOUR_REPO/social-catering-ui/
cp social-catering-ui/src/services/api.ts YOUR_REPO/social-catering-ui/src/services/
```

3) Update Rails Routes
```ruby
# config/routes.rb
get '/healthz', to: 'health#check'
```

4) Update package.json Scripts (UI)
```json
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

5) Run Deployment
```bash
chmod +x deploy.sh
./deploy.sh both
```

---

## 🔧 Manual Deployment Steps
### Create Apps
```bash
heroku create social-catering-api --region us
heroku create social-catering-ui --region us
heroku addons:create heroku-postgresql:mini -a social-catering-api
```

### Configure Buildpacks
```bash
# API
heroku buildpacks:add https://github.com/lstoll/heroku-buildpack-monorepo -a social-catering-api
heroku buildpacks:add heroku/ruby -a social-catering-api
heroku config:set APP_BASE=. -a social-catering-api

# UI
heroku buildpacks:add https://github.com/lstoll/heroku-buildpack-monorepo -a social-catering-ui
heroku buildpacks:add heroku/nodejs -a social-catering-ui
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static -a social-catering-ui
heroku config:set APP_BASE=social-catering-ui -a social-catering-ui
```

### Set Environment Variables
```bash
# API
heroku config:set -a social-catering-api \
  RAILS_ENV=production \
  RAILS_MASTER_KEY=$(cat config/master.key) \
  CORS_ORIGINS=https://social-catering-ui.herokuapp.com

# UI
heroku config:set -a social-catering-ui \
  NODE_ENV=production \
  VITE_API_URL=https://social-catering-api.herokuapp.com
```

### Deploy
```bash
git remote add heroku-api https://git.heroku.com/social-catering-api.git || true
git remote add heroku-ui https://git.heroku.com/social-catering-ui.git || true

git push heroku-api main
git push heroku-ui main

heroku run rake db:migrate -a social-catering-api
heroku run rake db:seed -a social-catering-api
```

### 🔍 Verification
- API Health: https://social-catering-api.herokuapp.com/healthz
- UI App: https://social-catering-ui.herokuapp.com

---

## 🐛 Troubleshooting
- TypeScript build
  - In tsconfig.json: set `skipLibCheck: true`, `strict: false` and run typecheck in CI
- CORS
  - `heroku config:set CORS_ORIGINS=https://social-catering-ui.herokuapp.com -a social-catering-api`
- Build memory (UI)
  - `heroku config:set NODE_OPTIONS="--max-old-space-size=2048" -a social-catering-ui`
- Logs
  - `heroku logs --tail -a social-catering-api`
  - `heroku logs --tail -a social-catering-ui`

---

## 📝 Admin Credentials (seeded)
- natalie@socialcatering.com
- madison@socialcatering.com
- sarah@socialcatering.com
- Password: TempPassword123! (change immediately)

---

## 🔄 Future AWS Migration (Optional)
- Switch Active Storage to S3
- Serve UI via S3 + CloudFront
- Rails to Heroku (stays) or EB (optional)
