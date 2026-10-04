import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logo from './assets/logo.png';
import styles from './NavBar.module.css';

export function NavBar() {
  const [hidden, setHidden] = useState(false);

  // The prompt page fades out when a build starts; the bar follows it.
  useEffect(() => {
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    window.addEventListener('cinematic-transition-start', hide);
    window.addEventListener('cinematic-transition-cancel', show);
    return () => {
      window.removeEventListener('cinematic-transition-start', hide);
      window.removeEventListener('cinematic-transition-cancel', show);
    };
  }, []);

  return (
    <header className={`${styles.bar} ${hidden ? styles.hidden : ''}`}>
      <Link to="/" className={styles.brand} aria-label="Volturiano Agent home">
        <img src={logo} alt="" className={styles.logo} />
        <span>Volturiano Agent</span>
      </Link>
      <nav className={styles.links}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : undefined)}>
          New site
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => (isActive ? styles.active : undefined)}>
          Projects
        </NavLink>
      </nav>
    </header>
  );
}

export default NavBar;
