import React from 'react';
import './FeatureGridTiles.css';

// --- Card Component ---
const TileCard = ({ icon, title, description }) => {
    return (
        <div className="card">
            <div className="icon">
                {icon}
            </div>
            <h4>{title}</h4>
            <p>{description}</p>

            {/* Shine Effect */}
            <div className="shine"></div>

            {/* Background Tiles & Lines */}
            <div className="background">
                <div className="tiles">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={`tile tile-${i + 1}`}></div>
                    ))}
                </div>
                <div className="line line-1"></div>
                <div className="line line-2"></div>
                <div className="line line-3"></div>
            </div>
        </div>
    );
};

// --- Main Feature Component ---
export default function FeatureGridTiles() {
    const features = [

        {
            title: "Intelligent Layers",
            description: "AI-driven logic strata that optimize performance in real-time. Smart by default.",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 9.5V5.5C4.5 4.94772 4.94772 4.5 5.5 4.5H9.5C10.0523 4.5 10.5 4.94772 10.5 5.5V9.5C10.5 10.0523 10.0523 10.5 9.5 10.5H5.5C4.94772 10.5 4.5 10.0523 4.5 9.5Z" />
                    <path d="M13.5 18.5V14.5C13.5 13.9477 13.9477 13.5 14.5 13.5H18.5C19.0523 13.5 19.5 13.9477 19.5 14.5V18.5C19.5 19.0523 19.0523 19.5 18.5 19.5H14.5C13.9477 19.5 13.5 19.0523 13.5 18.5Z" />
                    <path d="M4.5 19.5L7.5 13.5L10.5 19.5H4.5Z" />
                    <path d="M16.5 4.5C18.1569 4.5 19.5 5.84315 19.5 7.5C19.5 9.15685 18.1569 10.5 16.5 10.5C14.8431 10.5 13.5 9.15685 13.5 7.5C13.5 5.84315 14.8431 4.5 16.5 4.5Z" />
                </svg>
            )
        },
        {
            title: "Secure Core",
            description: "Enterprise-grade encryption woven into every interaction. Safety is not an option.",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            )
        },
        {
            title: "Global Reach",
            description: "Deployed to the edge. Low latency, high availability, ensuring your message travels fast.",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
            )
        }
    ];

    return (
        <section className="py-24 bg-black feature-grid-tiles">
            <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">System Modules</h2>
                <p className="text-zinc-400 max-w-2xl mx-auto">
                    Advanced components engineered for the next generation of digital experiences.
                </p>
            </div>
            <div className="grid">
                {features.map((f, i) => (
                    <TileCard key={i} {...f} />
                ))}
            </div>
        </section>
    );
}
