import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — DriveHire" },
      {
        name: "description",
        content: "Draft terms for using the DriveHire car-hire marketplace.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Terms of service"
        subtitle="Draft for review · Last updated 20 October 2026"
      />
      <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <strong>Launch notice:</strong> This draft is for product planning and is not legal advice.
        Have a qualified lawyer review it for the countries where DriveHire and its customers
        operate before accepting real bookings or payments.
      </div>
      <article className="space-y-6 rounded-2xl bg-card p-6 leading-relaxed shadow-[var(--shadow-card)]">
        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. What DriveHire does</h2>
          <p>
            DriveHire provides an online marketplace where customers can discover vehicles offered
            by independent rental companies. Unless a separate written agreement says otherwise, the
            rental company—not DriveHire—provides the vehicle, verifies the vehicle handover, and is
            responsible for the rental service and vehicle condition.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. Accounts and accurate information</h2>
          <p>
            Keep your sign-in credentials private and provide accurate contact, driver, and booking
            information. Tell us promptly through Support if you suspect account misuse. Rental
            companies must keep listings, prices, photos, availability, and vehicle details accurate
            and must only list vehicles they are authorised to rent.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. Booking requests and availability</h2>
          <p>
            A booking request is subject to confirmation by the rental company. Search results
            reflect availability information recorded by the platform, but a request is not a
            guarantee until confirmed. Customers should review pickup and return times, locations,
            total estimates, deposit terms, included cover, and the rental company’s cancellation
            policy before submitting a request.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. Payments, deposits, and refunds</h2>
          <p>
            The current DriveHire payment flow is a demonstration and does not process real card
            payments. Do not enter real payment-card details. No payment, deposit hold, insurance
            cover, or refund is created by this demo. Real bookings must not be launched until
            payment processing, refund handling, pricing, taxes, deposits, and applicable consumer
            disclosures have been implemented and reviewed.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. Changes, cancellations, and disputes</h2>
          <p>
            Customers can submit cancellation or date-change requests where the booking status
            permits. A request is not approved until the rental company responds. Review the
            cancellation policy shown for the specific vehicle. For a safety concern, disputed
            charge, vehicle condition issue, or unresolved booking problem, contact Support and
            include the booking reference. Nothing in this draft limits rights that cannot legally
            be excluded.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">6. Reviews and acceptable use</h2>
          <p>
            Reviews must relate to a completed booking and should be honest, relevant, and
            respectful. Do not submit unlawful content, threaten others, misrepresent a rental, or
            attempt to interfere with another user’s account, booking, or vehicle listing. Reviews
            may be hidden or removed when required by law or platform rules.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">7. Service availability and contact</h2>
          <p>
            We work to keep the marketplace available and accurate, but cannot guarantee
            uninterrupted service or that every listing is error-free. Use the in-app Support page
            for account, booking, safety, or dispute reports. Response times and emergency
            escalation arrangements must be confirmed before public launch.
          </p>
        </section>
      </article>
    </div>
  );
}
