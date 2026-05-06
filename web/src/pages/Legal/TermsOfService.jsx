import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, FileTextIcon } from 'lucide-react';
import s from './LegalLayout.module.css';

export default function TermsOfService() {
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
            <FileTextIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Terms of Service</h1>
          <p className={s.lastUpdated}>Last updated: May 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Introduction and Acceptance</h2>
          <p>
            Welcome to Volturiano (the &ldquo;Service&rdquo;), an AI-powered website builder operated by
            Firat Kaya, sole trader (enskild firma), Sweden (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;Volturiano&rdquo;). By creating an account, accessing, or using the Service, you accept
            these Terms of Service, the <Link to="/builder/privacy">Privacy Policy</Link>, the{' '}
            <Link to="/builder/acceptable-use">Acceptable Use Policy</Link>, and the{' '}
            <Link to="/builder/refunds">Refund Policy</Link>. If you do not agree, do not use the Service.
          </p>
          <p>
            We may update these Terms. Material changes will be communicated via the dashboard or email
            with reasonable notice. Continued use after the effective date constitutes acceptance.
          </p>
        </section>

        <section className={s.section}>
          <h2>2. Service Description and Eligibility</h2>
          <p>
            Volturiano is an AI-powered website builder that generates, hosts, and exports frontend code,
            components, templates, and entire sites based on user input. Output is produced by large
            language models, sandboxed code execution, and a curated component catalog with both official
            and community-contributed components.
          </p>
          <p>
            You must be at least 18 years old (or the legal age of majority in your jurisdiction) to use
            the Service. Users between 16 and 18 may be permitted to use the Service only with verifiable
            parental or guardian consent and only where local law allows. The Service is not directed to
            children under 16.
          </p>
          <p>
            If you use the Service for or on behalf of a company, partnership, agency, or other
            organization (&ldquo;Customer&rdquo;), you represent that you are authorized to bind that
            organization to these Terms.
          </p>
        </section>

        <section className={s.section}>
          <h2>3. Accounts and Security</h2>
          <p>
            You must provide accurate registration data, keep credentials confidential, and notify us
            promptly of any suspected unauthorized access. You are responsible for all activity on your
            account, including activity by team members, agents, or anyone you permit to use it.
          </p>
          <p>
            We may suspend, restrict, or terminate accounts that violate these Terms, the Acceptable Use
            Policy, applicable law, or that pose a security, payment, or fraud risk.
          </p>
        </section>

        <section className={s.section}>
          <h2>4. Acceptable Use</h2>
          <p>
            You agree not to use the Service to generate, distribute, host, or publish content that is
            unlawful, infringes third-party rights, exposes us to legal risk, or otherwise violates the{' '}
            <Link to="/builder/acceptable-use">Acceptable Use Policy</Link>. Examples of prohibited use
            include but are not limited to:
          </p>
          <ul>
            <li>Content that is unlawful, harmful, threatening, abusive, harassing, defamatory, hateful, or discriminatory.</li>
            <li>Content that infringes copyright, trademark, design right, publicity right, or privacy right.</li>
            <li>Malicious code, credential theft, exfiltration, scraping, brute-forcing, or bot abuse.</li>
            <li>Bypassing credit limits, rate limits, sandbox boundaries, payment systems, or moderation systems.</li>
            <li>Impersonating a person, company, or public authority without authorization.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>5. Billing, Credits, Subscriptions, and Taxes</h2>
          <p>
            The Service is provided on a paid basis through credit packs and subscriptions. Payments are
            processed by Stripe. Prices are displayed in the relevant checkout flow. Applicable VAT and
            other taxes are determined by your location and the type of customer (consumer or business)
            and are added or included as required by law.
          </p>
          <ul>
            <li><strong>Credits:</strong> Credits are virtual units used to fund AI generation, sandbox time, and related operations. Credits are non-transferable.</li>
            <li><strong>Used credits:</strong> Used credits are generally non-refundable because provider costs (AI inference, sandbox time, storage) are incurred when work is performed.</li>
            <li><strong>Subscriptions:</strong> Subscription fees are charged in advance for the upcoming billing period and recur until cancelled. Cancellation takes effect at the end of the current period unless otherwise stated.</li>
            <li><strong>Failed payments:</strong> We may suspend, downgrade, or restrict the account if a payment fails or is reversed (refund, chargeback, dispute).</li>
            <li><strong>Refunds and disputes:</strong> See the <Link to="/builder/refunds">Refund Policy</Link>. EU/EEA consumer withdrawal rights and waiver are described there.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>6. Consumer Rights (EU/EEA)</h2>
          <p>
            If you are a consumer in the EU/EEA, you may have the right to withdraw from a contract for
            paid digital content or services within 14 days of purchase under Directive 2011/83/EU. Where
            you expressly request that we begin performance during the withdrawal period and acknowledge
            that you lose the right to withdraw once the digital content/service has been fully provided,
            this right may not apply once the service has been fully performed. By starting AI generation,
            consuming credits, publishing a site, or downloading generated artifacts, you confirm that you
            understand and accept this waiver where applicable. See the{' '}
            <Link to="/builder/refunds">Refund Policy</Link> for details.
          </p>
        </section>

        <section className={s.section}>
          <h2>7. Intellectual Property</h2>
          <h3>7.1 Your Inputs and Output</h3>
          <p>
            You retain rights in the prompts, images, text, code, and other inputs you provide
            (&ldquo;Inputs&rdquo;). Subject to your compliance with these Terms and payment, you own the
            generated frontend code, components, and assets produced specifically for your project
            (&ldquo;Output&rdquo;), excluding (i) third-party libraries that have their own licenses, (ii)
            community-contributed components which remain under their respective licenses, and (iii) the
            Volturiano platform, brand, runtime helpers, and stamp.
          </p>
          <h3>7.2 Volturiano Platform</h3>
          <p>
            The Service, the underlying software, the component catalog metadata, the AI selection
            tooling, the brand, and the &ldquo;Volturiano&rdquo; stamp are owned by Volturiano. Nothing in
            these Terms transfers ownership of the platform itself.
          </p>
          <h3>7.3 Community Submissions</h3>
          <p>
            By submitting a component, template, or other contribution to the community catalog, you
            represent that (a) you own or have all rights necessary to submit and license the
            contribution, (b) the contribution does not infringe any third party&rsquo;s intellectual
            property, privacy, publicity, or other rights, and (c) the contribution complies with the
            Acceptable Use Policy. You grant Volturiano a worldwide, non-exclusive, royalty-free,
            sublicensable license to host, store, display, modify, distribute, run, analyze, categorize,
            translate, and recombine the contribution as part of the Service, including making it
            available to other users of the Service through the AI agent and component catalog.
          </p>
        </section>

        <section className={s.section}>
          <h2>8. AI Output and No Guarantees</h2>
          <p>
            AI-generated output may be inaccurate, incomplete, similar to existing designs, contain
            broken or unsafe code, or include third-party brand references. You are solely responsible
            for reviewing, testing, and validating output before using it commercially or publishing it.
            Volturiano does not guarantee that output is unique, original, non-infringing, accessible,
            secure, performant, or fit for any specific regulated purpose. Output is provided as a tool
            that operates under your direction.
          </p>
          <p>
            Where applicable law requires disclosure that content was generated or assisted by AI, you
            are responsible for that disclosure on your own published sites.
          </p>
        </section>

        <section className={s.section}>
          <h2>9. Moderation, Notices, and Takedowns</h2>
          <p>
            We provide a public notice and takedown intake at the{' '}
            <Link to="/builder/takedown">Takedown Request</Link> page. We may, at our discretion, flag,
            hide, archive, restrict, or remove content, components, templates, accounts, or published
            sites where we receive a credible notice or where action is needed for security, abuse
            prevention, billing integrity, legal compliance, or enforcement of these Terms.
          </p>
          <p>
            We operate a repeat-infringer policy. Accounts associated with repeated infringement,
            harassment, malicious code, or other serious abuse may be suspended or terminated, with
            decisions logged for auditability.
          </p>
        </section>

        <section className={s.section}>
          <h2>10. Privacy, Data, and Customer Data</h2>
          <p>
            Volturiano processes personal data as described in the{' '}
            <Link to="/builder/privacy">Privacy Policy</Link>. Where you use Volturiano to create or host
            sites that process personal data of your own end-users (&ldquo;Customer Data&rdquo;), the{' '}
            <Link to="/builder/dpa">Data Processing Addendum</Link> applies and forms part of these
            Terms. You remain responsible for the privacy notices, lawful basis, cookie compliance, and
            processing decisions on your own published sites; see the{' '}
            <Link to="/builder/customer-responsibilities">Customer Responsibilities</Link>.
          </p>
        </section>

        <section className={s.section}>
          <h2>11. Confidentiality</h2>
          <p>
            Each party may have access to non-public information of the other (&ldquo;Confidential
            Information&rdquo;). Each party will use Confidential Information only to perform under these
            Terms, protect it with reasonable safeguards, and not disclose it except to personnel and
            subprocessors bound by confidentiality, or where required by law.
          </p>
        </section>

        <section className={s.section}>
          <h2>12. Warranties and Disclaimers</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; to the maximum
            extent permitted by law. Except as expressly stated, Volturiano disclaims all warranties,
            including merchantability, fitness for a particular purpose, non-infringement, accuracy of
            AI output, and uninterrupted or error-free operation. Mandatory consumer warranties under
            applicable law (including Swedish consumer law where relevant) are not affected by this
            section.
          </p>
        </section>

        <section className={s.section}>
          <h2>13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, in no event shall Volturiano, its operators,
            contractors, or partners be liable for any indirect, incidental, special, consequential,
            exemplary, or punitive damages, or for loss of profits, revenue, data, goodwill, or business
            opportunities, arising out of or relating to the Service. Volturiano&rsquo;s aggregate
            liability for any claim arising out of or relating to these Terms or the Service is limited
            to the greater of (i) one hundred euro (EUR 100) or (ii) the fees you paid to Volturiano in
            the 12 months immediately preceding the event giving rise to the claim. Nothing in these
            Terms limits liability that cannot be limited under applicable law (including liability for
            gross negligence, intentional misconduct, or mandatory consumer rights).
          </p>
        </section>

        <section className={s.section}>
          <h2>14. Indemnification</h2>
          <p>
            You will indemnify and hold harmless Volturiano from and against any third-party claims,
            damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of
            (a) your Inputs, prompts, generated sites, community submissions, or published content, (b)
            your breach of these Terms or applicable law, or (c) your infringement of third-party rights.
            This section does not apply to the extent such claims arise solely from Volturiano&rsquo;s
            own breach of these Terms.
          </p>
        </section>

        <section className={s.section}>
          <h2>15. Account Data, Export, and Deletion</h2>
          <p>
            You may export and delete your account data from the dashboard. Deletion removes or
            anonymizes user-scoped data where technically and legally possible. Financial transaction
            records, refund/dispute records, audit evidence, security logs, and other records we must
            retain for accounting (Swedish bookkeeping requires retention of accounting evidence for
            seven years), tax, security, abuse prevention, or legal reasons may be preserved in
            minimized form.
          </p>
        </section>

        <section className={s.section}>
          <h2>16. Suspension and Termination</h2>
          <p>
            We may suspend or terminate your access for breach of these Terms, fraud, abuse, payment
            failure, security risk, or where required by law. You may close your account at any time via
            the dashboard. Provisions that by their nature should survive termination (including
            sections on intellectual property, confidentiality, disclaimers, limitation of liability,
            indemnification, and governing law) survive.
          </p>
        </section>

        <section className={s.section}>
          <h2>17. Force Majeure</h2>
          <p>
            Neither party is liable for failure or delay in performance to the extent caused by events
            beyond its reasonable control, such as natural disasters, war, civil unrest, government
            action, internet or third-party provider outages, or labor disputes.
          </p>
        </section>

        <section className={s.section}>
          <h2>18. Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of Sweden, excluding its conflict-of-laws rules and the
            UN Convention on Contracts for the International Sale of Goods. Disputes will be resolved by
            the courts of Sweden, with venue in the Stockholm District Court (Stockholms tingsr&auml;tt),
            unless mandatory consumer protection law gives a consumer the right to bring proceedings in
            their place of residence. EU consumers may also use the European Commission&rsquo;s online
            dispute resolution platform at{' '}
            <a className={s.termsLink} href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
          </p>
        </section>

        <section className={s.section}>
          <h2>19. Miscellaneous</h2>
          <p>
            These Terms, together with the Privacy Policy, Acceptable Use Policy, Refund Policy, Data
            Processing Addendum, Subprocessor Register, and any order forms, form the entire agreement
            between you and Volturiano regarding the Service. If any provision is held unenforceable,
            the remaining provisions remain in effect. We may assign these Terms as part of a merger,
            acquisition, reorganization, or sale of assets; you may not assign without our written
            consent. No waiver of any provision is a waiver of any other provision.
          </p>
          <p>
            Contact: <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
            Security and abuse reports: see the <Link to="/builder/security">Security and Abuse Contact</Link> page.
          </p>
        </section>
      </main>
    </div>
  );
}
