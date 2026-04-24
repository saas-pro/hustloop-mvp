"use client";

import React from 'react';

interface CounterProps {
    value: number;
    fontSize?: number;
    padding?: number;
    places?: number[];
    gap?: number;
    borderRadius?: number;
    horizontalPadding?: number;
    textColor?: string;
    fontWeight?: string;
    containerStyle?: React.CSSProperties;
    counterStyle?: React.CSSProperties;
    digitStyle?: React.CSSProperties;
    gradientHeight?: number;
    gradientFrom?: string;
    gradientTo?: string;
    topGradientStyle?: React.CSSProperties;
    bottomGradientStyle?: React.CSSProperties;
}

const Counter: React.FC<CounterProps> = ({
    value,
    fontSize = 100,
    padding = 0,
    places = [100, 10, 1],
    gap = 8,
    borderRadius = 4,
    horizontalPadding = 8,
    textColor = 'hsl(var(--primary))',
    fontWeight = 'bold',
    containerStyle = {},
    counterStyle = {},
    digitStyle = {},
    gradientHeight = 16,
    gradientFrom = 'hsl(var(--background))',
    gradientTo = 'transparent',
    topGradientStyle = {},
    bottomGradientStyle = {},
}) => {
    const digitHeight = fontSize + padding;

    const getDigitForPlace = (value: number, place: number): number => {
        return Math.floor(value / place) % 10;
    };

    return (
        <div
            style={{
                display: 'inline-flex',
                gap: `${gap}px`,
                ...containerStyle,
            }}
        >
            {places.map((place, index) => {
                const digit = getDigitForPlace(value, place);

                return (
                    <div
                        key={index}
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            height: `${digitHeight}px`,
                            borderRadius: `${borderRadius}px`,
                            padding: `0 ${horizontalPadding}px`,
                            ...counterStyle,
                        }}
                    >
                        {/* Top gradient overlay */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: `${gradientHeight}px`,
                                background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
                                pointerEvents: 'none',
                                zIndex: 1,
                                ...topGradientStyle,
                            }}
                        />

                        {/* Digit container */}
                        <div
                            style={{
                                position: 'relative',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ...digitStyle,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    transition: 'transform 0.3s ease-out',
                                    transform: `translateY(-${digit * digitHeight}px)`,
                                }}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <div
                                        key={num}
                                        style={{
                                            height: `${digitHeight}px`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: `${fontSize}px`,
                                            fontWeight,
                                            color: textColor,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom gradient overlay */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: `${gradientHeight}px`,
                                background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
                                pointerEvents: 'none',
                                zIndex: 1,
                                ...bottomGradientStyle,
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default Counter;
