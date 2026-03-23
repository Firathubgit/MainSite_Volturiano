import React from 'react';

export default function HeroImageHorizon({
    headline = 'The Future Starts Here',
    subheadline = 'Where ambition meets the horizon.',
    imageUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/pics/ChatGPT%20Image%202%20feb.%202026%2003_06_33.png',
    ctaPrimary = 'Get Started',
    ctaSecondary = 'Learn More',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#features',
    stats = [
        { value: '10K+', label: 'Users' },
        { value: '99.9%', label: 'Uptime' },
        { value: '5.0', label: 'Rating' }
    ]
}) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
            {/* Immersive Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] ease-out scale-110"
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    animation: 'slow-zoom 20s infinite alternate'
                }}
            />

            {/* Subtle Depth Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Extreme Minimalist Content */}
            <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-8 sm:px-16 flex flex-col items-center text-center">

                {/* Fine Header */}
                <div className="mb-12">
                    <h1 className="text-2xl sm:text-3xl font-light text-white tracking-[0.1em] mb-4 uppercase" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {headline}
                    </h1>
                    <div className="w-12 h-[1px] bg-white/30 mx-auto" />
                </div>

                <p className="text-[11px] sm:text-xs text-white/40 max-w-md mx-auto mb-16 uppercase tracking-[0.4em] leading-relaxed font-medium">
                    {subheadline}
                </p>

                {/* Minimal CTAs */}
                <div className="flex flex-col sm:flex-row gap-10 items-center justify-center mb-24">
                    <a href={ctaPrimaryHref} className="group text-[10px] uppercase font-bold text-white tracking-[0.3em] flex items-center gap-2 hover:opacity-70 transition-opacity">
                        {ctaPrimary}
                        <span className="w-4 h-4 rounded-full border border-white/30 group-hover:border-white transition-colors flex items-center justify-center text-[8px]">→</span>
                    </a>
                    <a href={ctaSecondaryHref} className="text-[10px] uppercase font-medium text-white/40 tracking-[0.3em] hover:text-white transition-colors">
                        {ctaSecondary}
                    </a>
                </div>

                {/* Floating Fine Stats */}
                {stats && stats.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-16 border-t border-white/5 pt-12">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center group">
                                <div className="text-xl font-light text-white/80 tracking-tighter mb-1 transition-transform group-hover:-translate-y-1">{stat.value}</div>
                                <div className="text-[8px] text-white/20 uppercase tracking-[0.3em]">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}} />
        </section>
    );
}
