"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";


const GlowingText = ({ children }: { children: React.ReactNode }) => {
  const textRef = useRef(null);

  useEffect(() => {
    if (!textRef.current) return;

    gsap.to(textRef.current, {
      textShadow: "0 0 20px rgba(0,255,255,0.2)",
      repeat: -1,
      duration: 2,
      ease: "power2.inOut",
      yoyo: true,
    });
  }, []);

  return (
    <span
      ref={textRef}
      className="inline-block text-5xl md:text-6xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent font-extrabold "
    >
      {children}
    </span>
  );
};

export default GlowingText;
