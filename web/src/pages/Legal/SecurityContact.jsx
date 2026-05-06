import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, LockKeyholeIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

export default function SecurityContact() {
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
            <LockKeyholeIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Security and Abuse Contact</h1>
          <p className={s.lastUpdated}>Last updated: May 2026</p>
        </header>

        <section className={s.section}>
          <h2>How to Report</h2>
          <p>
            Send security, vulnerability, abuse, privacy, or account-safety reports to{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>{' '}
            with subject line <code>[SECURITY]</code>. Include:
          </p>
          <ul>
            <li>A clear description of the issue.</li>
            <li>Affected URLs, account identifiers, project IDs, and timestamps (in UTC where possible).</li>
            <li>Steps to reproduce the issue, where safe to share.</li>
            <li>Optional: PoC code, screenshots, or HTTP request examples.</li>
            <li>Whether you want public credit if a fix is published.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>Responsible Disclosure Rules</h2>
          <ul>
            <li>Do not access, modify, delete, exfiltrate, or disclose other users&rsquo; data while testing.</li>
            <li>Do not disrupt service availability, financial flows, or production data.</li>
            <li>Do not publicly disclose the issue before we have had a reasonable chance to investigate and patch.</li>
            <li>Stay within applicable law and the <Link to="/builder/acceptable-use">Acceptable Use Policy</Link>.</li>
          </ul>
          <p>
            Good-faith research that follows these rules and helps us protect users is welcome. We may
            suspend testing activity that risks customer data or service availability.
          </p>
        </section>

        <section className={s.section}>
          <h2>Expected Response Timeline</h2>
          <p>
            We aim for the following timelines; actual times depend on severity and capacity:
          </p>
          <ul>
            <li><strong>Acknowledgement:</strong> within 3 business days of a credible report.</li>
            <li><strong>Initial triage and severity rating:</strong> within 7 business days.</li>
            <li><strong>Mitigation or fix plan:</strong> communicated as soon as a credible mitigation is identified, prioritized by severity.</li>
            <li><strong>High/critical issues:</strong> handled as a high-priority incident with focused engineering attention.</li>
          </ul>
          <p>
            Confirmed data exposure, payment corruption, or cross-user access is escalated as a
            high-priority incident, preserved in audit evidence, and (where applicable) reported to
            data-protection authorities and affected users in line with GDPR breach notification
            requirements.
          </p>
        </section>

        <section className={s.section}>
          <h2>Out of Scope</h2>
          <ul>
            <li>Issues that require physical access or social engineering of personnel.</li>
            <li>Reports based purely on outdated software banners without a working PoC.</li>
            <li>Best-practice findings without a concrete security impact (low-priority hardening hints are still welcome but treated as non-bounty).</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>Other Channels</h2>
          <p>
            Public copyright, trademark, illegal-content, or platform-policy notices should be sent
            via the <Link to="/builder/takedown">Takedown Request</Link> page so they are routed into
            the moderation queue. Privacy and DPA contact:{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
