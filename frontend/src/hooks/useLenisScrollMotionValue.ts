// hooks/useLenisScrollMotionValue.ts
import { useEffect, useState } from "react";
import { useMotionValue } from "framer-motion";
import Lenis from "@studio-freight/lenis";

export const useLenisScrollMotionValue = () => {
  const [lenis] = useState(() => new Lenis());
  const scrollY = useMotionValue(0);

  useEffect(() => {
    function raf(time: number) {
      lenis.raf(time);
      scrollY.set(lenis.scroll);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }, [lenis, scrollY]);

  return scrollY;
};
