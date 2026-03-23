import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as XIcon, Check as CheckIcon } from 'lucide-react';
import styles from './CreditLimitModal.module.css';
import coinIcon from '../../pages/Agency/pages/Builder/Dashboard/Assets/SvgIconToken.svg';
import { useBuilderAuth } from '../../contexts/BuilderAuthContext';
import { useCredits } from '../../hooks/useCredits';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For curious builders',
    price: 24,
    credits: 20,
    features: [
      '20 credits per month',
      'Publish & export access',
      'Standard AI generation',
      'Community hub access'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For serious creators',
    price: 49,
    credits: 55,
    isPopular: true,
    features: [
      '55 credits per month',
      'Everything in Starter',
      'Priority AI generation',
      'Advanced project tools'
    ]
  },
  {
    id: 'studio',
    name: 'Studio',
    subtitle: 'For agencies & teams',
    price: 99,
    credits: 120,
    features: [
      '120 credits per month',
      'Everything in Pro',
      'Dedicated support',
      'White-label options'
    ]
  }
];

const PACKS = [
  { id: 'pack_10', name: '10 Credits', credits: 10, price: 14 },
  { id: 'pack_25', name: '25 Credits', credits: 25, price: 34, isPopular: true },
  { id: 'pack_60', name: '60 Credits', credits: 60, price: 79 }
];

export default function CreditLimitModal({ isOpen, onClose }) {
  const { getAccessToken } = useBuilderAuth();
  const { plan: currentPlan, isPaid } = useCredits();
  const [loading, setLoading] = useState(null);

  if (!isOpen) return null;

  const handleSubscribe = async (planId) => {
    try {
      setLoading(planId);
      const token = await getAccessToken();
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
        setLoading(null);
      }
    } catch (err) {
      alert('Network error. Check console.');
      setLoading(null);
    } 
  };

  const handleBuyPack = async (packId) => {
    try {
      setLoading(packId);
      const token = await getAccessToken();
      const res = await fetch('/api/billing/buy-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ packId })
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
        setLoading(null);
      }
    } catch (err) {
      alert('Network error. Check console.');
      setLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      setLoading('manage');
      const token = await getAccessToken();
      const res = await fetch('/api/billing/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open management portal');
        setLoading(null);
      }
    } catch (err) {
      alert('Network error. Check console.');
      setLoading(null);
    } 
  };

  return (
    <AnimatePresence>
      <div className={styles.overlay}>
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <button className={styles.closeBtn} onClick={onClose} disabled={loading !== null}>
            <XIcon size={20} />
          </button>

          <div className={styles.header}>
            <h2 className={styles.title}>Elevate your workflow</h2>
            <p className={styles.subtitle}>
              Choose a subscription that scales with your creative output.
            </p>
          </div>

          <div className={styles.cardsGrid}>
            {PLANS.map((plan) => {
              const isActive = currentPlan === plan.id;
              return (
                <div 
                  key={plan.id} 
                  className={`${styles.planCardOuter} ${plan.isPopular ? styles.popularOuter : ''}`}
                >
                  <div className={styles.planCardInner}>
                    <div className={styles.planHeader}>
                      <h3 className={styles.planTitleName}>{plan.name}</h3>
                      <p className={styles.planSubtitleText}>{plan.subtitle}</p>
                    </div>

                    <div className={styles.priceSection}>
                      <div className={styles.mainPrice}>
                        <span className={styles.amount}>{plan.price} €</span>
                        <span className={styles.period}>/ mo</span>
                      </div>
                    </div>

                    <div className={styles.selectorDropdown}>
                      <div className={styles.selectorInfo}>
                        <img src={coinIcon} alt="Credits" className={styles.coinIcon} />
                        <div className={styles.selectorText}>
                          <span className={styles.selectorMain}>{plan.credits} credits</span>
                          <span className={styles.selectorSub}> / month</span>
                        </div>
                      </div>
                    </div>

                    {isActive ? (
                      <button className={styles.activeBtn} disabled>
                        Current Plan
                      </button>
                    ) : (
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loading !== null}
                      >
                        {loading === plan.id ? 'Loading...' : `Get ${plan.name}`}
                      </button>
                    )}

                    <div className={styles.featuresSection}>
                      <h4 className={styles.featuresHead}>
                        {plan.id === 'starter' ? 'Includes:' : 'Everything in Standard, plus:'}
                      </h4>
                      <ul className={styles.featuresList}>
                        {plan.features.map((feature, idx) => (
                          <li key={idx}>
                            <CheckIcon size={16} className={styles.checkIcon} /> 
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.packsSection}>
            <h3 className={styles.packsTitle}>Need a one-time top up?</h3>
            <div className={styles.packsGrid}>
              {PACKS.map(pack => (
                <div key={pack.id} className={`${styles.packCard} ${pack.isPopular ? styles.packPopular : ''}`}>
                  <div className={styles.packHeader}>
                    <img src={coinIcon} alt="Credits" className={styles.packIcon} />
                    <span className={styles.packCredits}>{pack.credits} Credits</span>
                  </div>
                  <div className={styles.packPrice}>{pack.price} €</div>
                  <button 
                    className={styles.packBtn} 
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={loading !== null}
                  >
                    {loading === pack.id ? '...' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {isPaid && (
            <div className={styles.manageSection}>
              <button 
                className={styles.manageBtn} 
                onClick={handleManage}
                disabled={loading !== null}
              >
                {loading === 'manage' ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          )}
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
