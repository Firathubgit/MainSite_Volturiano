import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import s from './Home.module.css';
import PageTransition from '../../components/PageTransition/PageTransition';

/* ── Assets ── */
import heroBg from '../../assets/unwatermarked_Gemini_Generated_Image_nzgzmynzgzmynzgz.png';
import mainCar from '../../assets/showroom/ShowroomCarVOLTURIANO1.png';
import longCar from '../../assets/showroom/ShowroomLongCar.png';
import suvCar from '../../assets/showroom/SHowroomSUV.png';
import banner1Img from '../../assets/unwatermarked_Gemini_Generated_Image_wy8zc2wy8zc2wy8z.png';
import banner2Img from '../../assets/H1/BackgroundVolturiano.png';
import keyImg from '../../assets/H1/KeyImage.jpeg';
import vrImg from '../../assets/H1/VRGlassesUpcaled.jpeg';
import exteriorIcon from '../../assets/Logo/ExteriorButtonIcon.png';

/* Sprite source images (same as HeroBoard) */
import rect8 from '../../assets/H1/Rectangle 8.png';
import rect9 from '../../assets/H1/Rectangle 9.png';
import rect10 from '../../assets/H1/Rectangle 10.png';
import rect11 from '../../assets/H1/Rectangle 11.png';
import rect12 from '../../assets/H1/Rectangle 12.png';
import rect13 from '../../assets/H1/Rectangle 13.png';

const SPRITE_IMAGES = [rect8, rect9, rect10, rect11, rect12, rect13];
const SPRITE_LIFETIME = 1000;
const SPAWN_THROTTLE = 60;

/* ── Animations ── */
const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

/* ── Hook: hover-spawned sprite images on a container ── */
function useBannerSprites() {
  const ref = useRef(null);
  const activeRef = useRef(false);
  const lastRef = useRef(0);
  const idRef = useRef(0);
  const imgIdx = useRef(0);
  const timers = useRef(new Map());
  const [sprites, setSprites] = useState([]);

  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); timers.current.clear(); };
  }, []);

  const spawn = useCallback((e, force = false) => {
    const now = performance.now();
    if (!force && now - lastRef.current < SPAWN_THROTTLE) return;
    lastRef.current = now;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const id = idRef.current++;
    const size = 120 + Math.random() * 30;
    const rot = Math.random() * 16 - 8;
    const src = SPRITE_IMAGES[imgIdx.current++ % SPRITE_IMAGES.length];
    setSprites(prev => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top, size, rot, src }]);
    const tid = setTimeout(() => {
      setSprites(prev => prev.filter(sp => sp.id !== id));
      timers.current.delete(id);
    }, SPRITE_LIFETIME);
    timers.current.set(id, tid);
  }, []);

  const handlers = useMemo(() => ({
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') { activeRef.current = true; spawn(e, true); } },
    onPointerDown: (e) => { activeRef.current = true; spawn(e, true); },
    onPointerMove: (e) => { if (e.pointerType === 'mouse' || activeRef.current) spawn(e); },
    onPointerUp: () => { activeRef.current = false; },
    onPointerLeave: () => { activeRef.current = false; },
  }), [spawn]);

  return { ref, sprites, handlers };
}

