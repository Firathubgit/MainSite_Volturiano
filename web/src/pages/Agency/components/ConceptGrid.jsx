import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './ConceptGrid.module.css';

export function ConceptGrid() {
  const { t } = useTranslation('agency');
  
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Section Header */}
        <div className={styles.header}>
          <h3 className={styles.headerLabel}>
            {t('conceptGrid.header.label', { defaultValue: 'Research & Development' })}
          </h3>
          <span className={styles.headerFigure}>
            {t('conceptGrid.header.figure', { defaultValue: 'FIG. 04 — MATERIALS' })}
          </span>
        </div>

        {/* Abstract Grid */}
        <div className={styles.grid}>
            
          {/* Col 1: Large Abstract Texture */}
          <div className={styles.textureColumn}>
            <img 
              src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop" 
              alt={t('conceptGrid.texture.alt', { defaultValue: 'Carbon Fiber Texture' })}
              className={styles.textureImage}
            />
            <div className={styles.textureLabel}>
              {t('conceptGrid.texture.label', { defaultValue: 'Ref_Carbon_01' })}
            </div>
            <div className={styles.textureArrow}>
              <ArrowDown className={styles.arrowIcon} />
            </div>
          </div>

          {/* Col 2: The "Stack" (Color + Code) */}
          <div className={styles.stackColumn}>
            
            {/* Solid Color Block */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              className={styles.colorBlock}
            >
              <span className={styles.colorBlockLabel}>
                {t('conceptGrid.colorBlock.label', { defaultValue: 'ACCENT.HEX' })}
              </span>
              <span className={styles.colorBlockValue}>#E10600</span>
            </motion.div>

            {/* Raw Code Block */}
            <div className={styles.codeBlock}>
              <div className={styles.codeBlockGradient}></div>
              <p className={styles.codeText}>
                {`import { Canvas } from '@react-three/fiber';`} <br/>
                {`import { Physics } from '@react-three/cannon';`} <br/>
                <br/>
                {`function Scene() {`} <br/>
                {`  return (`} <br/>
                {`    <Canvas shadows>`} <br/>
                {`      <Physics gravity={[0, -9.8, 0]}>`} <br/>
                {`         <Vehicle />`} <br/>
                {`      </Physics>`} <br/>
                {`    </Canvas>`} <br/>
                {`  )`} <br/>
                {`}`}
              </p>
              <div className={styles.codeIndicator}></div>
            </div>
          </div>

          {/* Col 3: Vertical Typography & Empty Space */}
          <div className={styles.typographyColumn}>
            <div>
              <h2 className={styles.typographyTitle}>
                {t('conceptGrid.typography.title', { defaultValue: 'ZERO\nONE' }).split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </h2>
            </div>
            
            <div className={styles.typographyFooter}>
              <div className={styles.typographyDivider}></div>
              <div className={styles.typographyFooterContent}>
                <p className={styles.typographyDescription}>
                  {t('conceptGrid.typography.description', { 
                    defaultValue: 'Exploring the friction between physical materials and digital planes.' 
                  })}
                </p>
                <span className={styles.typographyNumber}>
                  {t('conceptGrid.typography.number', { defaultValue: '04' })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

