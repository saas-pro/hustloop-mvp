'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { SparklesCore } from './sparkles';

interface TimelineCounterProps {
    endDate: string;
    extendedEndDate?: string | null;
    status?: string;
    className?: string;
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
}

export default function TimelineCounter({
    endDate,
    extendedEndDate,
    status,
    className
}: TimelineCounterProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false,
    });

    // Get accent color from CSS variable
    const getAccentColor = () => {
        if (typeof window === 'undefined') return '#84cc16';
        const accentHsl = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        if (!accentHsl) return '#84cc16';

        // Parse HSL values (format: "h s% l%")
        const hslMatch = accentHsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
        if (!hslMatch) return '#84cc16';

        const h = parseInt(hslMatch[1]);
        const s = parseInt(hslMatch[2]) / 100;
        const l = parseInt(hslMatch[3]) / 100;

        // Convert HSL to RGB
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

        // Convert to hex
        const toHex = (n: number) => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const accentColor = getAccentColor();

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const targetDate = new Date(extendedEndDate || endDate);
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference <= 0 || status === 'expired' || status === 'stopped') {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isExpired: true,
                });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                isExpired: false,
            });
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [endDate, extendedEndDate, status]);

    const TimeUnit = ({ value, label, className }: { value: number; label: string; className?: string }) => (
        <div className={cn("flex flex-col items-center", className)}>
            <div className={cn(
                "relative w-14 h-14 md:w-14 md:h-14 rounded-lg flex items-center justify-center",
                "bg-gradient-to-br from-primary/20 to-primary/10",
                "border-2 border-primary/30",
                "shadow-lg shadow-primary/20",
                timeRemaining.isExpired && "from-red-500/20 to-red-500/10 border-red-500/30 shadow-red-500/20"
            )}>
                <span className={cn(
                    "text-2xl md:text-3xl font-bold tabular-nums",
                    timeRemaining.isExpired ? "text-red-500" : "text-primary"
                )}>
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs md:text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wide">
                {label}
            </span>
        </div>
    );

    return (
        <div className='flex justify-center items-center'>
            <div className="space-y-2 relative pb-12 md:pb-20">
                {/* <div className="text-center">
                    <h3 className={cn(
                        "text-lg md:text-xl font-bold mb-1",
                        timeRemaining.isExpired ? "text-red-500" : "text-foreground"
                    )}>
                        {timeRemaining.isExpired ? 'Challenge Ended' : 'Time Remaining'}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        {timeRemaining.isExpired
                            ? 'This challenge has concluded'
                            : extendedEndDate
                                ? 'Extended deadline countdown'
                                : 'Until deadline'}
                    </p>
                </div> */}

                <div className="flex justify-center gap-2 md:gap-4 relative z-10">
                    <TimeUnit value={timeRemaining.days} label="Days" />

                    <div className={`flex items-center text-2xl md:text-3xl font-bold ${timeRemaining.isExpired ? 'text-red-600' : 'text-primary/50'}`}>
                        :
                    </div>

                    <TimeUnit value={timeRemaining.hours} label="Hours" />

                    <div className={`flex items-center text-2xl md:text-3xl font-bold ${timeRemaining.isExpired ? 'text-red-600' : 'text-primary/50'}`}>
                        :
                    </div>

                    <TimeUnit value={timeRemaining.minutes} label="Mins" />

                    <div className={`flex items-center text-2xl md:text-3xl font-bold ${timeRemaining.isExpired ? 'text-red-600' : 'text-primary/50'}`}>
                        :
                    </div>

                    <TimeUnit value={timeRemaining.seconds} label="Secs" />
                </div>

                {extendedEndDate && !timeRemaining.isExpired && (
                    <div className="absolute top-20 w-full h-32 md:h-48">
                        {/* Gradient Lines */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-[2px] w-3/4 blur-sm" />
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-px w-3/4" />
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-accent to-transparent h-[5px] w-1/4 blur-sm" />
                        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-accent to-transparent h-px w-1/4" />

                        <div className="flex-1 flex justify-center mt-[8.5px]">
                            <p className="text-[14px] text-muted-foreground">
                                ⚡ Extended until {new Date(extendedEndDate).toLocaleDateString(
                                    'en-US',
                                    { month: 'short', day: 'numeric', year: 'numeric' }
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* Sparkles Effect - Visible on both mobile and desktop */}
                <div className="absolute top-20 md:top-24 w-full h-32 md:h-48">
                    {/* Gradient Lines - Only show if no extended date */}
                    {!extendedEndDate && !timeRemaining.isExpired && (
                        <>
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-[2px] w-3/4 blur-sm" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-px w-3/4" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-accent to-transparent h-[5px] w-1/4 blur-sm" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-gradient-to-r from-transparent via-accent to-transparent h-px w-1/4" />
                        </>
                    )}

                    {/* Core Sparkles Component */}
                    {useMemo(() => (
                        <SparklesCore
                            id="timeline-sparkles"
                            background="transparent"
                            minSize={0.4}
                            maxSize={1.5}
                            particleDensity={1200}
                            className="w-full h-1/2 z-10"
                            particleColor={timeRemaining.isExpired ? "#ef4444" : accentColor}
                        />
                    ), [timeRemaining.isExpired, accentColor])}

                    <div className="absolute inset-0 w-full h-full bg-background [mask-image:radial-gradient(180px_200px_at_top,transparent_0%,white)] -z-10"></div>
                </div>
            </div>
        </div>
    );
}
