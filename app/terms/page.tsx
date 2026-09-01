export const metadata = {
  title: "Terms and Conditions | AxiomAI Solutions",
  description:
    "Terms and Conditions for AxiomAI Solutions and AxiomOS communications.",
};

export default function TermsPage() {
  const updated = "August 31, 2026";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0a1830 0%, #05070b 45%, #020305 100%)",
        color: "#ffffff",
        padding: "48px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          lineHeight: 1.7,
        }}
      >
        <a
          href="/"
          style={{
            color: "#43b8ff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← AxiomAI Solutions
        </a>

        <h1
          style={{
            fontSize: "42px",
            marginBottom: "8px",
          }}
        >
          Terms and Conditions
        </h1>

        <p style={{ color: "#9fb0c5" }}>
          Last updated: {updated}
        </p>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            These Terms and Conditions govern your use of services provided
            by AxiomAI Solutions LLC ("AxiomAI Solutions," "we," "us," or
            "our"), including our website, AxiomOS, artificial intelligence
            solutions, telecommunications services, CRM tools, and related
            services.
          </p>
        </section>

        <section>
          <h2>2. Services</h2>
          <p>
            AxiomAI Solutions provides technology, artificial intelligence,
            automation, software, communications, CRM, and related business
            solutions. Features and availability may vary depending on the
            customer's configuration and selected services.
          </p>
        </section>

        <section>
          <h2>3. SMS Messaging Program</h2>

          <p>
            AxiomAI Solutions may provide an SMS notification program for
            authorized users and administrators of AxiomOS.
          </p>

          <p>
            Messages may include operational account notifications such as
            new-call alerts, prospect follow-up reminders, CRM activity
            alerts, and other service-related notifications.
          </p>

          <p>
            Users may opt in by sending <strong>START</strong> to the
            designated AxiomAI Solutions messaging number.
          </p>

          <p>
            Message frequency varies based on account and CRM activity.
            Message and data rates may apply.
          </p>

          <p>
            Reply <strong>STOP</strong> at any time to unsubscribe. After
            opting out, you will no longer receive SMS messages unless you
            opt in again.
          </p>

          <p>
            Reply <strong>HELP</strong> for assistance.
          </p>

          <p>
            Consent to receive text messages is not a condition of purchasing
            any product or service from AxiomAI Solutions.
          </p>
        </section>

        <section>
          <h2>4. User Responsibilities</h2>
          <p>
            Users are responsible for providing accurate information,
            maintaining the confidentiality of account credentials, and
            using our services in accordance with applicable laws,
            regulations, and these Terms.
          </p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>
            You may not use AxiomAI Solutions services for unlawful,
            fraudulent, abusive, deceptive, or unauthorized purposes or in a
            manner that interferes with the security or operation of our
            systems.
          </p>
        </section>

        <section>
          <h2>6. Availability</h2>
          <p>
            We strive to provide reliable services but do not guarantee that
            every service will be uninterrupted, error-free, or available at
            all times. Services may depend on third-party networks,
            telecommunications carriers, cloud infrastructure, and other
            providers.
          </p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            To the extent permitted by applicable law, AxiomAI Solutions
            will not be liable for indirect, incidental, special,
            consequential, or punitive damages arising from the use or
            inability to use our services.
          </p>
        </section>

        <section>
          <h2>8. Privacy</h2>
          <p>
            Our collection and use of personal information is described in
            our{" "}
            <a
              href="/privacy"
              style={{ color: "#43b8ff" }}
            >
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these Terms periodically. Updated terms will be
            posted on this page with a revised effective date.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>

          <p>
            <strong>AxiomAI Solutions LLC</strong>
            <br />
            Website:{" "}
            <a
              href="https://axiomaisolutions.org"
              style={{ color: "#43b8ff" }}
            >
              axiomaisolutions.org
            </a>
            <br />
            Email:{" "}
            <a
              href="mailto:axiomaisolutionspr@gmail.com"
              style={{ color: "#43b8ff" }}
            >
              axiomaisolutionspr@gmail.com
            </a>
          </p>
        </section>

        <hr
          style={{
            margin: "40px 0",
            border: 0,
            borderTop: "1px solid #193654",
          }}
        />

        <p style={{ color: "#8ca0b8", fontSize: "14px" }}>
          © 2026 AxiomAI Solutions LLC. All rights reserved.
        </p>
      </div>
    </main>
  );
}