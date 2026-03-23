import React, { useState, useEffect } from "react";
import { Loader2Icon, UserIcon, BriefcaseIcon } from "lucide-react";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";
import { builderSupabase } from "../../../../../lib/builderSupabaseClient";

export function OnboardingPopup({ onClose }) {
    const { user, profile, refreshProfile } = useBuilderAuth();

    const [displayName, setDisplayName] = useState(
        profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""
    );
    const [role, setRole] = useState(profile?.role || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!displayName.trim() || !role.trim()) {
            setError("Please fill out both your name and role.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const { error: updateError } = await builderSupabase
                .from("profiles")
                .update({
                    display_name: displayName,
                    role: role,
                    onboarding_completed: true,
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            await refreshProfile();
            if (onClose) onClose();
        } catch (err) {
            console.error("[Onboarding] Error updating profile:", err);
            setError("Failed to save profile. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.4)", // 0.4 opacity black as requested
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 999999, // Ensure it sits above absolutely everything
                backdropFilter: "blur(8px)",
                padding: "20px",
            }}
        >
            <div
                style={{
                    background: "rgba(15, 15, 15, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "420px",
                    padding: "32px",
                    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
                    color: "#fff",
                    position: "relative",
                    animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", background: "linear-gradient(135deg, #fff, #a0a0a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Welcome to Volturiano!
                    </h2>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.5" }}>
                        Before you start building, please tell us a little bit about yourself so we can personalize your experience.
                    </p>
                </div>

                {error && (
                    <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>
                            Display Name
                        </label>
                        <div style={{ position: "relative" }}>
                            <UserIcon size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
                            <input
                                type="text"
                                placeholder="How should we call you?"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                style={{
                                    width: "100%", padding: "12px 12px 12px 38px", background: "rgba(0,0,0,0.5)",
                                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "15px",
                                    outline: "none", transition: "border-color 0.2s"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: "28px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: "12px" }}>
                            What are you building for?
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            {['Student', 'Personal', 'Work', 'Other'].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setRole(opt)}
                                    style={{
                                        padding: "10px",
                                        background: role === opt ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.5)",
                                        border: `1px solid ${role === opt ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                                        borderRadius: "8px",
                                        color: role === opt ? "#fff" : "rgba(255,255,255,0.6)",
                                        fontSize: "14px",
                                        fontWeight: role === opt ? "600" : "400",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: "100%", padding: "12px", background: "#fff", color: "#000",
                            border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            opacity: isSubmitting ? 0.7 : 1, transition: "opacity 0.2s"
                        }}
                    >
                        {isSubmitting ? <><Loader2Icon size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Start Building"}
                    </button>
                </form>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
        </div>
    );
}
