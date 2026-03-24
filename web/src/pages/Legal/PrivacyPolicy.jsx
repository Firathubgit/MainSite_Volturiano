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
          <p className={s.lastUpdated}>Last updated: March 2026</p>
        </header>

        <section className={s.section}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to Volturiano. We respect your privacy and are committed to protecting your personal data. 
            This Privacy Policy will inform you as to how we look after your personal data when you visit our 
            website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
          </p>
          <p>
            <strong>Data Controller:</strong> Firat Kaya (trading as Volturiano)<br/>
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
          </ul>
        </section>

        <section className={s.section}>
          <h2>3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul>
            <li><strong>Performance of Contract:</strong> Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing AI website generation).</li>
            <li><strong>Legal Obligation:</strong> Where we need to comply with a legal obligation (e.g., retaining transaction data for 7 years according to the Swedish Accounting Act / Bokföringslagen).</li>
            <li><strong>Legitimate Interests:</strong> Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>4. Third-Party Data Processors</h2>
          <p>We utilize trusted third-party services to operate Volturiano. We have signed Data Processing Agreements with these sub-processors:</p>
          <ul>
            <li><strong>Supabase:</strong> For secure database hosting and user authentication (EU/Global).</li>
            <li><strong>Stripe:</strong> For payment processing.</li>
            <li><strong>Vercel:</strong> For frontend hosting and global content delivery.</li>
            <li><strong>AI Providers (Anthropic, OpenAI, Google):</strong> For executing AI generation based on your prompts. Our agreements specify a <strong>Zero Data Retention</strong> policy, meaning your prompts are not used to train their public AI models.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>5. Data Security & Retention</h2>
          <p>
            We have put in place appropriate security measures (such as Row Level Security) to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way.
          </p>
          <p>
            We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for. If you delete your account, your projects, websites, and profile data are securely wiped. Financial transaction records are retained for 7 years strictly for tax and accounting purposes.
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
      </main>
    </div>
  );
}
