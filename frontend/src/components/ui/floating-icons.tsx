'use client';
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

interface FloatingIconProps {
  src: string;
  alt?: string;
  className?: string;
  delay?: number;
  duration?: number;
  size?: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  index?: number;
}

export const FloatingIcon: React.FC<FloatingIconProps> = ({
  src,
  alt = "floating icon",
  className = '',
  delay = 0,
  duration = 3,
  size = 40,
  top,
  right,
  bottom,
  left,
  index = 0,
}) => {
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!iconRef.current) return;

    const el = iconRef.current;

    const timeline = gsap.timeline({ repeat: -1, delay });

    if (index % 2 === 0) {
      // Rotate for even index
      timeline.to(el, {
        rotation: 360,
        duration,
        ease: "linear",
      });
    } else {
      // Bounce for odd index
      timeline.to(el, {
        y: -15,
        duration: duration,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut",
      });
    }

    return () => {
      timeline.kill();
    };
  }, [delay, duration, index]);

  // Scroll entry animation
  useEffect(() => {
    if (!iconRef.current) return;

    const el = iconRef.current;

    // Set initial state for smooth start
    gsap.set(el, {
      opacity: 0,
      x: left !== undefined ? -30 : right !== undefined ? 30 : 0,
      y: top !== undefined ? -30 : bottom !== undefined ? 30 : 0,
    });

    // Scroll-triggered animation
    gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
      },
    });
  }, [left, right, top, bottom]);

  return (
    <div
      ref={iconRef}
      className={`absolute ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        right,
        bottom,
        left,
        zIndex: 10,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={100}
        height={100}
        style={{ width: '100%', height: '100%' }}
        className="object-contain"
      />
    </div>
  );
};
