import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function HeroVideoOrbital({
    headline = 'Precision in Motion',
    subheadline = 'Engineered simplicity. Unmatched clarity.',
    videoUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/Vids/OrbMiddleSpinny.mp4',
    posterUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
    ctaPrimary = 'Get Started',
    ctaSecondary = 'See How',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#features',
    stats = [
        { value: '∞', label: 'Scalable' },
        { value: '0ms', label: 'Downtime' },
        { value: '100%', label: 'Uptime' }
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
            {videoUrl && (
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-30' : 'opacity-0'}`}
                    src={videoUrl}
                    poster={posterUrl}
                    autoPlay muted loop playsInline
                />
            )}

            {/* Poster fallback */}
            {(!videoUrl || !videoLoaded) && (
                <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${posterUrl})` }} />
            )}

            {/* Extreme Radial Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />

            {/* Content — Balanced Asymmetry */}
            <div className="relative z-10 w-full h-full p-12 sm:p-24 flex flex-col justify-between">

                {/* Top Left: Minimal Logo/Indicator */}
                <div className="flex items-center gap-4 group transition-opacity hover:opacity-50 cursor-default">
                    <div className="w-1 h-8 bg-white/20 group-hover:bg-white transition-colors" />
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-bold">Orbital.Series</div>
                </div>

                {/* Center-Right: Redesigned Headline (Smaller) */}
                <div className="self-end max-w-md text-right">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight leading-[0.9] text-white mb-6 mix-blend-difference" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {headline}
                    </h1>
                    <p className="text-[11px] text-white/30 uppercase tracking-[0.3em] font-medium leading-relaxed mb-10">
                        {subheadline}
                    </p>

                    <div className="flex justify-end gap-10">
                        <a href={ctaPrimaryHref} className="group text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            {ctaPrimary}
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a href={ctaSecondaryHref} className="text-[10px] font-medium text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
                            {ctaSecondary}
                        </a>
                    </div>
                </div>

                {/* Bottom Left: Tiny Stats */}
                {stats && stats.length > 0 && (
                    <div className="flex items-center gap-16 border-t border-white/5 pt-8 w-fit">
                        {stats.map((stat, i) => (
                            <div key={i} className="space-y-1">
                                <div className="text-sm font-medium text-white/80 tracking-tighter">{stat.value}</div>
                                <div className="text-[7px] text-white/20 uppercase tracking-[0.3em]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fine-line grid hint */}
            <div className="absolute inset-0 border-[0.5px] border-white/5 pointer-events-none" />
        </section>
    );
}
