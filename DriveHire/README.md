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
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Each account has one role. Promoting an existing account to admin replaces its current role. The account must exist in Supabase Auth before running the query. Sign out and sign back in after granting the role; the Admin link and dashboard access will then be available. Apply all Supabase migrations to enforce the one-role rule and prevent signup requests from assigning themselves the admin role.

Apply all migrations in `supabase/migrations/` before deploying. The latest migrations add date-aware car availability search, server-side booking change requests, verified completed-trip reviews and company ratings. Company owners also have an availability calendar, booking-value reports with CSV export, and fleet listing controls.

The demo fleet is seeded by Supabase migrations. Demo vehicles use the four bundled images in `src/assets/cars/` (`corolla.jpg`, `hatch.jpg`, `suv.jpg`, and `exec.jpg`) through `image_key`; they are local project assets, not live external image URLs. These are illustrative stock images and may not depict the exact vehicle. Customer-uploaded vehicle images are stored in the Supabase `vehicles` storage bucket.

## Launch readiness

The app includes public draft [Terms of service](/terms) and [Privacy notice](/privacy), plus authenticated support and dispute requests. Apply the `20261020100000_launch_essentials.sql` migration along with all earlier migrations. Admins can triage requests from the Admin dashboard; resolving a request sends an in-app notification. Support is not an emergency service, and no external support email or phone number is configured.

The legal pages are placeholders, not legal advice. Before launch, have qualified counsel review them for the confirmed operating jurisdiction, name the legal entity and privacy contact, publish applicable cancellation/refund rules, and finalize data retention, deletion, and response-time policies.

The booking flow is a demo and does not process payments or collect card details. Do not accept real bookings until a payment provider, refunds, deposits, taxes, rental-company agreements, actual vehicle photos, and the booking handover process have been configured and tested.

### Backups and monitoring (operator setup required)

- **Backups:** In the Supabase project dashboard, confirm the database backup schedule and retention available for your plan. For production, enable point-in-time recovery if appropriate for the plan and recovery objectives. Document who can restore, test a restore into a separate project before launch, and record the recovery point and verification steps. This repository does not configure or verify a hosted backup schedule.
- **Monitoring:** Configure production alerts for Supabase database/API errors, authentication failures, storage issues, and hosting availability. The app's existing editor-preview error reporting is not a production monitoring integration. Select and configure a production error tracker and alert destination, verify a test event reaches the on-call contact, and document incident ownership before launch.
- **Access and operations:** Restrict production dashboard and service-role access, keep secrets out of client variables, review database audit logs, and establish a process for support-ticket and safety escalation. No production backup restore, monitoring provider, or on-call contact has been configured by this repository.

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
