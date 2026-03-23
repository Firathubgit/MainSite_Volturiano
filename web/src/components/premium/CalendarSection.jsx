"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const CalendarDay = ({
    day,
    isHeader,
}) => {
    const isIndigo = !isHeader && (typeof day === 'number') && (day % 7 === 0 || day % 11 === 0);
    const bgClass =
        !isHeader && isIndigo
            ? "bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]"
            : "text-zinc-500 hover:text-white transition-colors cursor-default";

    return (
        <div
            className={cn(
                "flex h-8 w-8 items-center justify-center transition-all duration-200",
                isHeader ? "opacity-30" : "rounded-xl",
                bgClass
            )}
        >
            <span className={cn("font-medium", isHeader ? "text-[10px]" : "text-sm")}>
                {day}
            </span>
        </div>
    );
};

export function BentoCard({
    children,
    height = "h-auto",
    rowSpan = 8,
    colSpan = 7,
    className = "",
    showHoverGradient = true,
    hideOverflow = true,
    linkTo,
}) {
    const cardContent = (
        <div
            className={cn(
                "group relative flex flex-col rounded-3xl border border-zinc-800 bg-[#0a0a0b] p-8 hover:bg-zinc-900/50 transition-all duration-500",
                hideOverflow && "overflow-hidden",
                height,
                className
            )}
        >
            {linkTo && (
                <div className="absolute bottom-6 right-8 z-[999] flex h-10 w-10 rotate-6 items-center justify-center rounded-full bg-white opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-[-8px] group-hover:rotate-0 group-hover:opacity-100 shadow-xl">
                    <svg
                        className="h-5 w-5 text-indigo-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M17.25 15.25V6.75H8.75m8.5 0L6.75 17.25"
                        ></path>
                    </svg>
                </div>
            )}
            {showHoverGradient && (
                <div className="user-select-none pointer-events-none absolute inset-0 z-0 bg-gradient-to-tl from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100"></div>
            )}
            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </div>
    );

    if (linkTo) {
        return linkTo.startsWith("/") ? (
            <Link to={linkTo} className="block no-underline">
                {cardContent}
            </Link>
        ) : (
            <a
                href={linkTo}
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline"
            >
                {cardContent}
            </a>
        );
    }

    return cardContent;
}

export default function CalendarSection({
    headline = "Any questions about Design?",
    subheadline = "Feel free to reach out to me! I'm here to help you bring your vision to life.",
    ctaText = "Book Now",
    bookingLink = "https://cal.com/aliimam/designali",
    rowSpan = 8,
    colSpan = 7
}) {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString("default", { month: "long" });
    const currentYear = currentDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(
        currentYear,
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const renderCalendarDays = () => {
        let days = [];

        // Headers
        dayNames.forEach(day => {
            days.push(<CalendarDay key={`header-${day}`} day={day} isHeader />);
        });

        // Padding for first week
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(
                <div key={`empty-start-${i}`} className="h-8 w-8" />
            );
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(<CalendarDay key={`date-${i}`} day={i} />);
        }

        return days;
    };

    return (
        <div className="p-8 pb-32">
            <BentoCard rowSpan={rowSpan} colSpan={colSpan}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full">
                    <div>
                        <h2
                            className="mb-6 text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.1]"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            {headline}
                        </h2>
                        <p className="mb-8 text-lg text-zinc-400 max-w-md leading-relaxed">
                            {subheadline}
                        </p>
                        <Button className="rounded-2xl px-8 py-6 h-auto text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] transition-all hover:scale-105 active:scale-95">
                            {ctaText}
                        </Button>
                    </div>

                    <div className="relative group/calendar">
                        <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/50 p-6 transition-all duration-500 group-hover/calendar:border-indigo-500/50 group-hover/calendar:scale-[1.02] backdrop-blur-xl">
                            <div
                                className="rounded-2xl border border-zinc-800/50 p-6 bg-black/20"
                                style={{ boxShadow: "0px 4px 20px 0px rgba(0,0,0,0.5) inset" }}
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <p className="text-base flex items-center gap-2">
                                        <span className="font-bold text-white tracking-tight">
                                            {currentMonth}
                                        </span>
                                        <span className="text-indigo-400 font-medium">{currentYear}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">30 min slot</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center">
                                    {renderCalendarDays()}
                                </div>
                            </div>
                        </div>
                        {/* Decors */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full -z-10 animate-pulse"></div>
                        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -z-10"></div>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
