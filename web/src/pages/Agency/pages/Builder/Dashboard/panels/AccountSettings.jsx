import React, { useState } from 'react';
import { useBuilderAuth } from '../../../../../../contexts/BuilderAuthContext';
import { builderSupabase } from '../../../../../../lib/builderSupabaseClient';

export default function AccountSettings() {
    const { user, profile, refreshProfile } = useBuilderAuth();
    
    // Form state
    const [displayName, setDisplayName] = useState(profile?.display_name || "");
    const [username, setUsername] = useState(profile?.username || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [location, setLocation] = useState(profile?.location || "");
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    
    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);
        setError("");
        
        try {
            const { error: updateError } = await builderSupabase
                .from('profiles')
                .update({
                    display_name: displayName,
                    username,
                    bio,
                    location,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setSuccess(true);
            await refreshProfile();
            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error('Update profile failed:', err);
            setError(err.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#fff',
        outline: 'none',
        fontSize: '15px',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        width: '100%',
        boxSizing: 'border-box'
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
        <div style={{ padding: '20px 40px', animation: 'fadeIn 0.5s ease-out' }}>
            
            <div style={{ width: '100%' }}>
                
                {/* Header Section */}
                <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '32px' }}>
                    <h3 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                        Public Profile
                    </h3>
                    <p style={{ color: '#888', fontSize: '15px', margin: 0, fontWeight: '400' }}>
                        Manage your identity and workspace presence.
                    </p>
                </div>

                {/* Main Form Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* Name & Username Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <input 
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your full name"
                                style={inputStyle}
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Username</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '20px', top: '16px', color: 'rgba(255,255,255,0.3)', fontSize: '15px' }}>@</span>
                                <input 
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="username"
                                    style={{ ...inputStyle, paddingLeft: '40px' }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bio Section */}
                    <div>
                        <label style={labelStyle}>Bio</label>
                        <textarea 
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="A brief bio about yourself..."
                            rows={5}
                            style={{ ...inputStyle, resize: 'none', lineHeight: '1.6' }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Location Section */}
                    <div>
                        <label style={labelStyle}>Location</label>
                        <input 
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City, Country"
                            style={inputStyle}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Unified Plan Info Section */}
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '32px 0', 
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <label style={{ ...labelStyle, marginBottom: '6px' }}>Platform Plan</label>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                                <span style={{ color: '#fff', fontSize: '24px', fontWeight: '700', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                                    {profile?.plan || 'Free'}
                                </span>
                                <span style={{ color: '#666', fontSize: '16px', fontWeight: '400' }}>
                                    / {profile?.plan === 'admin' ? 'Unlimited administrative access' : 'Personal building plan'}
                                </span>
                            </div>
                        </div>
                        <div style={{ color: '#fff', fontSize: '11px', fontWeight: '800', letterSpacing: '0.12em', opacity: 0.6 }}>
                            CURRENTLY ACTIVE
                        </div>
                    </div>

                    {/* Save Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '12px' }}>
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            style={{ 
                                padding: '16px 48px', 
                                background: success ? '#4ade80' : '#fff', 
                                color: '#000', 
                                border: 'none', 
                                borderRadius: '14px', 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: success ? '0 10px 20px rgba(74, 158, 128, 0.15)' : '0 10px 20px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                        >
                            {loading ? 'Saving Changes...' : (success ? 'Changes Saved' : 'Save Changes')}
                        </button>
                        {error && <span style={{ color: '#f87171', fontSize: '14px', fontWeight: '500' }}>{error}</span>}
                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
}
