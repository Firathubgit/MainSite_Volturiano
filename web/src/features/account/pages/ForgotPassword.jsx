import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendPasswordReset } from '../api';
import styles from '../styles/account.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const { t } = useTranslation('account');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    const { error: resetError } = await sendPasswordReset(email);
    if (resetError) {
      setError(resetError.message);
    } else {
      setFeedback(t('forgot.success'));
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('forgot.title')}</h1>
        <p className={styles.subtitle}>{t('forgot.subtitle')}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="forgot-email" className={styles.label}>
              {t('forgot.email')}
            </label>
            <input
              id="forgot-email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {feedback && <div className={styles.success}>{feedback}</div>}
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
        <div className={styles.meta}>
          <Link to="/account/login">{t('forgot.return')}</Link>
        </div>
      </div>
    </div>
  );
}

