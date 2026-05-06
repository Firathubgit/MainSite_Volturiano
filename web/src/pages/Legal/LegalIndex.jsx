import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeftIcon,
  BookOpenIcon,
  FileTextIcon,
  ShieldIcon,
  ShieldAlertIcon,
  FileCheckIcon,
  NetworkIcon,
  ScaleIcon,
  ReceiptTextIcon,
  ClipboardCheckIcon,
  LockKeyholeIcon
} from "lucide-react";
import s from "./LegalLayout.module.css";

const documents = [
  {
    to: "/builder/terms",
    title: "Terms of Service",
    description: "Master agreement, eligibility, billing, IP, AI output, dispute handling, and governing law.",
    Icon: FileTextIcon
  },
  {
    to: "/builder/privacy",
    title: "Privacy Policy & Cookie Policy",
    description: "What personal data we collect, how we use it, GDPR rights, retention, cookie categories, and data subject requests.",
    Icon: ShieldIcon
  },
  {
    to: "/builder/acceptable-use",
    title: "Acceptable Use Policy",
    description: "What you cannot do on Volturiano. Includes the repeat-infringer policy and moderation handling.",
    Icon: ShieldAlertIcon
  },
  {
    to: "/builder/dpa",
    title: "Data Processing Addendum",
    description: "Processor terms for customers using Volturiano to process personal data of their own end-users.",
    Icon: FileCheckIcon
  },
  {
    to: "/builder/subprocessors",
    title: "Subprocessor Register",
    description: "Current list of subprocessors, regions, data categories, and transfer mechanisms.",
    Icon: NetworkIcon
  },
  {
    to: "/builder/takedown",
    title: "Takedown Request",
    description: "Submit a copyright, trademark, illegal-content, or abuse notice for review by the moderation queue.",
    Icon: ScaleIcon
  },
  {
    to: "/builder/refunds",
    title: "Refund Policy",
    description: "Refund handling for credit packs and subscriptions. EU/EEA 14-day withdrawal right and waiver explained.",
    Icon: ReceiptTextIcon
  },
  {
    to: "/builder/customer-responsibilities",
    title: "Customer Responsibilities",
    description: "What customers are responsible for when publishing sites that collect personal data.",
    Icon: ClipboardCheckIcon
  },
  {
    to: "/builder/security",
    title: "Security and Abuse Contact",
    description: "How to report security issues, expected response timeline, and responsible disclosure rules.",
    Icon: LockKeyholeIcon
  }
];

export default function LegalIndex() {
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
            <BookOpenIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Legal &amp; Trust Center</h1>
          <p className={s.lastUpdated}>All policies that govern your use of Volturiano</p>
        </header>

        <section className={s.section}>
          <h2>Policies</h2>
          <p>
            Volturiano operates an AI-powered website builder, a community component catalog, paid
            credits and subscriptions, and customer-published sites. Each of those touches a different
            legal regime. The documents below are the current operational policies. Material changes
            will be communicated through the dashboard or by email.
          </p>
          <ul>
            {documents.map(({ to, title, description, Icon }) => (
              <li key={to} style={{ marginBottom: 14 }}>
                <strong>
                  <Icon size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  <Link to={to} className={s.termsLink}>{title}</Link>
                </strong>
                <div style={{ opacity: 0.85, marginTop: 4 }}>{description}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.section}>
          <h2>Contact</h2>
          <p>
            General/privacy/billing:{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>.
            Security and abuse: <Link to="/builder/security">Security and Abuse Contact</Link>. Public
            takedown intake: <Link to="/builder/takedown">Takedown Request</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}
