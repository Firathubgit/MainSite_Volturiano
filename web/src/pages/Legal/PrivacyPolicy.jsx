import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ShieldIcon } from 'lucide-react';
import s from './LegalLayout.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={s.container}>
      {/* Background decorations */}
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
            <ShieldIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Privacy Policy & Cookie Policy</h1>
          <p className={s.lastUpdated}>Last updated: 24 May 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to Volturiano. We respect your privacy and are committed to protecting your personal data. 
            This Privacy Policy will inform you as to how we look after your personal data when you visit our 
            website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
          </p>
          <p>
            <strong>Data Controller:</strong> Firat Kaya, sole trader (enskild firma), Sweden, trading as Volturiano<br/>
            <strong>Contact:</strong> contact@volturiano.com
          </p>
        </section>

        <section className={s.section}>
          <h2>2. The Data We Collect</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul>
            <li><strong>Identity Data:</strong> First name, last name, username, title.</li>
            <li><strong>Contact Data:</strong> Email address.</li>
            <li><strong>Financial Data:</strong> We do not store credit card numbers. All payments are processed securely via Stripe. We only store payment IDs and reference keys.</li>
            <li><strong>Transaction Data:</strong> Details about payments to and from you and other details of products and services you have purchased from us (e.g. Credit Packs, Subscriptions).</li>
            <li><strong>Technical Data:</strong> Internet protocol (IP) address, your login data, browser type and version, time zone setting, location, security fingerprints, and usage patterns for rate limiting.</li>
            <li><strong>Usage Data:</strong> Information about how you use our website, products and services, including chat prompts sent to our AI models.</li>
            <li><strong>Builder and Agent Data:</strong> Project prompts, generated files, snapshots, selected components, agent messages, tool events, sandbox identifiers, preview URLs, provider capability metadata, build status, error diagnostics, and audit events needed to provide, debug, secure, and improve the Builder.</li>
            <li><strong>Consent and Rights Request Data:</strong> Records of terms/privacy acceptance, data export requests, deletion requests, and processing restriction requests.</li>
            <li><strong>Publishing Integration Data:</strong> When you connect a GitHub account to publish a project, we store your GitHub user id, GitHub username, the OAuth scopes you granted, and an access token that we encrypt at rest using AES-256-GCM. We also store the repository owner, repository name, branch, last commit SHA, and Vercel import URL associated with each project you publish.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul>
            <li><strong>Performance of Contract:</strong> Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing AI website generation).</li>
            <li><strong>Legal Obligation:</strong> Where we need to comply with a legal obligation, including retaining accounting evidence where required by Swedish bookkeeping rules.</li>
            <li><strong>Legitimate Interests:</strong> Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li><strong>Consent:</strong> Where we rely on consent for optional analytics/performance cookies and specific optional choices. Terms/privacy acceptance, community attestation evidence, and security records may also be stored where needed for contract, legal, or legitimate-interest reasons.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>4. Third-Party Data Processors</h2>
          <p>We utilize third-party services to operate Volturiano. We keep a separate subprocessor register and verify provider terms, regions, and retention settings as part of production readiness:</p>
          <ul>
            <li><strong>Supabase:</strong> For secure database hosting and user authentication (EU/Global).</li>
            <li><strong>Stripe:</strong> For payment processing.</li>
            <li><strong>Railway/Vercel:</strong> For backend/frontend hosting, deployment, and content delivery. Vercel additionally hosts websites that you publish through the &ldquo;Publish to Vercel&rdquo; flow once you complete the import on Vercel&apos;s side.</li>
            <li><strong>GitHub:</strong> Used only when you opt in to the publish flow. We use GitHub&apos;s OAuth and REST APIs to create or update a repository under your account with your project files. See section 9 below for details.</li>
            <li><strong>AI Providers and Sandbox Providers:</strong> For executing AI generation, analysis, previews, and code sandboxing based on your prompts and project context. Provider retention and training settings depend on the configured provider agreements and product settings.</li>
            <li><strong>Open-source and Component Ecosystem:</strong> The Builder may use open-source packages, public registries, component metadata, and community-submitted components to assemble your website. License notices and component metadata may be stored with projects or exports where needed.</li>
          </ul>
          <p>
            See the <Link to="/builder/subprocessors">Subprocessor Register</Link> for the current operational list.
          </p>
        </section>

        <section className={s.section}>
          <h2>5. Data Security & Retention</h2>
          <p>
            We have put in place appropriate security measures (such as Row Level Security) to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.
          </p>
          <p>
            We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for. If you delete your account, user-scoped profile, project, website, snapshot, and agent data is deleted or anonymized from active systems where technically and legally possible. Backup copies, provider logs, security logs, audit evidence, and financial transaction records may remain until their normal retention period expires. Financial transaction records are retained for 7 years where required for Swedish bookkeeping, tax, refund, dispute, and accounting purposes.
          </p>
          <p>
            Data exports and deletion requests are logged so we can prove when a request was received and completed. Agent/session data, snapshots, and generated project data are included in account exports where available. Account deletion removes or anonymizes user-scoped data while preserving financial ledger evidence where legally required.
          </p>
          <p>
            Agentic builder runs may generate operational logs such as tool names, file paths, sandbox
            status, build errors, package installation results, and preview health results. We use these
            records to show progress in the Builder, support undo/session hydration, diagnose failures,
            prevent abuse, and improve reliability. We avoid intentionally logging access tokens,
            payment credentials, and local environment files, but you should not include secrets in
            prompts or project files unless necessary for your own use case.
          </p>
        </section>

        <section className={s.section}>
          <h2>6. Your Legal Rights (GDPR)</h2>
          <p>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
          <ul>
            <li>Request access to your personal data (Right to Access).</li>
            <li>Request correction of your personal data (Right to Rectification).</li>
            <li>Request erasure of your personal data (Right to be Forgotten).</li>
            <li>Object to processing of your personal data.</li>
            <li>Request restriction of processing your personal data.</li>
            <li>Request transfer of your personal data (Data Portability).</li>
            <li>Right to withdraw consent.</li>
            <li>Right not to be subject to a decision based solely on automated processing, including profiling (Automated Decision-Making).</li>
          </ul>
          <p>To exercise any of these rights, please contact us at our support email or use the account deletion functionality in your dashboard.</p>
          <p>You also have the right to make a complaint at any time to the Swedish Authority for Privacy Protection (Integritetsskyddsmyndigheten, IMY).</p>
        </section>

        <section className={s.section}>
          <h2>7. Automated Decision-Making</h2>
          <p>
            Volturiano Builder utilizes Artificial Intelligence (AI) to generate code and content based on your prompts. However, we do not 
            use your personal data for automated decision-making that produces legal effects or similarly significantly affects you. 
            The AI serves as a creative tool under your control.
          </p>
        </section>

        <section className={s.section}>
          <h2>8. Cookie Policy</h2>
          <p>Our website uses essential and non-essential cookies. You can manage these preferences via our Cookie Banner.</p>
          <ul>
            <li><strong>Essential Cookies:</strong> Used for keeping you logged in securely (Supabase session tokens). Cannot be disabled.</li>
            <li><strong>Analytics Cookies:</strong> (E.g., Vercel Analytics). These are only active if you explicitly click "Accept" in the cookie banner.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>9. GitHub Publishing Integration</h2>
          <p>
            Volturiano provides an optional &ldquo;Publish to Vercel&rdquo; flow that requires you to connect a GitHub
            account so we can create or update a repository on your behalf. This integration uses a dedicated GitHub
            OAuth App that is separate from any &ldquo;Sign in with GitHub&rdquo; you may have used to log in.
          </p>
          <p><strong>What we store:</strong> your GitHub user id, your GitHub username, the OAuth scopes you granted
            (typically <code>repo</code> and <code>user:email</code>), and an access token that we encrypt with
            AES-256-GCM before persisting it. For each published project we additionally store the repository owner,
            repository name, target branch (<code>main</code> by default), the SHA of the last commit we pushed, the
            Vercel import URL, and the timestamp of the last push.
          </p>
          <p><strong>What we do with the access token:</strong> we use it only when you explicitly click
            &ldquo;Publish to Vercel&rdquo; in the Builder, and only to (a) create a repository under your GitHub
            account if it does not yet exist, and (b) push the contents of your active sandbox to that repository.
            We do not browse, modify, or read any other repository on your account.
          </p>
          <p><strong>How to disconnect:</strong> the &ldquo;Disconnect&rdquo; control inside the Publish modal
            removes the encrypted token from our database and best-effort revokes the OAuth grant on
            github.com so nothing remains on either side. You can revoke the grant directly at any time from
            <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer"> github.com/settings/applications</a>.
          </p>
          <p><strong>What we do not store:</strong> we do not commit, log, or copy any <code>.env</code> files or
            other secrets you keep locally in your sandbox &mdash; the publish flow excludes them via a
            generated <code>.gitignore</code>. We also never log your access token in plaintext.
          </p>
        </section>

        <section className={s.section}>
          <h2>10. Customer Website Data</h2>
          <p>
            If you use Volturiano to create or publish a site that collects personal data from your own visitors,
            you are responsible for the privacy notice, cookie choices, form purposes, and lawful basis for that
            visitor data. Volturiano may act as your processor for that customer-controlled processing.
          </p>
          <p>
            See the <Link to="/builder/dpa">Data Processing Addendum</Link> and <Link to="/builder/customer-responsibilities">Customer Responsibilities</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