/* ── Small arrow icon (Polestar style) ── */
function Arrow({ color = 'currentColor', size = 16 }) {
  return (
    <svg className={s.arrowIcon} width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Large chevron for mega-links ── */
function ChevronLarge() {
  return (
    <svg className={s.arrowLarge} viewBox="0 0 24 44" fill="none">
      <path d="M2 2l20 20L2 42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Quick-link arrow (diagonal) ── */
function ArrowDiag() {
  return (
    <svg className={s.quickLinkArrow} width="29" height="29" viewBox="0 0 29 29" fill="none">
      <path d="M8 21L21 8M21 8H10M21 8v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ════════════════════════════════════════
   MAIN HOME COMPONENT
   ════════════════════════════════════════ */
export default function Home() {
  const { t } = useTranslation('home');
  const b1 = useBannerSprites();
  const b2 = useBannerSprites();

  /* Model data for the 2x2 grid */
  const models = [
    { key: 'volturiano', img: mainCar, hasAvailable: false, hasDesign: true },
    { key: 'long',       img: longCar, hasAvailable: true,  hasDesign: false },
    { key: 'suv',        img: suvCar,  hasAvailable: true,  hasDesign: false },
    { key: 'concept',    img: mainCar, hasAvailable: false, hasDesign: true  },
  ];

  return (
    <PageTransition>
      {/* ── 1. HERO ── */}
      <section className={s.hero}>
        <img src={heroBg} alt="" className={s.heroBg} loading="eager" />
        <motion.div className={s.heroContent} initial="hidden" animate="visible" variants={fade}>
          <h1 className={s.heroTitle}>{t('hero.title')}</h1>
          <p className={s.heroSubtitle}>{t('hero.subtitle')}</p>
          <p className={s.heroPromo}>{t('hero.promo')}</p>
          <div className={s.heroCtas}>
            <Link to="/models" className={`${s.ghostBtn} ${s.ghostBtnWhite}`}>
              {t('hero.ctaAvailable')}
              <Arrow color="white" />
            </Link>
            <Link to="/models" className={`${s.ghostBtn} ${s.ghostBtnWhite}`}>
              {t('hero.ctaExplore')}
              <Arrow color="white" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── 2. MODEL GRID ── */}
      <section className={s.modelGrid}>
        {models.map((m, i) => (
          <motion.div
            key={m.key}
            className={s.modelCell}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fade}
          >
            <div className={s.modelCellInner}>
              <h2 className={s.modelName}>{t(`grid.${m.key}.name`)}</h2>
              <p className={s.modelDesc}>{t(`grid.${m.key}.desc`)}</p>
              <div className={s.modelLinks}>
                {m.hasDesign && (
                  <Link to="/configurator" className={s.textLink}>
                    {t('grid.designOrder')}
                    <Arrow />
                  </Link>
                )}
                {m.hasAvailable && (
                  <Link to="/models" className={s.textLink}>
                    {t('grid.available')}
                    <Arrow />
                  </Link>
                )}
                <Link to="/models" className={s.textLink}>
                  {t('grid.explore')}
                  <Arrow />
                </Link>
              </div>
              {m.img && (
                <img src={m.img} alt={t(`grid.${m.key}.name`)} className={s.modelImage} loading="lazy" />
              )}
            </div>
          </motion.div>
        ))}
      </section>

      {/* ── 3. MEGA LINKS ── */}
      <nav className={s.megaLinks}>
        {['testDrive', 'configure', 'showroom'].map((key) => (
          <Link key={key} to="/models" className={s.megaLinkRow}>
            <span className={s.megaLinkText}>{t(`megaLinks.${key}`)}</span>
            <ChevronLarge />
          </Link>
        ))}
      </nav>

      {/* ── 4. BANNER 1 — Light (clean, no overlays) ── */}
      <section className={`${s.banner} ${s.bannerLight}`}>
        <img src={banner1Img} alt="" className={s.bannerImg} loading="lazy" />
        <motion.div
          className={s.bannerContent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
        >
          <h2 className={s.bannerTitle}>{t('banner1.title')}</h2>
          <p className={s.bannerDesc}>{t('banner1.desc')}</p>
          <Link to="/models" className={`${s.ghostBtn} ${s.ghostBtnWhite}`}>
            {t('banner1.cta')}
            <Arrow color="white" />
          </Link>
        </motion.div>
      </section>

      {/* ── 5. BANNER 2 — Dark ── */}
      <section ref={b2.ref} className={`${s.banner} ${s.bannerDark}`} {...b2.handlers}>
        <img src={banner2Img} alt="" className={s.bannerImg} loading="lazy" />
        <div className={s.bannerTint} />
        <div className={s.bannerGridOverlay} />
        {b2.sprites.map((sp) => (
          <div key={sp.id} className={s.bannerSprite} style={{
            left: sp.x, top: sp.y, width: sp.size, height: sp.size,
            backgroundImage: `url(${sp.src})`, '--rotate': `${sp.rot}deg`,
          }} />
        ))}
        <motion.div
          className={s.bannerContent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fade}
        >
          <h2 className={s.bannerTitle}>{t('banner2.title')}</h2>
          <p className={s.bannerDesc}>{t('banner2.desc')}</p>
          <Link to="/world" className={`${s.ghostBtn} ${s.ghostBtnWhite}`}>
            {t('banner2.cta')}
            <Arrow color="white" />
          </Link>
        </motion.div>
      </section>

      {/* ── 6. OWNERSHIP ── */}
      <section className={s.ownership}>
        <div className={s.ownershipLeft}>
          <img src={exteriorIcon} alt="" className={s.ownershipIcon} />
          <span className={s.ownershipTitle}>{t('ownership.title')}</span>
        </div>
        <div className={s.ownershipRight}>
          <p className={s.ownershipDesc}>{t('ownership.desc')}</p>
          <div className={s.ownershipLinks}>
            <Link to="/garage" className={s.textLink}>
              {t('ownership.link1')}
              <Arrow />
            </Link>
            <Link to="/world" className={s.textLink}>
              {t('ownership.link2')}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. THREE-COLUMN CARDS ── */}
      <section className={s.cardsSection}>
        <div className={s.cardText}>
          <h3 className={s.cardTextTitle}>{t('accessories.title')}</h3>
          <p className={s.cardTextDesc}>{t('accessories.desc')}</p>
          <Link to="/configurator" className={`${s.ghostBtn} ${s.ghostBtnWhite}`}>
            {t('accessories.cta')}
            <Arrow color="white" />
          </Link>
        </div>
        <div className={s.cardImage}>
          <img src={keyImg} alt="Volturiano Key" loading="lazy" />
        </div>
        <div className={s.cardImage}>
          <img src={vrImg} alt="VR Glasses" loading="lazy" />
        </div>
      </section>

      {/* ── 8. QUICK LINKS ── */}
      <nav className={s.quickLinks}>
        {['fleet', 'offers', 'newsletter'].map((key) => (
          <Link key={key} to="/models" className={s.quickLinkItem}>
            <span className={s.quickLinkText}>{t(`quickLinks.${key}`)}</span>
            <ArrowDiag />
          </Link>
        ))}
      </nav>
    </PageTransition>
  );
}
