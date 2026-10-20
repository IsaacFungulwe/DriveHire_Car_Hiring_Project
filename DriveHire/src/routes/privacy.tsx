import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy notice — DriveHire" },
      {
        name: "description",
        content: "Draft privacy notice describing data used by the DriveHire marketplace.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Privacy notice"
        subtitle="Draft for review · Last updated 20 October 2026"
      />
      <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <strong>Launch notice:</strong> This draft needs review by a privacy professional. Before
        launch, confirm the data controller, contact details, legal bases, retention periods,
        international transfers, and rights required by the laws that apply to your customers.
      </div>
      <article className="space-y-6 rounded-2xl bg-card p-6 leading-relaxed shadow-[var(--shadow-card)]">
        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. Information the app handles</h2>
          <p>
            DriveHire may process account details such as name, email, and phone; company and
            vehicle listings; booking dates, locations, status, and pricing; support messages;
            customer reviews; favourites; and notification preferences. Do not submit payment-card
            numbers in this demo. The current payment flow does not need or process real card data.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. How information is used</h2>
          <p>
            Information is used to operate accounts, display listings, check availability, create
            and manage booking requests, communicate booking updates, respond to support or dispute
            reports, display eligible reviews, and protect the service from misuse. Information
            should only be used for these purposes or other purposes disclosed and permitted by
            applicable law.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. Sharing and service providers</h2>
          <p>
            Booking details are made available to the customer and the rental company handling that
            booking. DriveHire uses Supabase for authentication, database, and vehicle-photo
            storage. Hosting, email, analytics, and any future payment providers must be identified
            here before production use. We do not claim that this demo has configured a production
            analytics or error-monitoring provider.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. Storage, security, and retention</h2>
          <p>
            The app uses access controls and database policies to restrict account and booking
            information. No online service can promise absolute security. Set and publish retention
            periods for accounts, booking records, support tickets, audit logs, and uploaded images;
            configure backups and access monitoring; and provide a process for suspected incidents
            before launch.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. Your choices and requests</h2>
          <p>
            Use your profile settings to correct available account details and notification
            preferences. For a data access, correction, deletion, or privacy question, submit an
            in-app Support request. Some booking, security, or legal records may need to be retained
            where law permits or requires; the final notice should explain those exceptions and
            response times.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">6. Children and location data</h2>
          <p>
            DriveHire is intended for people legally able to enter a vehicle-rental agreement. The
            current app collects pickup and return location text for bookings but does not need
            continuous device-location tracking. Confirm age requirements and any child-data rules
            for the markets where the service will operate.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">7. Contact and updates</h2>
          <p>
            Use the Support page for privacy questions or requests. Replace this placeholder process
            with the responsible organisation’s legal name, privacy contact, applicable regulator
            information, and the effective date before publishing a production privacy notice.
          </p>
        </section>
      </article>
    </div>
  );
}
