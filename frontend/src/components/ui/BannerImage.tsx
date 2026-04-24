"use client";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

const themeBackgrounds: Record<string, string> = {
  light: "/images/8.png",
  dark: "/images/dark.png",
  purple: "/images/bg-purple.png",
  blue: "/images/bg-blue.png",
  green: "/images/bg-green.png",
  orange: "/images/bg-orange.png",
  "blue-gray": "/images/bg-blue-gray.png",
};

export default function BannerImage() {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Only render after theme is resolved
  if (!isMounted || !resolvedTheme) return null;

  const imageSrc = themeBackgrounds[resolvedTheme] || themeBackgrounds.light;

  return (
    <Image
      src={imageSrc}
      className="w-full h-screen absolute top-0 left-0 z-[-1]"
      width={1920}
      height={1080}
      alt="Background"
      priority
    />
  );
}
