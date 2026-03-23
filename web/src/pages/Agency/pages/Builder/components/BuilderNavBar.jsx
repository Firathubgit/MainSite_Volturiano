import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import FeedbackModal from "../../../../../components/Modals/FeedbackModal/FeedbackModal";
import { UserIcon, LogOutIcon, LayoutDashboardIcon, ChevronDownIcon, SparklesIcon, ZapIcon, MessageSquareIcon } from "lucide-react";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";
import { useCredits } from "../../../../../hooks/useCredits";
import CreditLimitModal from "../../../../../components/Modals/CreditLimitModal";
import navStyles from "../../../../../components/NavBar/NavBar.module.css";
import tornadoLogo from "../../../../../assets/Logo/TornadoLogo.png";
import accountIcon from "../../../../../assets/Logo/LoginAccountIcon.png";
import hamburgerIcon from "../../../../../assets/Logo/HamburgerIcon.png";
import signAsset from "../Dashboard/Assets/Sign.png";
import coinIcon from "../Dashboard/Assets/SvgIconToken.svg";

export function BuilderNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === "/builder" || location.pathname === "/builder/";
  const { user, profile, isAuthenticated, signOut, loading } = useBuilderAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    const handleCinematic = () => setIsCinematic(true);
    window.addEventListener('cinematic-transition-start', handleCinematic);
    return () => window.removeEventListener('cinematic-transition-start', handleCinematic);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/builder");
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const displayEmail = user?.email || null;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const cinematicStyle = isCinematic ? {
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: 0,
    transform: 'translateY(20px) scale(0.98)',
    filter: 'blur(10px)',
    pointerEvents: 'none'
  } : {
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <header className={navStyles.header}>
      <div className={navStyles.container}>
        <div className={navStyles.left} style={cinematicStyle}>
          <button type="button" className={navStyles.menuButton} aria-label="Menu">
            <img src={hamburgerIcon} alt="" className={navStyles.menuIcon} />
          </button>

          {isLandingPage && (
            <motion.div 
              className="builder-sign-container"
              initial={{ opacity: 0, y: -18, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              whileHover={{ 
                y: 4, 
                rotate: -1.5, 
                scale: 1.02,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                opacity: { duration: 1.2, ease: "easeOut" }
              }}
            >
              <style>
                {`
                  .builder-sign-container {
                    position: absolute;
                    top: -10px;
                    left: 85px;
                    z-index: 100;
                    pointer-events: auto;
                    filter: drop-shadow(0 15px 25px rgba(0,0,0,0.5));
                    cursor: pointer;
                  }
                  .builder-sign-img {
                    width: 180px;
                    height: auto;
                    display: block;
                  }
                  @media (max-width: 768px) {
                    .builder-sign-container {
                      display: none;
                    }
                  }
                `}
              </style>
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 3,
                  ease: "easeInOut"
                }}
              >
                <img src={signAsset} alt="Unlimited Credits" className="builder-sign-img" />
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Center logo */}
        <div className={navStyles.center} style={cinematicStyle}>
          <Link to="/builder" className={navStyles.logo} aria-label="Builder Home">
            <img src={tornadoLogo} alt="Volturiano Builder" className={navStyles.logoImg} />
          </Link>
        </div>

        <div className={navStyles.right}>
          {/* Credit Badge — only show when authenticated */}
          {isAuthenticated && !loading && <CreditBadge isCinematic={isCinematic} />}

          <div className={navStyles.account} ref={dropdownRef} style={cinematicStyle}>
            {loading ? (
              /* Loading state placeholder */
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : isAuthenticated ? (
              <>
                {/* Logged-in: avatar button with dropdown */}
                <button
                  type="button"
                  className={navStyles.accountButton}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', color: '#fff',
                      border: '2px solid rgba(255,255,255,0.15)',
                    }}>
                      {(displayName || displayEmail || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <ChevronDownIcon
                    size={14}
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      transition: 'transform 0.2s',
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '220px',
                    background: '#000000',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid #ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                    padding: '6px',
                    zIndex: 9999,
                    animation: 'fadeIn 0.15s ease-out',
                  }}>
                    {/* User info header */}
                    <div style={{
                      padding: '12px 14px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      marginBottom: '4px',
                    }}>
                      {displayName && (
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', lineHeight: 1.3 }}>
                          {displayName}
                        </div>
                      )}
                      {displayEmail && (
                        <div style={{
                          fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                          marginTop: displayName ? '2px' : 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {displayEmail}
                        </div>
                      )}
                    </div>

                    {/* Menu items */}
                    <DropdownItem 
                      icon={<UserIcon size={15} />} 
                      label="Account Dashboard" 
                      onClick={() => { setDropdownOpen(false); navigate('/builder/dashboard'); }} 
                    />

                    <DropdownItem 
                      icon={<MessageSquareIcon size={15} />} 
                      label="Feedback" 
                      onClick={() => { setDropdownOpen(false); setIsFeedbackOpen(true); }} 
                    />

                    {/* Separator + Logout */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <DropdownItem
                      icon={<LogOutIcon size={15} />}
                      label="Logout"
                      onClick={handleSignOut}
                      danger
                    />
                  </div>
                )}
              </>
            ) : (
              /* Not logged in: navigate to login */
              <button
                type="button"
                className={navStyles.accountButton}
                onClick={() => navigate("/builder/login")}
                aria-label="Login to Builder"
              >
                <img src={accountIcon} alt="Account" className={navStyles.accountIcon} />
              </button>
            )}
          </div>
        </div>
      </div>
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        pageSource="builder_navbar" 
      />
    </header>
  );
}


