import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Input } from "./input"
import { Textarea } from "./textarea"

function InputGroup({ className, ...props }) {
    return (
        <div
            data-slot="input-group"
            role="group"
            className={cn(
                "border-input h-[40px] rounded-lg border flex w-full items-center outline-none relative bg-transparent overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all",
                className
            )}
            {...props}
        />
    )
}

const inputGroupAddonVariants = cva(
    "text-muted-foreground h-full gap-2 px-3 text-sm font-medium flex items-center justify-center select-none bg-secondary/20",
    {
        variants: {
            align: {
                "inline-start": "order-first border-r border-input",
                "inline-end": "order-last border-l border-input",
            },
        },
        defaultVariants: {
            align: "inline-start",
        },
    }
)

function InputGroupAddon({
    className,
    align = "inline-start",
    ...props
}) {
    return (
        <div
            role="group"
            data-slot="input-group-addon"
            data-align={align}
            className={cn(inputGroupAddonVariants({ align }), className)}
            onClick={(e) => {
                if (e.target.closest("button")) {
                    return
                }
                e.currentTarget.parentElement?.querySelector("input")?.focus()
            }}
            {...props}
        />
    )
}

function InputGroupInput({
    className,
    ...props
}) {
    return (
        <Input
            data-slot="input-group-control"
            className={cn("h-full w-full rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 flex-1", className)}
            {...props}
        />
    )
}

function InputGroupTextarea({
    className,
    ...props
}) {
    return (
        <Textarea
            data-slot="input-group-control"
            className={cn("rounded-none border-0 bg-transparent py-2 px-3 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent flex-1 resize-none", className)}
            {...props}
        />
    )
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupTextarea,
}
