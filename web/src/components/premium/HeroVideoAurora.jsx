import React, { useRef, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function HeroVideoAurora({
    headline = 'Experience the Future',
    subheadline = 'Crafted with precision. Designed without compromise.',
    videoUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/Vids/Make_it_wave_202602010012_71r83.mp4',
    posterUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop',
    ctaPrimary = 'Get Started',
    ctaSecondary = 'Learn More',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#features',
    stats = [
        { value: '10K+', label: 'Active Users' },
        { value: '99.9%', label: 'Uptime' },
        { value: '4.9', label: 'Rating' }
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
            {/* Video Background */}
            <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={videoUrl}
                poster={posterUrl}
                autoPlay muted loop playsInline
            />

            {/* Poster fallback */}
            {!videoLoaded && (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${posterUrl})` }} />
            )}

            {/* Minimalist Depth Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Content - Extreme Minimalism */}
            <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-8 sm:px-16 flex flex-col justify-end pb-32">

                <div className="max-w-xl">
                    {/* Subtle Tag */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-medium">Digital Horizon</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight mb-6 text-white bg-gradient-to-r from-white via-white to-white/60 bg-clip-text">
                        {headline}
                    </h1>

                    <p className="text-xs sm:text-sm text-white/30 max-w-sm mb-12 leading-relaxed font-light tracking-wide uppercase">
                        {subheadline}
                    </p>

                    {/* Minimal CTAs */}
                    <div className="flex items-center gap-10">
                        <a href={ctaPrimaryHref} className="group text-[10px] font-bold text-white uppercase tracking-[0.3em] flex items-center gap-3 hover:opacity-70 transition-opacity">
                            {ctaPrimary}
                            <ChevronRight className="w-3 h-3 text-white/30 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a href={ctaSecondaryHref} className="text-[10px] font-medium text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors">
                            {ctaSecondary}
                        </a>
                    </div>
                </div>

                {/* Bottom stats row - tiny */}
                {stats && stats.length > 0 && (
                    <div className="absolute bottom-12 right-16 flex items-center gap-12 font-light">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-right">
                                <div className="text-lg text-white/70 tracking-tighter">{stat.value}</div>
                                <div className="text-[7px] text-white/20 uppercase tracking-[0.2em]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
