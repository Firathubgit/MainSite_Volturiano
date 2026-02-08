import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import s from './Models.module.css';
import PageTransition from '../../components/PageTransition/PageTransition';

/* ── Assets ── */
import mainCar from '../../assets/showroom/ShowroomCarVOLTURIANO1.png';
import longCar from '../../assets/showroom/ShowroomLongCar.png';
import suvCar from '../../assets/showroom/SHowroomSUV.png';
import testDriveBg from '../../assets/unwatermarked_Gemini_Generated_Image_nzgzmynzgzmynzgz.png';

/* ── Inline SVG helpers ── */
function ChevronDown() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L1 8L8 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L8 8L1 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg className={s.checkIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8.5L6 12.5L14 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className={s.filterBtnIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4H14M4 8H12M6 12H10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ── Scroll-reveal wrapper ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

function Reveal({ children, className }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

/* ── Vehicle data (static, matches Polestar reference layout) ── */
const VEHICLE_IMAGES = [mainCar, longCar, suvCar];

function getVehicleImage(idx) {
  return VEHICLE_IMAGES[idx % VEHICLE_IMAGES.length];
}

const VEHICLE_KEYS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'];
const VISIBLE_DEFAULT = 6;

/* ── FAQ data ── */
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];

/* ============================================
   MODELS PAGE COMPONENT
   ============================================ */
export default function Models() {
  const { t } = useTranslation('models');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_DEFAULT);
  const [openFaq, setOpenFaq] = useState(null);
  const [openDisclaimer, setOpenDisclaimer] = useState(null);
  const [activeTags, setActiveTags] = useState([]);

  const toggleFaq = useCallback((key) => {
    setOpenFaq((prev) => (prev === key ? null : key));
  }, []);

  const toggleDisclaimer = useCallback((key) => {
    setOpenDisclaimer((prev) => (prev === key ? null : key));
  }, []);

  const toggleTag = useCallback((tag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setActiveTags([]);
  }, []);

  const showMore = useCallback(() => {
    setVisibleCount(VEHICLE_KEYS.length);
  }, []);

  const vehiclesToShow = VEHICLE_KEYS.slice(0, visibleCount);

  return (
    <PageTransition>
      <div className={s.page}>

        {/* ── 1. PAGE TITLE ── */}
        <div className={s.titleRow}>
          <h1 className={s.pageTitle}>{t('pageTitle')}</h1>
        </div>

        {/* ── 2. FILTER BAR ── */}
        <div className={s.filterBar}>
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>{t('filterBar.modelLabel')}</span>
            <select className={s.filterSelect}>
              <option>{t('filterBar.modelDefault')}</option>
              <option>Volturiano Sport</option>
              <option>Volturiano GT</option>
              <option>Volturiano X</option>
            </select>
          </div>

          <button className={s.filterBtn}>
            <FilterIcon />
            {t('filterBar.filterBtn')} ({activeTags.length})
          </button>

          <div className={s.filterGroup} style={{ marginLeft: 'auto' }}>
            <span className={s.filterLabel}>{t('filterBar.sortLabel')}</span>
            <select className={s.sortSelect}>
              <option>{t('filterBar.sortDefault')}</option>
            </select>
          </div>
        </div>

        {/* ── TAG CHIPS ── */}
        <div className={s.tagsRow}>
          {['performance', 'longRange', 'allWheel'].map((tag) => (
            <button
              key={tag}
              className={activeTags.includes(tag) ? s.tagActive : s.tag}
              onClick={() => toggleTag(tag)}
            >
              {t(`tags.${tag}`)}
              {activeTags.includes(tag) && <XIcon className={s.tagX} />}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button className={s.resetBtn} onClick={resetFilters}>
              {t('filterBar.resetFilters')}
              <XIcon className={s.resetIcon} />
            </button>
          )}
        </div>

        {/* ── 3. VEHICLE CARDS GRID ── */}
        <div className={s.grid}>
          {vehiclesToShow.map((vKey, idx) => {
            /* Insert promo card after the first row (index 1) */
            const isPromo = idx === 1;
            /* Insert test drive card after index 5 */
            const isTestDrive = idx === 5;

            return (
              <React.Fragment key={vKey}>
                {isPromo && (
                  <Reveal>
                    <div className={s.promoCard}>
                      <p className={s.promoLine1}>{t('promo.line1')}</p>
                      <p className={s.promoLine2}>{t('promo.line2')}</p>
                    </div>
                  </Reveal>
                )}

                <Reveal>
                  <VehicleCard
                    vKey={vKey}
                    idx={idx}
                    t={t}
                  />
                </Reveal>

                {isTestDrive && (
                  <Reveal>
                    <div className={s.testDriveCard}>
                      <img
                        src={testDriveBg}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          zIndex: 0,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 100%)',
                          zIndex: 1,
                        }}
                      />
                      <div className={s.testDriveOverlay}>
                        <h3 className={s.testDriveTitle}>{t('testDrive.title')}</h3>
                        <div className={s.testDriveChecks}>
                          <div className={s.testDriveCheck}>
                            <CheckmarkIcon />
                            <span>{t('testDrive.check1')}</span>
                          </div>
                          <div className={s.testDriveCheck}>
                            <CheckmarkIcon />
                            <span>{t('testDrive.check2')}</span>
                          </div>
                          <div className={s.testDriveCheck}>
                            <CheckmarkIcon />
                            <span>{t('testDrive.check3')}</span>
                          </div>
                        </div>
                        <Link to="/test-drive" className={s.testDriveCta}>
                          {t('testDrive.cta')}
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── 4. SHOW MORE ── */}
        {visibleCount < VEHICLE_KEYS.length && (
          <div className={s.showMoreRow}>
            <button className={s.showMoreBtn} onClick={showMore}>
              <ChevronDown />
              {t('showMore')}
            </button>
          </div>
        )}

        {/* ── 5. FAQ SECTION ── */}
        <section className={s.faqSection}>
          {/* Left column — FAQ */}
          <div className={s.faqColumn}>
            <h2 className={s.faqTitle}>{t('faq.title')}</h2>
            {FAQ_KEYS.map((qKey) => (
              <div key={qKey} className={s.faqItem}>
                <button
                  className={s.faqQuestion}
                  onClick={() => toggleFaq(qKey)}
                >
                  <span>{t(`faq.${qKey}`)}</span>
                  <PlusIcon />
                </button>
                {openFaq === qKey && (
                  <motion.div
                    className={s.faqAnswer}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Placeholder answer text */}
                    Kontakta oss via support@volturiano.com eller ring kundtjänst.
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Right column — Disclaimers */}
          <div className={s.faqColumn}>
            <h2 className={s.faqTitle}>{t('disclaimers.title')}</h2>

            {/* Disclaimer 1 */}
            <div className={s.faqItem}>
              <button
                className={s.faqQuestion}
                onClick={() => toggleDisclaimer('d1')}
              >
                <span>
                  <sup style={{ fontSize: 12, letterSpacing: 0.1 }}>1</sup>{' '}
                  {t('disclaimers.d1title')}
                </span>
                <PlusIcon />
              </button>
              {openDisclaimer === 'd1' && (
                <motion.div
                  className={s.faqAnswer}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  Leveransdatum är uppskattningar och kan ändras.
                </motion.div>
              )}
            </div>

            {/* Disclaimer 2 — Private lease (expanded by default) */}
            <div className={s.faqItem}>
              <button
                className={s.faqQuestion}
                onClick={() => toggleDisclaimer('d2')}
              >
                <span>{t('disclaimers.d2title')}</span>
                <PlusIcon />
              </button>
              {openDisclaimer === 'd2' && (
                <motion.div
                  className={s.faqAnswer}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {t('disclaimers.d2body')}
                </motion.div>
              )}
            </div>
          </div>
        </section>

      </div>
    </PageTransition>
  );
}

/* ============================================
   VEHICLE CARD SUB-COMPONENT
   ============================================ */
function VehicleCard({ vKey, idx, t }) {
  return (
    <Link to="/garage" className={s.cardLink}>
      {/* Header — year + offer badge */}
      <div className={s.cardHeader}>
        <span className={s.cardYear}>{t('card.modelYear')}</span>
        <span className={s.cardYearVal}>2026</span>
        <span className={s.offerBadge}>{t('card.offer')}</span>
      </div>

      {/* Image with nav arrows */}
      <div className={s.cardImageWrap}>
        <img
          src={getVehicleImage(idx)}
          alt={t(`vehicles.${vKey}.name`)}
          className={s.cardImage}
          loading="lazy"
        />
        <button className={s.cardArrowLeft} aria-label="Previous" onClick={(e) => e.preventDefault()}>
          <ChevronLeft />
        </button>
        <button className={s.cardArrowRight} aria-label="Next" onClick={(e) => e.preventDefault()}>
          <ChevronRight />
        </button>
      </div>

      {/* Meta row */}
      <div className={s.cardMeta}>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>{t('card.package')}</span>
          <span className={s.metaValue}>{t(`vehicles.${vKey}.package`)}</span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>{t('card.drivetrain')}</span>
          <span className={s.metaValue}>{t(`vehicles.${vKey}.driveLabel`)}</span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>{t('card.delivery')}</span>
          <span className={s.metaValue}>
            {t(`vehicles.${vKey}.deliveryEst`)}
            <sup style={{ fontSize: '13px' }}> 1</sup>
          </span>
        </div>
      </div>

      {/* Name + price */}
      <div className={s.cardBottom}>
        <h3 className={s.cardName}>{t(`vehicles.${vKey}.name`)}</h3>
        <div className={s.cardPricing}>
          <div className={s.cardPrice}>{t(`vehicles.${vKey}.price`)}</div>
          <div className={s.cardOldPrice}>{t(`vehicles.${vKey}.oldPrice`)}</div>
        </div>
      </div>

      {/* Compare checkbox */}
      <div className={s.cardFooter} onClick={(e) => e.preventDefault()}>
        <input type="checkbox" className={s.checkbox} id={`compare-${vKey}`} onClick={(e) => e.stopPropagation()} />
        <label htmlFor={`compare-${vKey}`} className={s.checkLabel} onClick={(e) => e.stopPropagation()}>
          {t('card.compare')}
        </label>
      </div>
    </Link>
  );
}
