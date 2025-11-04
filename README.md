# Social Catering MVP

**Production:** https://sc-mvp-production-6b7a268cc8ad.herokuapp.com  
**Staging:** https://sc-mvp-staging.herokuapp.com

A comprehensive workforce scheduling and management system for catering companies. Manage events, assign workers to shifts based on skills and certifications, track hours, and generate payroll reports.

---

## 📚 Documentation

**Complete documentation is available in the [`docs/`](./docs/) directory:**

- **[README.md](./docs/README.md)** - Project overview, setup, and architecture
- **[RUNBOOK.md](./docs/RUNBOOK.md)** - Operations manual with backup/restore procedures
- **[ENV_CONFIG.md](./docs/ENV_CONFIG.md)** - Environment variable documentation
- **[API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - Complete API reference
- **[USER_GUIDE.md](./docs/USER_GUIDE.md)** - End-user instructions for operations team

**Quick Links:**
- [Setup Instructions](./docs/README.md#-local-development-setup)
- [API Reference](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/RUNBOOK.md#-deployment-procedures)
- [User Guide](./docs/USER_GUIDE.md)

---

## 🚀 Quick Start

### Prerequisites
- Ruby 3.4.5+
- Node.js 18+
- PostgreSQL 14+

### Installation
```bash
# Install dependencies
bundle install
cd social-catering-ui && npm install && cd ..

# Setup database
rails db:create db:migrate db:seed

# Start development servers
./bin/dev
```

**Full setup instructions:** See [docs/README.md](./docs/README.md)

---

## 🏗️ Tech Stack

- **Backend:** Rails 7.2 + PostgreSQL
- **Frontend:** React 18 + TypeScript + Vite
- **Hosting:** Heroku (Eco/Basic dynos + Standard-0 Postgres)

---

## 📝 Status

✅ **Milestones 1, 2, 3 Complete**
- Backend API with Workers, Shifts, Assignments CRUD
- Frontend React SPA with dashboard and workflows
- Production deployment with automated daily backups

---

## 📞 Support

- **Documentation:** See [`docs/`](./docs/) directory
- **Operations Manual:** [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)
- **API Reference:** [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md)

---

**Last Updated:** November 2025  
**Repository:** https://github.com/kishanssg/social-catering-mvp
