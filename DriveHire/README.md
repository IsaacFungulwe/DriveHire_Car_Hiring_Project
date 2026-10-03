# DriveHire

DriveHire is a car-hiring application built with TanStack Start, React, and Supabase.

## Development

From the repository root, create your local environment file and install the locked dependencies:

```sh
cd DriveHire
cp -n .env.example .env
bun install --frozen-lockfile
```

## Requirements

- Node.js 22.12+ and Bun
- A Supabase project

## Configure Supabase

Update `.env` with your Supabase project ID, project URL, and publishable key. The `VITE_` values must match their server-side counterparts:

```dotenv
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use the same project URL and publishable key for both variable pairs. Publishable keys are intended for client use; never put a service-role key in a `VITE_` variable or commit private server secrets.

## Admin Access

Admins use the same email-and-password sign-in as other users. First create the account through the app, then run this once in the Supabase SQL Editor, replacing the email with that account's email:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('admin@example.com')
ON CONFLICT (user_id, role) DO NOTHING;
```

The account must exist in Supabase Auth before running the query. Sign out and sign back in after granting the role; the Admin link and dashboard access will then be available. Apply the Supabase migrations to prevent signup requests from assigning themselves the admin role.

## Start the Development Server

```sh
bun run dev
```

Open the local URL printed in the terminal.

## Other Commands

```sh
bun run build    # Create a production build
bun run preview  # Preview the production build locally
bun run lint     # Run ESLint
```
