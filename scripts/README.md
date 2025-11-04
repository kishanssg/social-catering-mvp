# Scripts Directory

This directory contains utility scripts for deployment, development, and database operations.

## 🚀 Production Scripts (Operations Team)

### `deploy-heroku.sh`
Main Heroku deployment automation script. This script:
- Builds the frontend
- Syncs assets to Rails public directory
- Deploys to Heroku
- Runs migrations
- Verifies deployment

**Usage:**
```bash
./scripts/deploy-heroku.sh production
# or
./scripts/deploy-heroku.sh staging
```

## 🔧 Development Scripts

Located in `scripts/dev/` - These are for developers only:

- **TypeScript Scripts**: API path auditing, endpoint testing, route generation
- **Shell Scripts**: Schedule auditing, conflict checking, verification scripts
- **Testing Scripts**: Smoke tests, performance tests, proof scripts

## 💾 Database Scripts

Located in `scripts/database/` - Database utilities:

- `test_certification_flow.rb` - Test certification workflow
- `verify_certifications.rb` - Verify certification data integrity

## 📝 Notes

- Production scripts are safe for operations team use
- Development scripts require technical knowledge
- Always review scripts before running in production

