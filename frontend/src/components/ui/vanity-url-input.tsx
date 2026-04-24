"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface VanityUrlInputProps {
    baseUrl: string;
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export function VanityUrlInput({
    baseUrl,
    value,
    onChange,
    label,
    placeholder = "your-custom-slug",
    id = "vanity-url",
    disabled = false,
    className,
    error,
}: VanityUrlInputProps) {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
            )}
            <div
                className={cn(
                    "flex items-center rounded-md border transition-all",
                    isFocused
                        ? "ring-2 ring-ring ring-offset-2 ring-offset-background border-primary"
                        : "border-input",
                    disabled && "opacity-50 cursor-not-allowed",
                    error && "border-destructive"
                )}
            >
                {/* Non-editable base URL */}
                <div className="flex items-center p-2 bg-muted w-1/2 text-muted-foreground text-sm rounded-l-md border-r select-none">
                    {baseUrl}
                </div>

                {/* Editable slug input */}
                <Input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
