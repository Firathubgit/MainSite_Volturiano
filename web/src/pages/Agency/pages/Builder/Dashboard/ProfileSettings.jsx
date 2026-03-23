import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";
import { builderSupabase } from "../../../../../lib/builderSupabaseClient";
import { Loader2Icon, CameraIcon, UploadCloudIcon, CheckCircle2Icon, AlertCircleIcon, SaveIcon, UserIcon, ArrowLeftIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ProfileSettings.module.css";
import MySubmissions from "../Community/MySubmissions";
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Layout, Play, Trash2, Plus, Clock, Globe, Shield, Wallet, BookOpen, Settings } from 'lucide-react';

// New Dashboard Panels
import PublishedSites from './panels/PublishedSites';
import CreditsPanel from './panels/CreditsPanel';
import AccountSettings from './panels/AccountSettings';
import WebsitesTab from './panels/WebsitesTab';
import PlatformSettings from './panels/PlatformSettings';
import CreditLimitModal from '../components/CreditLimitModal';
import gradientCornerImage from './Assets/GradientCornerOne.png';


export default function ProfileSettings() {
    const navigate = useNavigate();
    const { user, profile, getAccessToken } = useBuilderAuth();

    const usernameDisplay = profile?.username ? `@${profile.username}` : (profile?.display_name || user?.email?.split('@')[0]);
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "";

    const [displayName, setDisplayName] = useState(profile?.display_name || "");
    const [usernameInput, setUsernameInput] = useState(profile?.username || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [location, setLocation] = useState(profile?.location || "");
    const [role, setRole] = useState(profile?.role || "");
    const [avatarFile, setAvatarFile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('Websites');
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    
    // Published Sites (legacy "Projects" tab)
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    
    // My Websites (new "Websites" tab)
    const [builderWebsites, setBuilderWebsites] = useState([]);
    const [websitesLoading, setWebsitesLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, projectId: null });
    
    const fileInputRef = useRef(null);

    // My Websites Fetching Logic
    const fetchWebsites = async () => {
        if (!user) return;
        setWebsitesLoading(true);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/dashboard/projects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBuilderWebsites(data.projects || []);
            }
        } catch (err) {
            console.error('Failed to fetch builder websites:', err);
        } finally {
            setWebsitesLoading(false);
        }
    };

    // Effects - MUST BE BEFORE ANY CONDITIONAL RETURNS
    useEffect(() => {
        fetchWebsites();
    }, [user]); // Add user to dependencies

    useEffect(() => {
        if (activeTab === 'Websites') {
            fetchWebsites();
        }
    }, [activeTab]);

    // Global listener for opening credit modal from sub-components
    useEffect(() => {
        const handleOpenCredits = () => setIsCreditModalOpen(true);
        window.addEventListener('open-credit-purchase-modal', handleOpenCredits);
        return () => window.removeEventListener('open-credit-purchase-modal', handleOpenCredits);
    }, []);

    const handleSave = async () => {
        setLoadingProfile(true);
        setSuccessMsg('');
        setErrorMsg('');
        try {
            let newAvatarUrl = avatarUrl;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await builderSupabase.storage
                    .from('builder-assets')
                    .upload(filePath, avatarFile);

                if (uploadError) throw uploadError;

                const { data } = builderSupabase.storage
                    .from('builder-assets')
                    .getPublicUrl(filePath);

                if (data?.publicUrl) {
                    newAvatarUrl = data.publicUrl;
                }
            }

            const updates = {
                id: user.id,
                display_name: displayName,
                username: usernameInput,
                bio: bio,
                location: location,
                role: role,
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error } = await builderSupabase.from('profiles').upsert(updates);
            if (error) throw error;

            setSuccessMsg('Profile updated successfully!');
            setIsEditingProfile(false);
            setTimeout(() => window.location.reload(), 1500);

        } catch (err) {
            console.error('Save profile error', err);
            setErrorMsg(err.message || 'Error saving profile');
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleDeleteWebsite = (id) => {
        setDeleteModal({ isOpen: true, projectId: id });
    };

    const confirmDeleteWebsite = async () => {
        const id = deleteModal.projectId;
        if (!id) return;
        
        try {
            const token = await getAccessToken();
            const res = await fetch(`/api/dashboard/projects/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBuilderWebsites(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleteModal({ isOpen: false, projectId: null });
        }
    };

    // Fallback UI while loading - MUST BE AFTER ALL HOOKS
    if (!user || !profile) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
                <Loader2Icon size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', minHeight: '100vh', position: 'relative', background: 'black', overflowX: 'hidden', padding: 'clamp(20px, 4vw, 40px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            {/* Background Image - Positioned to the right as decoration */}
            <div style={{
                position: 'fixed',
                right: '0',
                bottom: '0',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: `url(${gradientCornerImage})`,
                backgroundSize: 'max(800px, 80vw)',
                backgroundPosition: 'bottom right',
                backgroundRepeat: 'no-repeat'
            }}>
            </div>

            {/* Main Content Container - Relative to stay above SVGs */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Header Row */}
                <div style={{ flexShrink: 0 }}>
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/builder')}
                        style={{
                            background: 'transparent',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s',
                            marginLeft: '-16px' // Visual optical alignment
                        }}
                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: '#1F1F1F' })}
                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'transparent' })}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                            <svg width="17" height="30" viewBox="0 0 17 30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scale(0.5)' }}>
                                <path d="M0.585785 13.3123C-0.195259 14.0934 -0.195259 15.3597 0.585785 16.1408L13.3137 28.8687C14.0948 29.6497 15.3611 29.6497 16.1421 28.8687C16.9232 28.0876 16.9232 26.8213 16.1421 26.0403L4.82843 14.7266L16.1421 3.41285C16.9232 2.63181 16.9232 1.36548 16.1421 0.584427C15.3611 -0.196622 14.0948 -0.196622 13.3137 0.584427L0.585785 13.3123Z" fill="white" />
                            </svg>
                        </div>
                        <span style={{ color: 'white', fontSize: 'clamp(12px, 1.5vh, 15px)', fontFamily: 'Inter', fontWeight: '400' }}>Back To Builder Page</span>
                    </button>
                </div>

                {/* Profile Split Layout */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 'clamp(20px, 4vh, 40px)', flexShrink: 0 }}>

                    {/* Left Column: Avatar & Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vh, 20px)' }}>
                        {/* Avatar */}
                        <div
                            onMouseEnter={() => setIsHoveringAvatar(true)}
                            onMouseLeave={() => setIsHoveringAvatar(false)}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: 'clamp(120px, 18vh, 203px)',
                                height: 'clamp(120px, 18vh, 203px)',
                                background: '#D9D9D9', borderRadius: 9999, overflow: 'hidden',
                                border: 'clamp(2px, 0.4vh, 4px) solid #1F1F1F',
                                position: 'relative', cursor: 'pointer'
                            }}>
                            {(avatarFile || avatarUrl) ? (
                                <img src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #222, #111)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserIcon size="50%" color="rgba(255,255,255,0.2)" />
                                </div>
                            )}
                            {isHoveringAvatar && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 10, transition: 'background 0.2s'
                                }}>
                                    <UploadCloudIcon size={32} color="white" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />

                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: 'clamp(20px, 3vh, 40px)', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: 'white', fontSize: 'clamp(18px, 2.5vh, 28px)', fontFamily: 'Inter', fontWeight: '500' }}>0</span>
                                <span style={{ color: '#9D9D9D', fontSize: 'clamp(18px, 2.5vh, 28px)', fontFamily: 'Inter', fontWeight: '400' }}> Followers</span>
                            </div>
                            <div>
                                <span style={{ color: 'white', fontSize: 'clamp(18px, 2.5vh, 28px)', fontFamily: 'Inter', fontWeight: '500' }}>0</span>
                                <span style={{ color: '#9D9D9D', fontSize: 'clamp(18px, 2.5vh, 28px)', fontFamily: 'Inter', fontWeight: '400' }}> Following</span>
                            </div>
                        </div>

                        {/* Username */}
                        <div style={{ color: 'white', fontSize: 'clamp(36px, 5vh, 60px)', fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word', lineHeight: 1.1 }}>
                            {usernameDisplay}
                        </div>
                    </div>

                    {/* Right Side Navigation Menu */}
                    <div style={{
                        width: 'clamp(140px, 15vw, 187px)',
                        background: '#1F1F1F', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
                    }}>
                        {['Websites', 'Projects', 'Components', 'Billing', 'Profile', 'Settings'].map((item) => (
                            <button
                                key={item}
                                onClick={() => setActiveTab(item)}
                                style={{
                                    background: activeTab === item ? '#2E2D2D' : 'transparent', border: 'none',
                                    color: 'white', fontSize: 'clamp(15px, 2vh, 23px)', fontFamily: 'Inter', fontWeight: '400',
                                    padding: 'clamp(10px, 1.5vh, 16px) clamp(16px, 2vw, 24px)', cursor: 'pointer', transition: 'background 0.2s',
                                    textAlign: 'left'
                                }}
                                onMouseEnter={(e) => { if (activeTab !== item) e.currentTarget.style.background = '#2E2D2D'; }}
                                onMouseLeave={(e) => { if (activeTab !== item) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Content Area */}
                <div style={{
                    width: '100%',
                    background: '#1F1F1F', borderRadius: '16px', display: 'flex', flexDirection: 'column',
                    padding: 'clamp(16px, 2.5vh, 32px)', boxSizing: 'border-box',
                    marginTop: 'clamp(12px, 2vh, 24px)',
                    position: 'relative',
                    marginBottom: '40px'
                }}>
                    {activeTab === 'Profile' && (
                        <div>
                            <AccountSettings />
                        </div>
                    )}

                    {activeTab === 'Components' && (
                        <div>
                            <MySubmissions />
                        </div>
                    )}

                    {activeTab === 'Websites' && (
                        <div style={{ width: '100%', padding: 'clamp(10px, 2vh, 20px)' }}>
                            <WebsitesTab 
                                websites={builderWebsites} 
                                loading={websitesLoading} 
                                onDelete={handleDeleteWebsite}
                                onCreateNew={() => navigate('/builder')}
                                navigate={navigate}
                            />
                        </div>
                    )}

                    {activeTab === 'Projects' && (
                        <div style={{ width: '100%', padding: '20px' }}>
                            <PublishedSites />
                        </div>
                    )}

                    {activeTab === 'Billing' && (
                        <div style={{ width: '100%', padding: '20px' }}>
                            <CreditsPanel />
                        </div>
                    )}

                    {activeTab === 'Settings' && (
                        <div style={{ width: '100%' }}>
                            <PlatformSettings />
                        </div>
                    )}

                </div>

                {/* Credit Limit Modal */}
                <CreditLimitModal 
                    isOpen={isCreditModalOpen} 
                    onClose={() => setIsCreditModalOpen(false)} 
                />

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {deleteModal.isOpen && (
                        <motion.div 
                            className={styles.modalOverlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteModal({ isOpen: false, projectId: null })}
                        >
                            <motion.div 
                                className={styles.modalCard}
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className={styles.modalTitle}>Delete Project</h3>
                                <p className={styles.modalDesc}>
                                    Are you sure you want to delete this project, this cant be un done
                                </p>
                                <div className={styles.modalActions}>
                                    <button 
                                        className={styles.modalBtn}
                                        onClick={() => setDeleteModal({ isOpen: false, projectId: null })}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className={`${styles.modalBtn} ${styles.modalBtnDanger}`}
                                        onClick={confirmDeleteWebsite}
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
