import React from "react";

export interface UnderlineEffectProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'single' | 'double';
}

/**
 * Renders children with a playful hand-drawn underline SVG effect.
 * Usage: <UnderlineEffect variant="double">word</UnderlineEffect>
 */
export const UnderlineEffect: React.FC<UnderlineEffectProps> = ({ children, className, variant = 'single' }) => (
  <span className={`relative inline-block ${className || ""}`}> 
    <span className="relative z-10">{children}</span>
    {variant === 'double' ? (
      <svg
        className="absolute left-0 bottom-[-0.4em] w-full h-[2.4em] z-0 pointer-events-none"
        viewBox="0 0 100 50"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M4 42 Q 30 48, 96 40"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M10 48 Q 40 44, 90 46"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ) : (
      <svg
        className="absolute left-0 bottom-0 w-full h-[0.6em] z-0 pointer-events-none"
        viewBox="0 0 100 12"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M2 10 Q 25 2, 50 10 T 98 10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )}
  </span>
);

export default UnderlineEffect; 