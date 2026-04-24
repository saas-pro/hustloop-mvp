"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

interface BrandLogoProps {
    inSheet?: boolean;
}

export default function BrandLogo({ inSheet = false }: BrandLogoProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);

    const handleLogoClick = () => {
        if (pathname === "/terms-of-service" || pathname === "/privacy-policy") {
            setIsNavigating(true);
            router.push("/");
        } else if (pathname.startsWith("/blog")) {
            setIsNavigating(true);
            router.push("/");
        } else {
            // Already on home, scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    if (isNavigating) {
        return (
            <div className="flex items-center gap-3 h-[40px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading...</span>
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleLogoClick}
        >
            <Image
                src="/logo.png"
                alt="Hustloop logo"
                width={120}
                height={48}
                className="h-12 w-fit min-w-[120px] max-w-[200px] object-contain"
            />
            {!inSheet && (
                <>
                    <Separator orientation="vertical" className="h-6 bg-border" />
                    <p className="text-xs text-muted-foreground">
                        Smart hustle. <br /> Infinite growth..
                    </p>
                </>
            )}
        </div>
    );
}
