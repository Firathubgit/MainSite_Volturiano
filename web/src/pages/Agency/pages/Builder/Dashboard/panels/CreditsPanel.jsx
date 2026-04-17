import React, { useState, useEffect, useMemo } from 'react';
import { useBuilderAuth } from '../../../../../../contexts/BuilderAuthContext';
import { formatDistanceToNow, subHours, isAfter, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import useCredits from '../../../../../../hooks/useCredits';
import coinIcon from '../Assets/SvgIconToken.svg';
import CreditLimitModal from '../../../../../../components/Modals/CreditLimitModal';
import styles from '../ProfileSettings.module.css';

export default function CreditsPanel() {
    const { user, profile, getAccessToken } = useBuilderAuth();
    const { 
        totalAvailable, isUnlimited, loaded: creditsLoaded,
        plan, subscriptionStatus, subscriptionPeriodEnd, 
        monthlyFreeRemaining, signupBonusRemaining, 
        subscriptionRemaining, purchasedRemaining, 
        monthlyFreeCap, monthlyFreeEarned, isPaid
    } = useCredits();
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/billing/history?limit=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistory(data.transactions || []);
            }
        } catch (err) {
            console.error('Failed to fetch billing history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);

    const recentConsumption = useMemo(() => {
        const threshold = subHours(new Date(), 30);
        return history.filter(tx => 
            tx.amount < 0 && 
            tx.created_at && 
            isAfter(new Date(tx.created_at), threshold)
        );
    }, [history]);

    const handleManageSubscription = async () => {
        setActionLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/billing/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to open portal');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setActionLoading(false);
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

    if (loading || !creditsLoaded) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className={styles.skeletonText} style={{ width: '120px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className={styles.skeletonCircle} style={{ width: '48px', height: '48px' }} />
                        <div className={styles.skeletonText} style={{ width: '100px', height: '80px' }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    {[1,2,3,4].map(i => (
                        <div key={i} className={styles.skeletonPulse} style={{ height: '100px', borderRadius: '16px' }} />
                    ))}
                </div>
            </div>
        );
    }

    const planNameDisplay = isPaid ? plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan' : 'Free Plan';
    
    let statusColor = '#666';
    if (subscriptionStatus === 'active') statusColor = '#10b981';
    else if (subscriptionStatus === 'past_due') statusColor = '#f59e0b';

    return (
        <div style={{ padding: '0 10px', animation: 'fadeIn 0.5s ease-out', position: 'relative' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {/* Large Metric */}
                <div>
                    <label style={labelStyle}>Total Energy Available</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
                        <img 
                            src={coinIcon} 
                            alt="Energy" 
                            style={{ 
                                width: '48px', 
                                height: '48px', 
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))'
                            }} 
                        />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <h2 style={{ 
                                color: '#fff', 
                                fontSize: '84px', 
                                fontWeight: '700', 
                                margin: 0, 
                                fontFamily: 'Outfit, sans-serif', 
                                letterSpacing: '-0.04em',
                                lineHeight: '1'
                            }}>
                                {isUnlimited ? '∞' : totalAvailable}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Wallet Breakdown */}
                {!isUnlimited && (
                    <div>
                        <label style={labelStyle}>Wallet Breakdown</label>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                            gap: '12px',
                            marginTop: '12px'
                        }}>
                            <BucketCard title="Monthly Free" amount={monthlyFreeRemaining} subtext={`Max ${monthlyFreeCap}/mo`} />
                            <BucketCard title="Signup Bonus" amount={signupBonusRemaining} subtext={signupBonusRemaining === 0 ? "Expired/Used" : "Expires in 30 days"} />
                            <BucketCard title="Subscription" amount={subscriptionRemaining} subtext={isPaid ? "Renews monthly" : "No subscription"} />
                            <BucketCard title="Purchased" amount={purchasedRemaining} subtext="Never expires" />
                        </div>
                    </div>
                )}

                {/* Subscription Management */}
                <div style={{ 
                    padding: '32px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Current Subscription</label>
                            <span style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                color: statusColor,
                                fontWeight: '600',
                                border: `1px solid ${statusColor}40`
                            }}>
                                {subscriptionStatus ? subscriptionStatus.toUpperCase() : 'FREE'}
                            </span>
                        </div>
                        <h4 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                            {planNameDisplay}
                        </h4>
                        {isPaid && subscriptionPeriodEnd && (
                            <p style={{ color: '#666', fontSize: '13px', margin: '4px 0 0 0' }}>
                                {subscriptionStatus === 'canceling' ? 'Expires on ' : 'Renews on '}
                                {format(subscriptionPeriodEnd, 'MMM d, yyyy')}
                            </p>
                        )}
                    </div>
                    
                    {isPaid ? (
                        <button 
                            onClick={handleManageSubscription}
                            disabled={actionLoading}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter'
                            }}
                            onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                            onMouseLeave={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        >
                            {actionLoading ? 'Loading...' : 'Manage'}
                        </button>
                    ) : (
                        <button 
                            onClick={() => setShowUpgradeModal(true)}
                            style={{
                                background: '#fff',
                                border: 'none',
                                color: '#000',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            Upgrade
                        </button>
                    )}
                </div>

                {/* History List */}
                <div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Recent Activities</label>
                    </div>

                    {recentConsumption.length === 0 ? (
                        <div style={{ padding: '48px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <p style={{ color: '#444', fontSize: '13px', margin: 0 }}>No recent activities.</p>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '1px', 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: '20px', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            overflow: 'hidden',
                            maxHeight: '280px',
                            overflowY: 'auto'
                        }}>
                            {recentConsumption.map((tx, idx) => {
                                const txTime = tx.created_at ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true }) : 'Recently';
                                
                                return (
                                    <div 
                                        key={tx.id || idx}
                                        style={{ 
                                            padding: '20px 28px', 
                                            display: 'grid', 
                                            gridTemplateColumns: '1fr auto auto', 
                                            alignItems: 'center', 
                                            gap: '24px',
                                            background: '#161616',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{tx.type || 'Usage'}</span>
                                            <span style={{ color: '#444', fontSize: '12px' }}>{txTime}</span>
                                        </div>
                                        <div style={{ 
                                            color: '#fff', 
                                            fontSize: '16px', 
                                            fontWeight: '700',
                                            fontFamily: 'Outfit, sans-serif',
                                            minWidth: '40px',
                                            textAlign: 'right'
                                        }}>
                                            {tx.amount}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            <CreditLimitModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </div>
    );
}

function BucketCard({ title, amount, subtext }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <h5 style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={coinIcon} alt="" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                <span style={{ color: '#fff', fontSize: '24px', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>{amount}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{subtext}</span>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
            `}} />
        </div>
    );
}
