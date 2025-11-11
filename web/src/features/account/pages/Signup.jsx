import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signUpWithEmail } from '../api';
import styles from '../styles/account.module.css';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { t } = useTranslation('account');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: signUpError } = await signUpWithEmail({
      email,
      password,
      fullName
    });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(t('signup.success'));
      setTimeout(() => navigate('/account/login'), 3500);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('signup.title')}</h1>
        <p className={styles.subtitle}>{t('signup.subtitle')}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="signup-name" className={styles.label}>
              {t('signup.name')}
            </label>
            <input
              id="signup-name"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder={t('signup.namePlaceholder')}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="signup-email" className={styles.label}>
              {t('signup.email')}
            </label>
            <input
              id="signup-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="signup-password" className={styles.label}>
              {t('signup.password')}
            </label>
            <input
              id="signup-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>
        <div className={styles.meta}>
          <span>
            {t('signup.signinPrefix')}{' '}
            <Link to="/account/login">{t('signup.signinLink')}</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

