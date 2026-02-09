import React from 'react';
import styles from './VolturianoStamp.module.css';
import tornadoLogo from '../../../assets/Logo/TornadoLogo.png';

/**
 * VolturianoStamp Component
 * A premium branding stamp that expands on hover to reveal "POWERED BY" text.
 * 
 * @param {Object} props
 * @param {string} props.className - Optional custom class name
 * @param {string} props.href - URL to link to (default: https://volturiano.com)
 * @param {boolean} props.openInNewTab - Whether to open link in new tab (default: true)
 */
export const VolturianoStamp = ({
    className = '',
    href = 'https://volturiano.com',
    openInNewTab = true
}) => {
    return (
        <a
            href={href}
            target={openInNewTab ? "_blank" : "_self"}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className={`${styles.volturianoStamp} ${className}`}
            aria-label="Powered by Volturiano"
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
    );
};

export default VolturianoStamp;
