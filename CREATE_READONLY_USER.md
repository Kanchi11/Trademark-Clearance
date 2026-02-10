# Creating Read-Only Database Access for Reviewers

## Step 1: Create Read-Only PostgreSQL User

In Supabase SQL Editor, run:

```sql
-- Create read-only user
CREATE USER reviewer_readonly WITH PASSWORD 'ChooseStrongPassword123!';

-- Grant connection and schema access
GRANT CONNECT ON DATABASE postgres TO reviewer_readonly;
GRANT USAGE ON SCHEMA public TO reviewer_readonly;

-- Grant SELECT only (no INSERT/UPDATE/DELETE)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reviewer_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reviewer_readonly;
```

## Step 2: Get Read-Only Connection String

Format:
```
postgresql://reviewer_readonly:YourPassword@db.xxx.supabase.co:5432/postgres
```

Find host: Supabase → Settings → Database

## Step 3: Share Safely

Update REVIEWERS.md:
```
DATABASE_URL=postgresql://reviewer_readonly:CONTACT_FOR_PASSWORD@...
```

Share password privately via:
- GitHub issue DM
- Email
- Never in public repo!

## Revoke Access Later:

```sql
DROP USER reviewer_readonly;
```
