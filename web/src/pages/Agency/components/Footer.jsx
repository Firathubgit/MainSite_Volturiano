import React from 'react';
import { ArrowUpRight, Linkedin, Twitter, Instagram, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from './ThemeToggle';
import tornadoLogo from '../../../assets/Logo/TornadoLogo.png';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation('agency');
  
  // Email template with pre-filled subject and body
  const emailSubject = encodeURIComponent('Project Inquiry - Volturio Studios');
  const emailBody = encodeURIComponent(`Hej!

Jag är intresserad av att starta ett projekt med Volturio Studios.

Företagsinformation:
Företagsnamn: [Ditt företagsnamn]
Kontaktperson: [Ditt namn]
Telefon: [Ditt telefonnummer]
E-post: [Din e-post]

Befintlig webbplats:
Har ni redan en webbplats? [Ja/Nej]
Om ja, kan ni lämna in länk: [Webbplats-URL]
Har ni tillgång till befintlig design/branding? [Ja/Nej]

Projektbeskrivning:
[Beskriv ditt projekt, vad ni vill uppnå och vilka funktioner som behövs]

Önskad design/känsla:
[Beskriv önskad designstil, känsla, inspiration eller referenser]

Budget:
[Ange budgetomfång]

Tidslinje:
[När vill ni att projektet ska vara klart?]

Boka möte (30 min):
Vi erbjuder ett snabbt 30-minuters möte för att diskutera er idé och behov.
Tillgängliga tider: Måndag - Söndag, 08:00 - 17:30

Föredragna tider/tidsperioder:
[Ange en eller flera tider/tidsperioder som passar er. Exempel: "Tisdag 14:00", "Onsdag 10:00-12:00", eller "Nästa vecka efter 15:00"]
Vi återkopplar med bekräftad tid inom 24 timmar.

Context inför mötet:
[Kort beskrivning av vad ni vill diskutera eller några punkter ni vill gå igenom]

Övrig information:
[Lägg till annan relevant information här]

Med vänliga hälsningar,
[Ditt namn]`);
  
  const mailtoLink = `mailto:create@volturiano.com?subject=${emailSubject}&body=${emailBody}`;
  
  return (
    <footer id="footer" className={styles.footer}>
      
      {/* Main CTA */}
      <div className={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <p className={styles.ctaLabel}>
            {t('footer.ctaLabel', { defaultValue: 'Ready to make a change?' })}
          </p>
          <h2 className={styles.ctaTitle}>
            {t('footer.ctaTitle', { defaultValue: 'START YOUR\nPROJECT' }).split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h2>
          
          <a 
            href={mailtoLink}
            className={styles.emailLink}
          >
            create@volturiano.com
            <ArrowUpRight className={styles.emailIcon} />
          </a>
        </motion.div>
      </div>

      {/* Grid Info */}
      <div className={styles.infoGrid}>
        
        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.designStudio.title', { defaultValue: 'Headquarters' })}
          </p>
          <p>{t('footer.designStudio.address1', { defaultValue: 'Gothenburg, Sweden' })}</p>
          <p>{t('footer.designStudio.address2', { defaultValue: 'Nordic Innovation' })}</p>
          <a href="tel:+46763032964" className={styles.phoneLink}>
            <Phone className={styles.phoneIcon} />
            <span>0763032964</span>
          </a>
        </div>

        <div className={styles.infoColumn}>
          <p className={styles.infoTitle}>
            {t('footer.engineeringLab.title', { defaultValue: 'Studio' })}
          </p>
          <p>{t('footer.engineeringLab.address1', { defaultValue: 'Digital Ecosystem' })}</p>
          <p>{t('footer.engineeringLab.address2', { defaultValue: 'Global Reach' })}</p>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.socialLinks}>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.linkedin', { defaultValue: 'LinkedIn' })}
            >
              <Linkedin className={styles.socialIcon} />
            </a>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.twitter', { defaultValue: 'Twitter / X' })}
            >
              <Twitter className={styles.socialIcon} />
            </a>
            <a 
              href="https://www.instagram.com/volturiano/" 
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label={t('footer.social.instagram', { defaultValue: 'Instagram' })}
            >
              <Instagram className={styles.socialIcon} />
            </a>
          </div>
        </div>

        <div className={`${styles.infoColumn} ${styles.infoColumnRight}`}>
          <p>{t('footer.copyright', { defaultValue: '© 2026 Volturio Web Agency.' })}</p>
          <p className={styles.tagline}>
            {t('footer.tagline', { defaultValue: 'Engineered for the future.' })}
          </p>
          
          {/* Volturiano Stamp - Expand on Hover */}
          <a 
            href="https://volturiano.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.volturianoStamp}
          >
            <div className={styles.stampContent}>
              <span className={styles.stampText}>POWERED BY</span>
              <div className={styles.stampSeparator} />
            </div>
            <img 
              src={tornadoLogo} 
              alt="Volturiano" 
              className={styles.stampLogo} 
            />
          </a>

          <div className={styles.themeToggleWrapper}>
            <ThemeToggle />
          </div>
        </div>

      </div>
    </footer>
  );
}
