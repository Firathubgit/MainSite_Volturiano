import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge tailwind classes with clsx
 * @param {ClassValue[]} inputs - Classes to merge
 * @returns {string} - Merged classes
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
