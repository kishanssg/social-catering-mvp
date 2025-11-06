# Admin Account Management

**Last Updated:** 2025-11-06  
**Maintainer:** System Administrator

---

## Current Active Accounts (Production)

| Email | Full Name | Role | Created | Status |
|-------|-----------|------|---------|--------|
| natalie@socialcatering.com | Natalie | Operations Manager | 2024-XX-XX | ✅ Active |
| madison@socialcatering.com | Madison | Operations Manager | 2024-XX-XX | ✅ Active |
| sarah@socialcatering.com | Sarah | Operations Manager | 2024-XX-XX | ✅ Active |
| gravyadmin@socialcatering.com | System Admin | Testing/Backup | 2024-XX-XX | ✅ Active |

Total Active Accounts: 4

---

## Account History

### Removed

| Email | Removed Date | Reason |
|-------|--------------|--------|
| admin@socialcatering.com | 2025-11-XX | Cleanup – replaced with named accounts |

---

## Procedures

### Create New Admin

1. Verify request from authorized person
2. Staging first, then production
3. Console command:
```ruby
User.create!(
  email: 'newuser@socialcatering.com',
  password: 'TempPassword123!',
  password_confirmation: 'TempPassword123!'
)
```
4. Test login and update this document

### Remove Admin
```ruby
user = User.find_by(email: 'olduser@socialcatering.com')
user&.destroy
```

### Password Reset
```ruby
user = User.find_by(email: 'user@socialcatering.com')
user.update(password: 'NewTempPassword123!', password_confirmation: 'NewTempPassword123!')
```

---

## Security Best Practices

- Use strong, unique passwords
- Change default password on first login
- Do not share credentials
- Remove departed accounts promptly
- Prefer named accounts over generic admin
- Keep this document updated

---

## Verification

Run monthly:
```bash
heroku run rails runner scripts/verify_admin_accounts.rb -a sc-mvp-staging
heroku run rails runner scripts/verify_admin_accounts.rb -a sc-mvp-production
```
Expected: 4 accounts, no unexpected accounts.

---

## Contacts

System Administrator: <contact>  
Project Manager: Bobby (GravyWork)  
Technical Lead: Kishan


