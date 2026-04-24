"use client";

import React from "react";
import { cn } from "@/lib/utils";
import "./silver-border-button.css";

interface SilverBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
}

export function SilverBorderButton({
    children,
    className,
    ...props
}: SilverBorderButtonProps) {
    return (
        <button
            className={cn("button-file", className)}
            {...props}
        >
            <i></i>
            {children}
        </button>
    );
}
