"use client";

import React from "react";
import { Hero } from "../ui/animated-hero";

/**
 * HeroAnimatedSplit Component
 * A premium hero section featuring a dynamic text switcher with spring animations.
 * 
 * @param {Object} props - Currently using defaults from Hero component internal state
 */
export default function HeroAnimatedSplit() {
    return (
        <section className="bg-black">
            <Hero />
        </section>
    );
}
