import React, { useState, useEffect } from 'react';
import FeedbackModal from '../../../../../../components/Modals/FeedbackModal/FeedbackModal';
import { MessageSquareIcon, Loader2 } from 'lucide-react';
import { useBuilderAuth } from '../../../../../../contexts/BuilderAuthContext';

export default function PlatformSettings() {
    const { user, profile, refreshProfile, getAccessToken } = useBuilderAuth();
    const [builderMode, setBuilderMode] = useState(localStorage.getItem('volturiano_builder_mode') || 'hybrid');
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile?.preferred_mode) {
            setBuilderMode(profile.preferred_mode);
            localStorage.setItem('volturiano_builder_mode', profile.preferred_mode);
        }
    }, [profile?.preferred_mode]);

    const handleModeChange = async (modeId) => {
        setBuilderMode(modeId);
        localStorage.setItem('volturiano_builder_mode', modeId);
        
        if (!user) return;

        setIsSaving(true);
        try {
            // Use the same pattern as every other working tab:
            // Route through the Express backend using getAccessToken().
            // The backend uses the service_role key which NEVER expires,
            // so this is completely immune to alt-tab / stale token bugs.
            const token = await getAccessToken();

            const res = await fetch('/api/settings/preferred-mode', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ preferred_mode: modeId })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("Failed to save mode:", errData);
            } else {
                // Refresh the auth context profile so Builder.jsx picks up the new mode
                // without needing a page reload
                if (refreshProfile) await refreshProfile();
            }
        } catch (err) {
            console.error("Unhandled exception saving mode:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const labelStyle = {
        color: '#888',
        fontSize: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '10px',
        display: 'block'
    };

    return (
        <div style={{ padding: '10px 20px', animation: 'fadeIn 0.5s ease-out' }}>
            
            <div style={{ width: '100%' }}>
                
                {/* Header Section */}
                <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '32px' }}>
                    <h3 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Platform Settings
                        {isSaving && <Loader2 size={18} className="spin" color="#666" />}
                    </h3>
                    <p style={{ color: '#888', fontSize: '15px', margin: 0, fontWeight: '400' }}>
                        Manage system-level preferences and builder behavior.
                    </p>
                </div>

                {/* Settings Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    
                    {/* Builder Mode selection */}
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Builder Mode</label>
                            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
                                Choose the default engine behavior for your workspace.
                            </p>
                        </div>
                        
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)', 
                            borderRadius: '16px',
                            padding: '6px',
                            display: 'flex',
                            gap: '6px',
                            width: 'fit-content',
                            marginBottom: '32px'
                        }}>
                            {[
                                { id: 'hybrid', label: 'Hybrid' },
                                { id: 'premium', label: 'Premium' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => handleModeChange(mode.id)}
                                    style={{
                                        padding: '12px 32px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: builderMode === mode.id ? '#fff' : 'transparent',
                                        color: builderMode === mode.id ? '#000' : '#888',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        minWidth: '120px'
                                    }}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Description Box */}
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            borderRadius: '20px',
                            padding: '32px',
                            maxWidth: '640px'
                        }}>
                            {builderMode === 'hybrid' ? (
                                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                                    <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Hybrid Engine
                                    </h4>
                                    <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                                        The best of both worlds. This mode merges custom AI components generated with your selected LLM alongside high-quality selections from the Volturiano community. It provides a balanced approach to creative freedom and structural reliability.
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        background: 'rgba(234, 179, 8, 0.06)',
                                        border: '1px solid rgba(234, 179, 8, 0.15)',
                                    }}>
                                        <span style={{ fontSize: '16px', flexShrink: 0 }}>⏱</span>
                                        <span style={{ color: 'rgba(234, 179, 8, 0.85)', fontSize: '13px', fontWeight: '500', lineHeight: '1.4' }}>
                                            Hybrid builds take approximately 15–20 minutes per generation due to the dual premium + AI pipeline. This mode is currently unoptimized. We recommend using Premium mode for faster, higher-quality results.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                                    <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Premium Mode
                                    </h4>
                                    <p style={{ color: '#888', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                                        Focuses on pure architectural excellence. In this mode, you build exclusively using hand-crafted, professional components sourced from the Volturiano community. It's the ultimate choice for those who value refined, pre-vetted craftsmanship above all.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feedback Section */}
                    <div style={{ marginTop: '24px', paddingTop: '48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Platform Feedback</label>
                            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
                                Help us improve Volturiano by sharing your thoughts or reporting issues.
                            </p>
                        </div>
                        
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 24px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                        >
                            <MessageSquareIcon size={18} />
                            Share Feedback
                        </button>
                    </div>

                </div>

            </div>

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
                pageSource="profile_settings" 
            />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
}
