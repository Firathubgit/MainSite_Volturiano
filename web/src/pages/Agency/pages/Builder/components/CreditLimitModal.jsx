import React, { useState, useEffect } from 'react';
import { 
    X, 
    CreditCard, 
    Zap, 
    Check, 
    Loader2, 
    Sparkles, 
    ShieldCheck, 
    ZapIcon, 
    ArrowRight,
    Flame
} from 'lucide-react';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';

export default function CreditLimitModal({ isOpen, onClose }) {
    const { user, getAccessToken } = useBuilderAuth();
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const fetchPacks = async () => {
            try {
                const res = await fetch('/api/billing/packs');
                const data = await res.json();
                if (data.success) setPacks(data.packs);
            } catch (err) {
                console.error('Failed to fetch packs:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPacks();
    }, [isOpen]);

    const handlePurchase = async (packId) => {
        setBuyingId(packId);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/billing/create-checkout-session', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ packId })
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Checkouts unavailable');
            }
        } catch (err) {
            console.error('Purchase failed:', err);
            alert('Failed to initiate purchase: ' + err.message);
        } finally {
            setBuyingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '900px',
                background: '#121212',
                borderRadius: '32px',
                border: '1px solid #2e2d2d',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>
                {/* Decoration */}
                <div style={{ 
                    position: 'absolute', 
                    top: '-100px', 
                    right: '-100px', 
                    width: '300px', 
                    height: '300px', 
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)', 
                    filter: 'blur(40px)', 
                    pointerEvents: 'none' 
                }} />

                {/* Close */}
                <button 
                    onClick={onClose}
                    style={{ 
                        position: 'absolute', 
                        top: '24px', 
                        right: '24px', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid #2e2d2d', 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer', 
                        color: '#666',
                        zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{ padding: '60px 60px 30px 60px', textAlign: 'center' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '20px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto 24px auto' 
                    }}>
                        <Flame size={32} color="#EF4444" />
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: '800', margin: 0, fontFamily: 'Inter' }}>Boost Your Energy</h2>
                    <p style={{ color: '#666', fontSize: '16px', margin: '12px 0 0 0', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6' }}>
                        Running low on generation credits? Top up your balance to keep building premium AI-generated websites instantly.
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 60px 60px 60px' }}>
                    {loading ? (
                        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                            <Loader2 size={32} color="#EF4444" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                            {packs.map(pack => (
                                <div 
                                    key={pack.id}
                                    style={{
                                        background: pack.popular ? '#1A1A1A' : '#0F0F0F',
                                        borderRadius: '24px',
                                        border: `1px solid ${pack.popular ? '#EF4444' : '#2e2d2d'}`,
                                        padding: '30px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        transition: 'transform 0.2s',
                                        cursor: 'default'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {pack.popular && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '-12px', 
                                            left: '50%', 
                                            transform: 'translateX(-50%)', 
                                            background: '#EF4444', 
                                            color: '#fff', 
                                            fontSize: '10px', 
                                            fontWeight: '800', 
                                            padding: '4px 12px', 
                                            borderRadius: '99px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Sparkles size={10} /> MOST POPULAR
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '20px' }}>
                                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>{pack.name}</h3>
                                        <p style={{ color: '#666', fontSize: '13px', margin: 0, minHeight: '40px' }}>{pack.description}</p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '25px' }}>
                                        <span style={{ color: '#fff', fontSize: '32px', fontWeight: '800' }}>{pack.priceDisplay}</span>
                                        <span style={{ color: '#444', fontSize: '14px' }}>/ {pack.credits} Cr</span>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '12px', 
                                        marginBottom: '30px', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        padding: '15px', 
                                        borderRadius: '16px' 
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Check size={14} color="#22c55e" />
                                            <span style={{ color: '#666', fontSize: '13px' }}>{pack.perCredit} per credit</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Check size={14} color="#22c55e" />
                                            <span style={{ color: '#666', fontSize: '13px' }}>Instant activation</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Check size={14} color="#22c55e" />
                                            <span style={{ color: '#666', fontSize: '13px' }}>Never expires</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handlePurchase(pack.id)}
                                        disabled={buyingId}
                                        style={{
                                            marginTop: 'auto',
                                            width: '100%',
                                            padding: '14px',
                                            background: pack.popular ? '#EF4444' : 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                            border: pack.popular ? 'none' : '1px solid #2e2d2d',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {buyingId === pack.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Purchase Pack'}
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div style={{ padding: '24px 60px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #2e2d2d', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color="#666" />
                        <span style={{ color: '#444', fontSize: '12px' }}>Secure checkout via Stripe</span>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}} />
        </div>
    );
}
