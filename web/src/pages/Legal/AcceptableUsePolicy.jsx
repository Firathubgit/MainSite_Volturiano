import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ShieldAlertIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

export default function AcceptableUsePolicy() {
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
            <ShieldAlertIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Acceptable Use Policy</h1>
          <p className={s.lastUpdated}>Last updated: 14 May 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Scope</h2>
          <p>
            This policy applies to prompts, generated sites, published sites, uploaded media,
            community components, templates, reports, and any other content submitted to or generated
            on Volturiano. It supplements the <Link to="/builder/terms">Terms of Service</Link>.
          </p>
        </section>

        <section className={s.section}>
          <h2>2. Prohibited Use</h2>
          <ul>
            <li>Illegal content, instructions, services, or transactions.</li>
            <li>Copyright, trademark, design right, privacy, or publicity-right infringement.</li>
            <li>Malware, credential theft, exfiltration, spam, phishing, scraping, or bot abuse.</li>
            <li>Harassment, hateful, discriminatory, sexually exploitative, or threatening content.</li>
            <li>Sexual content depicting minors or content that exploits, endangers, or sexualizes minors. This is reported to authorities where required.</li>
            <li>Fraud, deceptive monetization, money laundering, or sanctions evasion.</li>
            <li>Attempts to bypass credits, rate limits, moderation, security controls, sandbox boundaries, or audit logging.</li>
            <li>Publishing content that impersonates a company, person, or public authority without permission.</li>
            <li>Use that materially harms other users, third parties, or the integrity of the Service.</li>
            <li>Using the &ldquo;Publish to Vercel&rdquo; flow to push malware, phishing pages, spam, illegal content, content infringing third-party rights, or anything else prohibited by GitHub&apos;s or Vercel&apos;s terms of service.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>3. Community Submissions</h2>
          <p>
            Community components and templates must be original (or properly licensed for reuse) and
            safe to render. Submissions remain subject to review and may be rejected, flagged,
            archived, or removed at any time. Submitters confirm IP ownership and grant the community
            license described in the Terms of Service.
          </p>
        </section>

        <section className={s.section}>
          <h2>4. Reporting and Takedowns</h2>
          <p>
            Users can report a component from the catalog. Anyone can submit a copyright, trademark,
            illegal-content, or abuse notice via the public{' '}
            <Link to="/builder/takedown">Takedown Request</Link> page. Decisions on reports and
            takedowns are recorded with a statement of reasons in the audit log.
          </p>
        </section>

        <section className={s.section}>
          <h2>5. Repeat Infringer Policy</h2>
          <p>
            Volturiano enforces a repeat-infringer policy. Accounts associated with multiple confirmed
            infringements, malicious code submissions, doxxing, harassment, illegal content, or
            attempts to circumvent moderation may be subject to escalating action, including:
          </p>
          <ul>
            <li>Warning and removal of the offending content.</li>
            <li>Temporary submission, publishing, or AI-usage restrictions.</li>
            <li>Account suspension while an investigation is ongoing.</li>
            <li>Termination of the account, with or without notice depending on severity.</li>
            <li>Forwarding evidence to law enforcement or relevant authorities where legally required.</li>
          </ul>
          <p>
            Determinations are based on the seriousness of the conduct, the credibility of notices,
            the user&rsquo;s response, and any prior moderation history. Action taken under this
            section is logged in the audit trail.
          </p>
        </section>

        <section className={s.section}>
          <h2>6. Enforcement</h2>
          <p>
            We may restrict, suspend, remove, or preserve content where needed for security, legal
            compliance, abuse prevention, billing integrity, or investigation. Where action is taken,
            we will provide a statement of reasons in line with applicable platform regulation when
            feasible. Some restrictions may apply immediately to protect users or the Service.
          </p>
          <p>
            If you believe a moderation action was wrong, contact us with the affected account,
            component, project, site slug, or notice ID and the reason you believe the decision should
            be reviewed. We will review credible appeals in good faith and record the outcome.
          </p>
        </section>

        <section className={s.section}>
          <h2>7. Contact</h2>
          <p>
            Reports and abuse notices:{' '}
            <Link to="/builder/takedown">Takedown Request</Link> page or{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
            Security incidents: <Link to="/builder/security">Security and Abuse Contact</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
