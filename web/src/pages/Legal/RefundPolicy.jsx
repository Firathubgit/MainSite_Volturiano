import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ReceiptTextIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

export default function RefundPolicy() {
  return (
    <div className={s.container}>
      <div className={s.ambientBg}>
        <div className={s.blob1} />
        <div className={s.blob2} />
      </div>

      <nav className={s.nav}>
        <Link to="/builder" className={s.backBtn}>
          <ChevronLeftIcon size={16} />
          Back to Volturiano Builder
        </Link>
      </nav>

      <main className={s.content}>
        <header className={s.header}>
          <div className={s.iconWrapper}>
            <ReceiptTextIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Refund Policy</h1>
          <p className={s.lastUpdated}>Last updated: May 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Scope</h2>
          <p>
            This Refund Policy describes how refunds are handled for purchases made on Volturiano,
            including credit packs, subscriptions, and one-time charges. It supplements the{' '}
            <Link to="/builder/terms">Terms of Service</Link>. Mandatory rights under applicable
            consumer protection law (in particular Swedish Distansavtalslagen and EU Directive
            2011/83/EU) are not limited by this policy.
          </p>
        </section>

        <section className={s.section}>
          <h2>2. EU/EEA Consumer Withdrawal Right (14 Days)</h2>
          <p>
            If you are a consumer in the EU/EEA, you have a right to withdraw from a contract for paid
            digital content or services within 14 days of purchase, without giving any reason. To
            exercise this right, send a clear statement (for example by email to{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>)
            within 14 days of the order.
          </p>
          <h3>2.1 Express Consent and Waiver of Withdrawal</h3>
          <p>
            By starting AI generation, consuming credits, publishing a site, downloading exported
            project archives, or otherwise using paid features before the 14-day period ends, you:
          </p>
          <ul>
            <li>expressly request that performance of the digital content/service starts during the withdrawal period; and</li>
            <li>acknowledge that you will lose your right of withdrawal once the digital content/service has been fully provided.</li>
          </ul>
          <p>
            For credits already consumed, sites already generated and delivered, and exports already
            downloaded, the right of withdrawal does not apply once performance has been completed at
            your express request. Unused portions remain refundable within the 14-day window unless
            cancelled or used.
          </p>
          <h3>2.2 How Refunds are Issued</h3>
          <p>
            Refunds are issued via Stripe to the original payment method, normally within 14 days of
            the refund decision. We may withhold the refund until we have received the request and
            confirmed eligibility.
          </p>
        </section>

        <section className={s.section}>
          <h2>3. Credit Packs</h2>
          <p>
            Credits are virtual units consumed when you run AI generation, sandbox builds, or related
            paid operations. Used credits are generally non-refundable because provider costs (AI
            inference, sandbox time, storage) are incurred when the work is performed. Unused credits
            from a recent purchase may be eligible for a refund where:
          </p>
          <ul>
            <li>you exercise the EU/EEA 14-day withdrawal right and have not started performance, or</li>
            <li>the credits were sold but cannot be delivered or used due to a defect on our side, or</li>
            <li>we agree to a goodwill refund at our discretion.</li>
          </ul>
          <p>
            We may decline refunds where credits were used, transferred, abused, disputed, or connected
            to policy violations (including chargebacks, fraud signals, or suspended accounts).
          </p>
        </section>

        <section className={s.section}>
          <h2>4. Subscriptions</h2>
          <p>
            Subscription fees are charged in advance and recur until cancelled. Cancelling a
            subscription stops the next renewal but does not, by default, refund the current period.
            Access and included monthly credits typically remain available until the end of the paid
            period unless the account is suspended for abuse, fraud, security, or legal reasons.
          </p>
          <p>
            For EU/EEA consumers, the 14-day withdrawal right applies to a new subscription unless
            performance has been fully provided and the waiver in section 2.1 applies.
          </p>
        </section>

        <section className={s.section}>
          <h2>5. Refund Requests</h2>
          <p>
            You can request a refund from the dashboard&rsquo;s billing area or by contacting{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>{' '}
            with your account email, the relevant transaction or invoice ID, and a brief reason. Each
            request is reviewed on a case-by-case basis and tracked in our internal refund register
            against the credit ledger and Stripe records.
          </p>
        </section>

        <section className={s.section}>
          <h2>6. Disputes and Chargebacks</h2>
          <p>
            If you initiate a chargeback or payment dispute through your bank or card issuer instead
            of contacting us first, we may pause access to the related credits, subscription benefits,
            or published assets while the dispute is investigated. Resolved disputes are reconciled
            against the credit ledger; reversals of credits and subscription benefits are handled
            automatically by the webhook ledger and may be reflected in your billing history.
          </p>
        </section>

        <section className={s.section}>
          <h2>7. Taxes</h2>
          <p>
            Where required, refunds include any VAT or equivalent tax that was charged. Tax handling
            is determined by your location and customer type at the time of the original purchase.
          </p>
        </section>

        <section className={s.section}>
          <h2>8. Contact</h2>
          <p>
            For refund and billing questions, contact{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
            For consumer dispute resolution, EU consumers may also use the European Commission online
            dispute platform at{' '}
            <a className={s.termsLink} href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
