"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "./button";

function Hero() {
    const [titleNumber, setTitleNumber] = useState(0);
    const titles = useMemo(
        () => ["amazing", "new", "wonderful", "beautiful", "smart"],
        []
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (titleNumber === titles.length - 1) {
                setTitleNumber(0);
            } else {
                setTitleNumber(titleNumber + 1);
            }
        }, 2000);
        return () => clearTimeout(timeoutId);
    }, [titleNumber, titles]);

    return (
        <div className="w-full bg-black text-white">
            <div className="container mx-auto">
                <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
                    <div>
                        <Button variant="secondary" size="sm" className="gap-4">
                            Read our launch article <MoveRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex gap-4 flex-col">
                        <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
                            <span className="text-white/90">This is something</span>
                            <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 min-h-[1.2em]">
                                &nbsp;
                                {titles.map((title, index) => (
                                    <motion.span
                                        key={index}
                                        className="absolute font-semibold text-white"
                                        initial={{ opacity: 0, y: "100" }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                        animate={
                                            titleNumber === index
                                                ? {
                                                    y: 0,
                                                    opacity: 1,
                                                }
                                                : {
                                                    y: titleNumber > index ? -100 : 100,
                                                    opacity: 0,
                                                }
                                        }
                                    >
                                        {title}
                                    </motion.span>
                                ))}
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl leading-relaxed tracking-tight text-zinc-400 max-w-2xl text-center">
                            Managing a small business today is already tough. Avoid further
                            complications by ditching outdated, tedious trade methods. Our
                            goal is to streamline SMB trade, making it easier and faster than
                            ever.
                        </p>
                    </div>
                    <div className="flex flex-row gap-3">
                        <Button size="lg" className="gap-4" variant="outline">
                            Jump on a call <PhoneCall className="w-4 h-4" />
                        </Button>
                        <Button size="lg" className="gap-4">
                            Sign up here <MoveRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { Hero };
