import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ClipboardCheckIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

export default function CustomerResponsibilities() {
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
            <ClipboardCheckIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Customer Responsibilities</h1>
          <p className={s.lastUpdated}>Last updated: May 2026</p>
        </header>

        <section className={s.section}>
          <h2>Before Publishing</h2>
          <ul>
            <li>Review generated copy, code, images, logos, brand names, and claims for accuracy and rights.</li>
            <li>Add privacy, cookie, terms, contact, company, and refund information required for your own site.</li>
            <li>Confirm that forms, analytics, tracking, newsletter tools, and embedded services have a lawful basis.</li>
            <li>Test accessibility, mobile layout, security, links, and checkout/contact flows before going live.</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2>Visitor Data</h2>
          <p>
            If your published site collects visitor personal data, you decide the purpose and lawful basis for
            that processing. Volturiano can provide the hosting/building tools, but you remain responsible for
            your visitor-facing notices and compliance choices.
          </p>
        </section>
      </main>
    </div>
  );
}
