import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ComponentCard.module.css';
import gradientCorner from '../Dashboard/Assets/GradientCooorrnerForCard.png';
import cornerRight from '../Dashboard/Assets/SideBarGradient.png';

export default function ComponentCard({
    item,
    type = 'component',
    isSelectMode = false,
    isSelected = false,
    isLimitReached = false,
    onToggleSelect,
    onCardClick
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [avatarLoaded, setAvatarLoaded] = useState(false);
    const videoRef = useRef(null);

    // Formatting helpers
    const formatCount = (count) => {
        if (!count) return '0';
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
        return count.toString();
    };

    const displayName = item.display_name || item.name || 'Unnamed';
    const authorProfile = item.profiles || {};
    const authorName = authorProfile.username || authorProfile.display_name || 'Unknown';
    const qScore = item.quality_score ? Number(item.quality_score).toFixed(1) : '0.0';

    // Image and Video loading logic
    useEffect(() => {
        if (!item.thumbnail_url && !item.preview_image_url) {
            setImageLoaded(true);
            return;
        }

        const img = new Image();
        img.src = item.thumbnail_url || item.preview_image_url || "https://placehold.co/352x240";
        
        // .decode() ensures the image is fully downloaded AND ready to be displayed without jank
        img.decode()
            .then(() => {
                setImageLoaded(true);
            })
            .catch(() => {
                // Fallback if decode fails
                setImageLoaded(true);
            });
    }, [item.thumbnail_url, item.preview_image_url]);

    // Avatar loading logic
    useEffect(() => {
        if (!authorProfile.avatar_url) {
            setAvatarLoaded(true);
            return;
        }

        const img = new Image();
        img.src = authorProfile.avatar_url;
        img.decode()
            .then(() => setAvatarLoaded(true))
            .catch(() => setAvatarLoaded(true));
    }, [authorProfile.avatar_url]);

    // Video playback handling
    useEffect(() => {
        if (isHovered && videoRef.current) {
            // Small timeout to prevent flashy plays when moving mouse quickly over grid
            const timeout = setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.currentTime = 0; // Reset to start
                    videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
                }
            }, 100);
            return () => {
                clearTimeout(timeout);
                setVideoPlaying(false);
            };
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setVideoPlaying(false);
        }
    }, [isHovered]);

    const handleClick = () => {
        if (isSelectMode && onToggleSelect) {
            onToggleSelect(item.id);
        } else if (onCardClick) {
            onCardClick(item);
        }
    };



    return (
        <div
            className={`${styles.card} ${isSelected ? styles.cardSelected : ''} ${isLimitReached ? styles.cardDisabled : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            {/* ─── Background Corner (Bottom Left) ─── */}
            <img
                src={gradientCorner}
                alt=""
                style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
            />
            {/* ─── Background Corner SVG (Right Middle) ─── */}
            <img
                src={cornerRight}
                alt=""
                style={{ position: 'absolute', top: '60%', right: -1, pointerEvents: 'none', zIndex: 0, transform: 'translateY(-50%)' }}
            />

            {/* ─── Select Mode Overlay ─── */}
            {isSelectMode && (
                <div 
                    key="select-overlay-anim" 
                    className={styles.selectOverlay} 
                />
            )}

            {/* ─── Avatar ─── */}
            <div className={styles.avatarContainer}>
                {authorProfile.avatar_url ? (
                    <img 
                        src={authorProfile.avatar_url} 
                        alt={authorName} 
                        className={`${styles.avatarImage} ${avatarLoaded ? styles.avatarLoaded : styles.avatarLoading}`} 
                    />
                ) : (
                    <div className={styles.avatarFallback}>{authorName.charAt(0).toUpperCase()}</div>
                )}
            </div>

            {/* ─── Author Row ─── */}
            <div className={styles.authorRow}>
                <div className={styles.authorName}>{authorName}</div>
            </div>

            {/* ─── Subtitle Row ─── */}
            <div className={styles.subtitleRow}>
                <div className={styles.subtitleName}>{displayName}</div>
                <div className={styles.subtitleDot}>·</div>
                <div className={styles.subtitleVariant}>Default</div>
            </div>

            {/* ─── Media Container ─── */}
            <div className={styles.mediaContainer}>
                {(item.thumbnail_url || item.preview_image_url) ? (
                    <img
                        src={item.thumbnail_url || item.preview_image_url}
                        alt={displayName}
                        className={`${styles.mediaImage} ${imageLoaded ? styles.mediaLoaded : styles.mediaLoading}`}
                        loading="lazy"
                    />
                ) : (
                    <img 
                        src="https://placehold.co/352x240" 
                        alt="Placeholder" 
                        className={`${styles.mediaImage} ${imageLoaded ? styles.mediaLoaded : styles.mediaLoading}`} 
                        loading="lazy"
                    />
                )}
                
                {!imageLoaded && (
                    <div className={styles.imagePlaceholder}>
                        <div className={styles.shimmerEffect} />
                    </div>
                )}

                {(item.preview_video_url || item.video_url) && isHovered && (
                    <video
                        ref={videoRef}
                        src={item.preview_video_url || item.video_url}
                        className={`${styles.videoPreview} ${(isHovered && videoPlaying) ? styles.videoVisible : ''}`}
                        muted
                        loop
                        playsInline
                        poster={item.thumbnail_url || item.preview_image_url}
                        onPlaying={() => setVideoPlaying(true)}
                    />
                )}
            </div>
        </div>
    );
}
