import React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders children with a price-tag/offer style highlight.
 * Mimics a physical tag with a pointed end and a small hole.
 */
export const OfferHighlight: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <span className={cn(
        "relative inline-flex items-center px-4 py-1.5 ml-3 mr-1",
        "bg-yellow-400 text-black font-bold text-sm md:text-base",
        "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none transition-shadow duration-200",
        "before:content-[''] before:absolute before:left-[-12px] before:top-0 before:bottom-0 before:w-[12px]",
        "before:bg-yellow-400 before:[clip-path:polygon(100%_0,0_50%,100%_100%)]",
        "after:content-[''] after:absolute after:left-[-4px] after:top-1/2 after:-translate-y-1/2 after:w-2 after:h-2 after:bg-background after:rounded-full after:shadow-inner",
        "-rotate-2 hover:rotate-0 transition-transform duration-200 cursor-default",
        className
    )}>
        <span className="relative z-10">{children}</span>
    </span>
);

export default OfferHighlight;
