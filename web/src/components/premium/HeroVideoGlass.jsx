import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

export default function HeroVideoGlass({
    headline = 'Crafted Beyond Limits',
    subheadline = 'Where precision engineering meets uncompromising design.',
    videoUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/Vids/Make_it_wave_202602010003_kn9xo.mp4',
    posterUrl = 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1920&h=1080&fit=crop',
    ctaPrimary = 'Explore',
    ctaSecondary = 'Watch Film',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#',
    stats = [
        { value: '200+', label: 'Clients' },
        { value: '5x', label: 'Faster' },
        { value: '24/7', label: 'Support' }
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
            {/* Immersive Video Layer */}
            {videoUrl && (
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-40' : 'opacity-0'}`}
                    src={videoUrl}
                    poster={posterUrl}
                    autoPlay muted loop playsInline
                />
            )}

            {/* Poster fallback */}
            {(!videoUrl || !videoLoaded) && (
                <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${posterUrl})` }} />
            )}

            {/* Glass & Gradient Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-transparent to-black/80" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />

            {/* Content — Centered Minimalism */}
            <div className="relative z-10 max-w-4xl mx-auto px-8 py-20 text-center flex flex-col items-center justify-center h-full">

                <div className="space-y-4 mb-16">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-[0.15em] uppercase text-white leading-none mix-blend-overlay opacity-90">
                        {headline}
                    </h1>
                    <div className="w-16 h-[0.5px] bg-white/20 mx-auto" />
                    <p className="text-[10px] sm:text-xs text-white/40 max-w-sm mx-auto uppercase tracking-[0.3em] font-medium">
                        {subheadline}
                    </p>
                </div>

                {/* Minimal Buttons */}
                <div className="flex items-center gap-12 mb-32">
                    <a href={ctaPrimaryHref} className="group relative flex items-center gap-3 text-[10px] uppercase font-bold text-white tracking-[0.2em] hover:opacity-60 transition-opacity">
                        {ctaPrimary}
                        <ArrowRight className="w-3 h-3 text-white/30 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <a href={ctaSecondaryHref} className="group flex items-center gap-2 text-[10px] uppercase font-medium text-white/30 hover:text-white transition-colors tracking-[0.2em]">
                        <Play className="w-3 h-3 fill-current opacity-30 group-hover:opacity-100" />
                        {ctaSecondary}
                    </a>
                </div>

                {/* Fine Stat line */}
                {stats && stats.length > 0 && (
                    <div className="flex gap-16 border-t border-white/5 pt-12">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-lg font-extralight text-white/80 tracking-tighter">{stat.value}</div>
                                <div className="text-[7px] text-white/20 uppercase tracking-[0.2em] font-bold">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Corner Graphic hint (Top Right) */}
            <div className="absolute top-12 right-12 w-24 h-24 border-t border-r border-white/5 pointer-events-none" />
        </section>
    );
}
