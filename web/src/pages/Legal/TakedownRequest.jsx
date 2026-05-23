import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ScaleIcon } from "lucide-react";
import s from "./LegalLayout.module.css";

const inputStyle = {
  width: "100%",
  marginTop: 8,
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#f8fafc",
  font: "inherit"
};

export default function TakedownRequest() {
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    componentId: "",
    submissionId: "",
    claimSummary: "",
    evidence: ""
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const evidence = form.evidence
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((value) => ({ type: "url_or_note", value }));

    try {
      const res = await fetch("/api/community/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: form.requesterName,
          requesterEmail: form.requesterEmail,
          componentId: form.componentId || null,
          submissionId: form.submissionId || null,
          claimSummary: form.claimSummary,
          evidence
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }
      setStatus({ ok: true, text: `Request received: ${data.takedownRequest?.id || "open"}` });
      setForm({ requesterName: "", requesterEmail: "", componentId: "", submissionId: "", claimSummary: "", evidence: "" });
    } catch (err) {
      setStatus({ ok: false, text: err.message || "Failed to submit request" });
    } finally {
      setSubmitting(false);
    }
  };

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
            <ScaleIcon size={32} className={s.icon} />
          </div>
          <h1 className={s.title}>Takedown Request</h1>
          <p className={s.lastUpdated}>Copyright, trademark, illegal content, or abuse reports</p>
        </header>

        <section className={s.section}>
          <h2>Submit a Notice</h2>
          <p>
            Use this form to report content you believe is unlawful, infringing, unsafe, or otherwise
            violates Volturiano policy. Include enough detail for us to locate and review the material.
            For a faster review, include the exact component ID, submission ID, published-site slug,
            URL, rights owner, legal basis, and evidence that supports the notice.
          </p>

          <form onSubmit={submit}>
            <label>
              <strong>Your name</strong>
              <input style={inputStyle} value={form.requesterName} onChange={update("requesterName")} />
            </label>
            <label>
              <strong>Email address</strong>
              <input style={inputStyle} type="email" required value={form.requesterEmail} onChange={update("requesterEmail")} />
            </label>
            <label>
              <strong>Component ID if known</strong>
              <input style={inputStyle} value={form.componentId} onChange={update("componentId")} />
            </label>
            <label>
              <strong>Submission ID if known</strong>
              <input style={inputStyle} value={form.submissionId} onChange={update("submissionId")} />
            </label>
            <label>
              <strong>Claim summary</strong>
              <textarea style={{ ...inputStyle, minHeight: 150 }} required value={form.claimSummary} onChange={update("claimSummary")} />
            </label>
            <label>
              <strong>Evidence, URLs, or notes</strong>
              <textarea style={{ ...inputStyle, minHeight: 110 }} value={form.evidence} onChange={update("evidence")} />
            </label>
            <button type="submit" disabled={submitting} className={s.backBtn}>
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>

          {status && (
            <p style={{ color: status.ok ? "#86efac" : "#fca5a5", marginTop: 16 }}>
              {status.text}
            </p>
          )}
          <p style={{ marginTop: 18 }}>
            If your own content was restricted and you want review of that decision, email{' '}
            <a className={s.termsLink} href="mailto:contact@volturiano.com">contact@volturiano.com</a>{' '}
            with the affected account, project, component, or notice ID.
          </p>
        </section>
      </main>
    </div>
  );
}
