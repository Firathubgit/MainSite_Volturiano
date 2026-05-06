import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, FileCheckIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

export default function DataProcessingAddendum() {
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
            <FileCheckIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Data Processing Addendum (DPA)</h1>
          <p className={s.lastUpdated}>Last updated: May 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Parties and Scope</h2>
          <p>
            This Data Processing Addendum (&ldquo;DPA&rdquo;) supplements the{' '}
            <Link to="/builder/terms">Terms of Service</Link> between Volturiano (Firat Kaya, sole
            trader (enskild firma), Sweden) (&ldquo;Volturiano&rdquo;, &ldquo;Processor&rdquo;) and the
            Customer (&ldquo;Customer&rdquo;, &ldquo;Controller&rdquo;) using the Volturiano AI website
            builder (the &ldquo;Service&rdquo;). This DPA applies to processing of personal data carried
            out on Customer&rsquo;s behalf in connection with the Service.
          </p>
        </section>

        <section className={s.section}>
          <h2>2. Roles</h2>
          <ul>
            <li><strong>Volturiano as controller</strong> for: account, billing, platform security, audit logs, abuse prevention, community moderation, AI safety, fraud detection, and service analytics.</li>
            <li><strong>Volturiano as processor</strong> for: personal data the Customer chooses to process through the Service for the Customer&rsquo;s own end-users (for example: text/images/forms/contact data hosted in published sites or kept in builder projects).</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>3. Processing Details</h2>
          <ul>
            <li><strong>Subject matter:</strong> AI website building, project storage, publishing, support, and security of Customer projects.</li>
            <li><strong>Duration:</strong> for the account term plus configured retention periods (and any legal hold).</li>
            <li><strong>Nature and purpose:</strong> hosting, generating, modifying, storing, exporting, publishing, displaying, analyzing, and securing Customer Data as needed to provide the Service.</li>
            <li><strong>Categories of data subjects:</strong> Customer&rsquo;s authorized users, end-users of Customer&rsquo;s published sites, community contributors, and visitors who interact with Customer-controlled features.</li>
            <li><strong>Categories of personal data:</strong> account identifiers, contact data, billing references, prompts, generated files, project metadata, logs, support reports, and any data the Customer chooses to include in projects or published sites.</li>
            <li><strong>Special categories:</strong> Customers are not authorized to upload or process special categories of personal data (Article 9 GDPR) or data subject to specific legal regimes (such as HIPAA / financial regulation) through the Service unless agreed in writing.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>4. Customer Instructions</h2>
          <p>
            Volturiano processes Customer Data only on documented instructions from the Customer,
            including those given through configuration choices in the dashboard, agent interactions,
            published-site choices, and these Terms. Customer is responsible for the lawfulness of
            those instructions, including the lawful basis for collecting and processing personal data
            via the published site, the privacy notice, cookie banner, and any consent capture for
            visitor-facing flows.
          </p>
        </section>

        <section className={s.section}>
          <h2>5. Confidentiality</h2>
          <p>
            Volturiano ensures that personnel authorized to process Customer Data are bound by
            appropriate confidentiality obligations and trained on relevant aspects of data protection
            and security.
          </p>
        </section>

        <section className={s.section}>
          <h2>6. Security and Technical/Organizational Measures (TOMs)</h2>
          <p>
            Volturiano implements appropriate technical and organizational measures considering the
            state of the art, the cost of implementation, and the nature, scope, context, and purposes
            of processing, including:
          </p>
          <ul>
            <li>Encryption in transit (TLS) for all API and dashboard traffic, and encryption at rest as provided by managed database, storage, and payment subprocessors.</li>
            <li>Authentication via Supabase Auth, including secure token handling and rejection of auth tokens passed via URL/query strings.</li>
            <li>Row Level Security (RLS) on database tables containing user-scoped data, ownership-verifying API guards on all writes, and admin verification via a dedicated admin role.</li>
            <li>Audit logging for sensitive admin, billing, moderation, and account actions; webhook event ledger for Stripe with signature verification and idempotent fulfillment.</li>
            <li>Rate limits, prompt-size caps, body-size caps, and abuse controls on AI, publishing, and community endpoints.</li>
            <li>Sandbox-based code execution for projects and previews, package whitelisting and dangerous-pattern scanning for community submissions, and pending-review queue before community items become live.</li>
            <li>Retention windows on agent messages, tool events, agent memory, and snapshots, with a scheduled purge function.</li>
            <li>Backup and restore tooling with documented restore drill steps, separate database and storage manifest backups.</li>
            <li>Principle of least privilege for service-role keys; secrets stored in environment variables, never in client bundles.</li>
            <li>Security and abuse contact channel and a public takedown intake.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>7. Data Subject Requests</h2>
          <p>
            Volturiano provides self-service export and deletion functionality from the dashboard.
            Where Customer needs assistance to respond to a data subject request related to Customer
            Data processed by Volturiano as processor, Volturiano will provide reasonable assistance
            taking into account the nature of processing and the information available.
          </p>
        </section>

        <section className={s.section}>
          <h2>8. Personal Data Breach Notification</h2>
          <p>
            Volturiano will notify Customer without undue delay (and in any event aim to notify within
            72 hours of becoming aware) of a confirmed personal data breach affecting Customer Data,
            and provide information reasonably required for Customer to meet its own breach
            notification obligations under GDPR Article 33 and 34.
          </p>
        </section>

        <section className={s.section}>
          <h2>9. Subprocessors</h2>
          <p>
            Customer authorizes Volturiano to engage subprocessors to provide the Service. The current
            register is maintained on the <Link to="/builder/subprocessors">Subprocessor Register</Link>{' '}
            page. Volturiano will (a) impose written contractual terms on subprocessors substantially
            consistent with this DPA, and (b) remain responsible for subprocessor performance.
            Material changes to the subprocessor list will be reflected on that page; Customers can
            object to a new subprocessor by contacting{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
          </p>
        </section>

        <section className={s.section}>
          <h2>10. International Transfers</h2>
          <p>
            Where personal data is transferred outside the EU/EEA, Volturiano relies on appropriate
            transfer mechanisms such as Standard Contractual Clauses or adequacy decisions, including
            those provided by subprocessors. Region selection (where supported by a subprocessor) is
            configured to keep relevant data within agreed regions where reasonably possible.
          </p>
        </section>

        <section className={s.section}>
          <h2>11. Audits</h2>
          <p>
            Volturiano will make available the information necessary to demonstrate compliance with
            this DPA and allow for and contribute to audits, including inspections, conducted by
            Customer or another auditor mandated by Customer, subject to confidentiality, reasonable
            notice, and security constraints. Audits typically rely on documentation, certifications
            from subprocessors, and answers to a security questionnaire.
          </p>
        </section>

        <section className={s.section}>
          <h2>12. Return and Deletion of Customer Data</h2>
          <p>
            On termination, Customer can export Customer Data via the dashboard. Volturiano will
            delete or anonymize Customer Data within a reasonable period, except where retention is
            required for legal, accounting, audit, security, or fraud-prevention reasons (for example
            financial transaction evidence retained for Swedish bookkeeping requirements).
          </p>
        </section>

        <section className={s.section}>
          <h2>13. Conflicts and Order of Precedence</h2>
          <p>
            In case of conflict between this DPA and the Terms of Service, this DPA governs to the
            extent of the conflict for matters relating to processing of personal data carried out by
            Volturiano on behalf of Customer.
          </p>
        </section>

        <section className={s.section}>
          <h2>14. Contact</h2>
          <p>
            Privacy and DPA contact:{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
