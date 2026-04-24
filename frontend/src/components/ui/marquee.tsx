"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarqueeProps {
    children: React.ReactNode;
    direction?: "left" | "right";
    speed?: number;
    pauseOnHover?: boolean;
    className?: string;
    repeat?: number;
}

export const Marquee: React.FC<MarqueeProps> = ({
    children,
    direction = "left",
    speed = 20,
    pauseOnHover = true,
    className,
    repeat = 4,
}) => {
    return (
        <div
            className={cn(
                "group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)]",
                className
            )}
        >
            <motion.div
                className="flex shrink-0 justify-around [gap:var(--gap)] min-w-full"
                animate={{
                    x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
                }}
                transition={{
                    duration: speed,
                    ease: "linear",
                    repeat: Infinity,
                }}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    whiteSpace: 'nowrap'
                }}
                {...(pauseOnHover && {
                    whileHover: { animationPlayState: "paused" },
                })}
            >
                {/* Render children multiple times for a seamless loop */}
                {Array.from({ length: repeat }).map((_, i) => (
                    <div key={i} className="flex shrink-0 justify-around [gap:var(--gap)]">
                        {children}
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
