# ERP Institute V3 — Phase 01

Implemented:
- Shared login and JWT authentication
- Role routing for Super Admin and Institute users
- Multi-tenant institution foundation
- Super Admin dashboard KPIs
- Registered Institutions directory and onboarding
- Subscription plan, invoice, concession, payment, CRM and notice database models
- Institute Admin dashboard shell
- Module routes for Students, Attendance, Fees, Exams, Result Cards, PTM, Website, Users and Settings

## Configure MySQL
Edit `backend/.env` and set `DATABASE_URL`.

## Initialize
```bash
npm run setup
npm run dev
```

URLs:
- Frontend: http://127.0.0.1:5173
- API health: http://127.0.0.1:4000/api/v1/health

Demo accounts:
- Super Admin: admin-ndmahsan / Admin@12345
- Institute Admin: demo-admin / Institute@12345
# ERP_institute_v3
