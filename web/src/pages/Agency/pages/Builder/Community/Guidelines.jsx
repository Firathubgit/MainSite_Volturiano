import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Guidelines.module.css';

const Guidelines = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.backButton} onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                </div>
                <h1 className={styles.title}>Builder Community Guidelines</h1>
                <p className={styles.subtitle}>Contributing to the AI-driven future of Volturiano.</p>
            </header>

            <main className={styles.content}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>1. AI Builder Integration</h2>
                    <p className={styles.text}>
                        By submitting a component through the Studio, you allow the Volturiano AI Website Builder to dynamically analyze and use your code. If your component suits a user's specific request or design context during the building process, the AI can implement it instantly.
                    </p>
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Dynamic Implementation</h3>
                        <p className={styles.text}>
                            Your code isn't just sitting in a database—it's a living part of the builder. It helps power the "intelligence" of the platform, allowing for more diverse and high-quality generations for everyone.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>2. Selection & Cataloging</h2>
                    <p className={styles.text}>
                        Every submission undergoes an admin review process.
                    </p>
                    <div className={styles.card}>
                        <ul className={styles.list}>
                            <li><strong>Evaluation:</strong> Admins check for code quality, responsiveness, and aesthetic alignment with the Volturiano brand.</li>
                            <li><strong>The Catalog:</strong> If chosen, your component will be featured in the official Community Component Catalog, making it available for public browsing and manual use by other designers.</li>
                        </ul>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>3. Shared Ecosystem</h2>
                    <p className={styles.text}>
                        Volturiano is built on a "Global Win" philosophy. When you submit, you are contributing to a shared utility.
                    </p>
                    <div className={styles.benefitCard}>
                        <h3 className={styles.cardTitle}>Usage & Ownership</h3>
                        <p className={styles.text}>
                            Once a component is part of the ecosystem, it belongs to the community. Everyone can use it for their personal or commercial projects within the builder. By submitting, you agree that you cannot restrict others from using or modifying the component for their own builds. You are providing the "type" or "blueprint" that powers the platform's versatility.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>4. The "No Friction" Rule</h2>
                    <p className={styles.text}>
                        We believe in a frictionless building experience. If your component is selected by the AI or a user, it becomes an integral part of that website. There is no individual "ownership" that prevents the final website from functioning or being published. You are the creator, but the community is the beneficiary.
                    </p>
                </section>
            </main>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} Volturiano Agency. Powering the next generation of AI web building.</p>
            </footer>
        </div>
    );
};

export default Guidelines;
