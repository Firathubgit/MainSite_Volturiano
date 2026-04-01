import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreditLimitContent } from '../../../../../components/Modals/CreditLimitModal';
import styles from '../../../../../components/Modals/CreditLimitModal.module.css';

export default function BuilderBillingPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/builder');
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageInner}>
        <div className={styles.pageTopBar}>
          <button type="button" className={styles.pageBackBtn} onClick={handleBack}>
            <ArrowLeft size={16} />
            Back to builder
          </button>
        </div>

        <motion.section
          className={styles.pageContent}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <CreditLimitContent onClose={handleBack} showCloseButton={false} />
        </motion.section>
      </div>
    </div>
  );
}
