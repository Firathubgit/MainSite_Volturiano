import React from 'react';

export default function HeroImageProduct({
    headline = 'Handcrafted Excellence',
    subheadline = 'Every detail tells a story of precision and heritage.',
    imageUrl = 'https://lgrzyvuobexphamgnmqj.supabase.co/storage/v1/object/public/pics/Gemini_Generated_Image_qbdqw3qbdqw3qbdq.png',
    ctaPrimary = 'Shop Now',
    ctaSecondary = 'View Collection',
    ctaPrimaryHref = '#',
    ctaSecondaryHref = '#collection',
    stats = [
        { value: '100%', label: 'Genuine Leather' },
        { value: 'Est. 2024', label: 'Heritage' },
        { value: '5★', label: 'Rated' }
    ]
}) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F7F7F7]">
            {/* Product Image — Focused Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <img
                    src={imageUrl}
                    alt="Product"
                    className="max-h-[60vh] max-w-[80vw] object-contain drop-shadow-sm opacity-90 transition-transform duration-1000 hover:scale-105"
                />
            </div>

            {/* Extreme Minimalist Content Overlay */}
            <div className="relative z-10 w-full h-screen flex flex-col justify-between p-8 sm:p-16">
                {/* Top Section: Small Header */}
                <div className="max-w-xs transition-all duration-700">
                    <h1 className="text-xl sm:text-2xl font-light text-zinc-900 tracking-tight leading-none mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {headline}
                    </h1>
                    <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-[0.2em] font-medium leading-relaxed">
                        {subheadline}
                    </p>
                </div>

                {/* Bottom Section: CTAs & Stats */}
                <div className="flex flex-col sm:flex-row items-end justify-between gap-8 pb-4">
                    {/* Minimalist CTAs */}
                    <div className="flex gap-12">
                        <a href={ctaPrimaryHref} className="group text-[10px] sm:text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                            {ctaPrimary}
                            <span className="w-8 h-[1px] bg-zinc-900 origin-left scale-x-50 group-hover:scale-x-100 transition-transform" />
                        </a>
                        <a href={ctaSecondaryHref} className="text-[10px] sm:text-xs font-medium text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors">
                            {ctaSecondary}
                        </a>
                    </div>

                    {/* Vertical Fine-print Stats */}
                    {stats && stats.length > 0 && (
                        <div className="flex flex-col gap-4 text-right">
                            {stats.map((stat, i) => (
                                <div key={i} className="space-y-0.5">
                                    <div className="text-sm font-semibold text-zinc-900 tracking-tighter">{stat.value}</div>
                                    <div className="text-[8px] text-zinc-400 uppercase tracking-[0.2em]">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fine scroll line */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 h-16 w-[1px] bg-zinc-200 overflow-hidden">
                <div className="w-full h-full bg-zinc-900 -translate-y-full animate-[scroll-hint_2s_ease-in-out_infinite]" />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scroll-hint {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}} />
        </section>
    );
}