// ─────────────────────────────────────────────────────────────
// Credit Badge — Glassmorphism "Creative Energy" Indicator
// ─────────────────────────────────────────────────────────────
function CreditBadge({ isCinematic }) {
  const { totalAvailable, monthlyFreeRemaining, signupBonusRemaining, subscriptionRemaining, purchasedRemaining, isUnlimited, plan, loaded } = useCredits();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [optimisticDeduction, setOptimisticDeduction] = useState(0);
  const [isDeducting, setIsDeducting] = useState(false);

  // use a ref for the timeout to prevent closure issues
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    // 50ms delay gives the user time to "aim" for the card
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 50);
  };

  useEffect(() => {
    const handleDeduction = () => {
      setOptimisticDeduction(prev => prev + 1);
      setIsDeducting(true);
      setTimeout(() => setIsDeducting(false), 1600);
    };
    window.addEventListener('optimistic-credit-deduction', handleDeduction);
    return () => {
      window.removeEventListener('optimistic-credit-deduction', handleDeduction);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
      // Whenever the real total available resets, clear our optimistic sync
      setOptimisticDeduction(0);
  }, [totalAvailable]);

  if (!loaded) return null;

  const displayCount = isUnlimited ? '∞' : Math.max(0, totalAvailable - optimisticDeduction);

  const cinematicFadeOutStyle = isCinematic ? {
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: 0,
    transform: 'translateY(20px) scale(0.98)',
    filter: 'blur(10px)',
    pointerEvents: 'none'
  } : {
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px', gap: '12px' }}>
      <style>{`
        @keyframes creditPopUpOff {
          0% { transform: translateY(0) scale(1); filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); color: #fff; }
          40% { transform: translateY(-4px) scale(1.4); filter: brightness(1.6) drop-shadow(0 4px 15px rgba(255,255,255,0.6)); color: #AFFFFC; }
          75% { transform: translateY(-2px) scale(1.15); filter: brightness(1.2) drop-shadow(0 2px 8px rgba(255,255,255,0.3)); color: #AFFFFC; }
          100% { transform: translateY(0) scale(1); filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); color: #fff; }
        }
        .anim-deduct {
          animation: creditPopUpOff 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
      
      {/* Premium Upgrade CTA */}
      <button
        onClick={() => setShowLimitModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px 18px',
          height: '28px',
          background: 'black',
          border: '1px solid #555',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '500',
          fontFamily: "'Inter', sans-serif",
          cursor: 'pointer',
          ...cinematicFadeOutStyle,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#222';
          e.currentTarget.style.borderColor = '#777';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'black';
          e.currentTarget.style.borderColor = '#555';
        }}
      >
        <span style={{
          background: 'linear-gradient(90deg, #ffffff, #888888)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>Upgrade</span>
      </button>

      {/* Credit Counter Area */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {/* Badge */}
      <div
        id="credit-badge"
        className={isDeducting ? 'anim-deduct' : ''}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          gap: '6px', /* Added gap for icon */
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        <img 
          src={coinIcon} 
          alt="Credits" 
          style={{ width: '16px', height: '16px', objectFit: 'contain' }} 
        />
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: "'Inter', sans-serif",
          color: '#ffffff',
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {displayCount}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 5px)', // Tighter gap
          right: 0,
          minWidth: '200px',
          padding: '14px 16px',
          background: '#000000',
          backdropFilter: 'blur(24px)',
          border: '1px solid #ffffff',
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.05)',
          zIndex: 10000,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {/* Invisible bridge to catch the mouse during the movement gap */}
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: 0,
            right: 0,
            height: '15px',
            background: 'transparent'
          }} />
          {/* Header */}
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#e5e7eb',
            marginBottom: '10px',
          }}>
            Creative Energy
          </div>

          {/* Plan badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            fontSize: '11px',
            fontWeight: '600',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}>
            {plan ? (plan.charAt(0).toUpperCase() + plan.slice(1)) : 'Free'} plan
          </div>

          {/* Breakdown */}
          {isUnlimited ? (
            <div style={{
              fontSize: '13px',
              color: '#ffffff',
              fontWeight: '500',
            }}>
              Unlimited builds
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <CreditRow label="Monthly Free" value={monthlyFreeRemaining} color="#e5e7eb" labelColor="#9ca3af" />
              <CreditRow label="Signup Bonus" value={signupBonusRemaining} color="#e5e7eb" labelColor="#9ca3af" />
              <CreditRow label="Subscription" value={subscriptionRemaining} color="#e5e7eb" labelColor="#9ca3af" />
              <CreditRow label="Purchased" value={purchasedRemaining} color="#e5e7eb" labelColor="#9ca3af" />
              <div style={{
                height: '1px',
                background: 'rgba(255,255,255,0.1)',
                margin: '4px 0',
              }} />
              <CreditRow label="Total Available" value={totalAvailable} color="#ffffff" labelColor="#9ca3af" bold />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLimitModal(true);
                  setShowTooltip(false);
                }}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                Add Credits
              </button>
            </div>
          )}
        </div>
      )}

      <CreditLimitModal 
        isOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
      />
      </div>
    </div>
  );
}

function CreditRow({ label, value, color, labelColor, bold = false }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontSize: '12px',
        color: labelColor || 'rgba(255,255,255,0.45)',
        fontWeight: bold ? '600' : '400',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '13px',
        fontWeight: bold ? '700' : '600',
        fontFamily: "'Inter', sans-serif",
        color: color,
        letterSpacing: '0.02em',
      }}>
        {value}
      </span>
    </div>
  );
}


function DropdownItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '9px 14px',
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.75)',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)';
        e.currentTarget.style.color = danger ? '#fca5a5' : '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#f87171' : 'rgba(255,255,255,0.75)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
