"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

interface CustomCursorWithMotionProps {
  children: React.ReactNode;
  targetRefs: React.RefObject<HTMLElement>[];
}

const CustomCursorWithMotion = ({ children, targetRefs }: CustomCursorWithMotionProps) => {
  useEffect(() => {
    const quickTweens = targetRefs.map((ref) => {
      return {
        x: ref.current ? gsap.quickTo(ref.current, "x", { duration: 0.5, ease: "power3.out" }) : null,
        y: ref.current ? gsap.quickTo(ref.current, "y", { duration: 0.5, ease: "power3.out" }) : null,
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / 20;
      const y = (e.clientY - window.innerHeight / 2) / 20;

      quickTweens.forEach(({ x: tweenX, y: tweenY }) => {
        if (tweenX && tweenY) {
          tweenX(x);
          tweenY(y);
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [targetRefs]);

  return <>{children}</>;
};

export default CustomCursorWithMotion;
