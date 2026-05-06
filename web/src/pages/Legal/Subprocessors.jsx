import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, NetworkIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

const REGISTER_VERSION = "2026-05-06";

const processors = [
  {
    name: "Supabase",
    purpose: "Database, authentication, storage of user accounts, projects, components, and published-site files",
    location: "Region selected in the Volturiano Supabase project (EU where available)",
    data: "Account identifiers, profile fields, project metadata, prompts, generated files, published-site files",
    transfer: "GDPR-compliant subprocessor terms; transfer mechanisms per Supabase DPA"
  },
  {
    name: "Stripe",
    purpose: "Payments, invoices, subscriptions, refunds, and dispute handling",
    location: "Stripe global infrastructure (EU/US)",
    data: "Payment references, invoice IDs, customer/subscription IDs, billing email, country, taxes",
    transfer: "Stripe DPA and Standard Contractual Clauses"
  },
  {
    name: "Railway (or equivalent backend host)",
    purpose: "Backend hosting, deployment, container runtime",
    location: "Configured deployment region",
    data: "Server logs, runtime traffic, environment metadata",
    transfer: "Provider DPA where available"
  },
  {
    name: "Vercel",
    purpose: "Frontend hosting, edge delivery, optional analytics/speed insights, and the destination of user-initiated deployments via the Builder's \"Publish to Vercel\" flow",
    location: "Vercel global edge",
    data: "Frontend asset delivery, optional analytics events when explicitly accepted, and (for user-initiated publish actions) the GitHub repository URL the user chooses to import",
    transfer: "Vercel DPA and Standard Contractual Clauses"
  },
  {
    name: "GitHub, Inc. (Microsoft)",
    purpose: "Source-code hosting for the Builder's optional \"Publish to Vercel\" flow. Used only when the user explicitly connects a GitHub account and clicks Publish, to create or update a repository under the user's own account.",
    location: "GitHub global infrastructure (primarily US)",
    data: "GitHub user id, GitHub username, granted OAuth scopes, an access token (encrypted at rest with AES-256-GCM), and the project files the user chooses to push (excluding .env files and other secrets via a generated .gitignore)",
    transfer: "GitHub DPA and Standard Contractual Clauses"
  },
  {
    name: "AI providers (Google AI / OpenAI / Anthropic, as configured)",
    purpose: "AI generation, classification, planning, polishing, and analysis based on user prompts",
    location: "Provider-specific regions per the active configuration",
    data: "Prompts, project context, optional images, generated content",
    transfer: "Provider DPAs and Standard Contractual Clauses; default zero-training/limited-retention configurations where supported"
  },
  {
    name: "E2B (or equivalent sandbox provider)",
    purpose: "Temporary code execution and previews of generated sites in isolated sandboxes",
    location: "Provider-specific regions per current configuration",
    data: "Project files, runtime metadata, build logs",
    transfer: "Provider DPA where available"
  },
  {
    name: "Email/auth providers",
    purpose: "Magic-link delivery, account notifications, transactional emails",
    location: "Provider-specific infrastructure",
    data: "Email addresses, message content, delivery metadata",
    transfer: "Provider DPA where available"
  }
];

export default function Subprocessors() {
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
            <NetworkIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Subprocessor Register</h1>
          <p className={s.lastUpdated}>Register version: {REGISTER_VERSION}</p>
        </header>

        <section className={s.section}>
          <h2>Current Register</h2>
          <p>
            This page lists the subprocessors used to operate Volturiano. Each entry should be read
            together with the <Link to="/builder/dpa">Data Processing Addendum</Link> and the{' '}
            <Link to="/builder/privacy">Privacy Policy</Link>. Production configuration should be
            verified against the current deployment, contracts, and dashboard settings.
          </p>
        </section>

        <section className={s.section}>
          <h2>Subprocessors</h2>
          <ul>
            {processors.map((p) => (
              <li key={p.name} style={{ marginBottom: 18 }}>
                <strong>{p.name}</strong>
                <ul>
                  <li><em>Purpose:</em> {p.purpose}</li>
                  <li><em>Location:</em> {p.location}</li>
                  <li><em>Data categories:</em> {p.data}</li>
                  <li><em>Transfer basis:</em> {p.transfer}</li>
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.section}>
          <h2>Change Notification</h2>
          <p>
            We aim to publish material subprocessor changes (additions, removals, role changes) on
            this page before broad rollout where feasible. Customers can request advance notification
            by emailing{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>{' '}
            with the subject line <code>Subprocessor change updates</code>. Any objection to a new
            subprocessor can be raised by replying to that thread.
          </p>
        </section>

        <section className={s.section}>
          <h2>Contact</h2>
          <p>
            Privacy and processor questions:{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
            Security and abuse:{' '}
            <Link to="/builder/security">Security and Abuse Contact</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
