import React, { useRef, useEffect, useState } from 'react';

export default function HeroVideoSmoke({
    headline = 'Rise Above',
    subheadline = 'Where bold ideas take flight.',
    videoUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/Vids/Make_it_move_202602090108_b7eba.mp4',
    posterUrl = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&h=1080&fit=crop',
    ctaPrimary = 'Get Started',
    ctaSecondary = 'Learn More',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#features',
    stats = [
        { value: '50K+', label: 'Users' },
        { value: '4.8', label: 'Rating' },
        { value: '99%', label: 'Satisfaction' }
    ]
}) {
    const videoRef = useRef(null);
    const [videoLoaded, setVideoLoaded] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.play().catch(() => { });
        const onData = () => setVideoLoaded(true);
        video.addEventListener('loadeddata', onData);
        return () => video.removeEventListener('loadeddata', onData);
    }, []);

    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black">
            {/* Video Layer */}
            <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-60' : 'opacity-0'}`}
                src={videoUrl}
                poster={posterUrl}
                autoPlay muted loop playsInline
            />

            {/* Poster fallback */}
            {!videoLoaded && (
                <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${posterUrl})` }} />
            )}

            {/* Atmospheric Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

            {/* Content - Bottom Centered Minimalism */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-end pb-24 px-6 text-center">

                <div className="mb-10 space-y-3">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-[0.2em] uppercase text-white drop-shadow-sm leading-none">
                        {headline}
                    </h1>
                    <div className="w-8 h-[1px] bg-white/40 mx-auto" />
                    <p className="text-[10px] sm:text-xs text-white/40 max-w-xs mx-auto uppercase tracking-[0.3em] font-medium leading-relaxed">
                        {subheadline}
                    </p>
                </div>

                {/* Minimalist CTAs */}
                <div className="flex items-center gap-12 mb-20">
                    <a href={ctaPrimaryHref} className="group relative text-[9px] uppercase font-bold text-white tracking-[0.4em] hover:opacity-60 transition-opacity">
                        {ctaPrimary}
                        <div className="absolute -bottom-1 left-0 w-full h-[0.5px] bg-white/30 origin-right scale-x-0 group-hover:scale-x-100 transition-transform" />
                    </a>
                    <a href={ctaSecondaryHref} className="text-[9px] uppercase font-medium text-white/30 tracking-[0.4em] hover:text-white transition-colors">
                        {ctaSecondary}
                    </a>
                </div>

                {/* Minimal Bottom Stats - horizontally spaced */}
                {stats && stats.length > 0 && (
                    <div className="flex items-center gap-12 sm:gap-24 opacity-60">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center group">
                                <div className="text-xs font-bold text-white tracking-widest transition-transform group-hover:-translate-y-0.5">{stat.value}</div>
                                <div className="text-[7px] text-white/40 uppercase tracking-[0.2em]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fine-line vertical separator */}
            <div className="absolute top-0 left-12 w-[0.5px] h-full bg-white/5 hidden sm:block" />
        </section>
    );
}
