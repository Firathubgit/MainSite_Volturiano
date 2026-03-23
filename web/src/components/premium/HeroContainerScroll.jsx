"use client";
import React from "react";
import { ContainerScroll } from "../ui/container-scroll-animation";

/**
 * HeroContainerScroll Component
 * A high-impact hero section featuring a 3D-tilting container that levels out as the user scrolls.
 * 
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Primary headline
 * @param {string|React.ReactNode} props.subtitle - Secondary headline or emphasis
 * @param {string} props.imageUrl - URL of the image to display inside the card
 */
export default function HeroContainerScroll({
    title = "Unleash the power of",
    subtitle = "Dynamic Motion",
    imageUrl = "https://ui.aceternity.com/_next/image?url=%2Flinear.webp&w=3840&q=75"
}) {
    return (
        <section className="flex flex-col bg-black overflow-hidden py-20">
            <ContainerScroll
                titleComponent={
                    <div className="flex flex-col items-center">
                        <span className="text-3xl md:text-4xl font-semibold text-white/70 mb-2">
                            {title}
                        </span>
                        <h1
                            className="text-4xl md:text-[6rem] font-bold text-white leading-none tracking-tight mb-12"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            {subtitle}
                        </h1>
                    </div>
                }
            >
                <img
                    src={imageUrl}
                    alt="hero"
                    className="mx-auto rounded-2xl object-cover h-full w-full object-left-top"
                    draggable={false}
                />
            </ContainerScroll>
        </section>
    );
}
