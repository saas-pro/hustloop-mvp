import React from "react";

/**
 * Renders children with a playful, hand-drawn double underline SVG effect beneath the text.
 * Usage: <HanddrawnUnderline>word</HanddrawnUnderline>
 */
const HanddrawnUnderline: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`relative inline-block ${className || ""}`}> 
    <span className="relative z-10 font-light">{children}</span>
    <span className="block absolute left-0 right-0 bottom-[-0.5em] w-full h-[0.7em] pointer-events-none" aria-hidden="true">
      <svg
        className="w-full h-full"
        viewBox="0 0 50 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {/* Top arc: long, shallow, downward */}
        <path
          d="M3 5 Q 25 8, 47 5"
          stroke="#111"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Bottom arc: short, shallow, downward, centered */}
        <path
          d="M15 7 Q 25 10, 35 7"
          stroke="#111"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  </span>
);

export default HanddrawnUnderline; 