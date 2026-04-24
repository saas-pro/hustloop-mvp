import React from "react";

/**
 * Renders children with a playful SVG highlight effect (like a marker highlight).
 * Usage: <HighlightEffect>word</HighlightEffect>
 */
export const HighlightEffect: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`relative inline-block ${className || ""}`}> 
    <svg
      className="absolute left-0 -bottom-2 w-full h-[0.8em] z-0 pointer-events-none"
      viewBox="0 0 100 16"
      fill="none"
      preserveAspectRatio="none"
    >
      <rect
        x="2"
        y="6"
        width="96"
        height="4"
        rx="4"
        fill="#ffe066"
        fillOpacity="0.7"
      />
    </svg>
    <span className="relative z-10">{children}</span>
  </span>
);

export default HighlightEffect; 