"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const gradientButtonVariants = cva(
    [
        "inline-flex items-center justify-center",
        "rounded-[11px] min-w-[132px] px-9 py-4",
        "text-base leading-[19px] font-[500]",
        "font-sans font-bold",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "transition-all duration-300 hover:scale-105 active:scale-95",
    ],
    {
        variants: {
            variant: {
                default: "bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.1)] hover:bg-white/90 hover:shadow-[0_6px_20px_rgba(255,255,255,0.2)]",
                variant: "bg-white/5 border border-white/10 text-white backdrop-blur-[10px] hover:bg-white/10 hover:border-white/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const GradientButton = React.forwardRef(
    ({ className, variant, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(gradientButtonVariants({ variant, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }
