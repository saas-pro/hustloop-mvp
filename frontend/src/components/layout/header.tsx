"use client";

import type { View } from "@/app/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, UserCircle, Menu, Sun, Moon, Palette, Check, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Link from "next/link";
import * as React from 'react';
import { Separator } from "../ui/separator";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import { useState } from "react";

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
    isLoggedIn: boolean;
    onLogout: () => void;
    isLoading: boolean;
    isStaticPage?: boolean;
    navOpen: boolean;
    setNavOpen: (value: boolean) => void;
    heroVisible: boolean;
    userRole?: string;
}

const navItems: { id: View; label: string; loggedIn?: boolean }[] = [
    { id: "mentors", label: "Mentors" },
    { id: "incubators", label: "Incubators" },
    { id: "msmes", label: "MSMEs" },
    { id: "education", label: "Education" },
    { id: "pricing", label: "Pricing" },
    { id: "blog", label: "Blog" },
    { id: "dashboard", label: "Dashboard", loggedIn: true },
];

const themeOptions = [
    { value: 'light', label: 'Light', icon: Palette },
    { value: 'dark', label: 'Dark', icon: Palette },
    { value: 'purple', label: 'Purple', icon: Palette },
    { value: 'blue', label: 'Blue', icon: Palette },
    { value: 'green', label: 'Green', icon: Palette },
    { value: 'orange', label: 'Orange', icon: Palette },
    { value: 'blue-gray', label: 'Blue Gray', icon: Palette },
];

export function ThemeToggleDropdown() {
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {themeOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
                        <option.icon className="mr-2 h-4 w-4" />
                        <span>{option.label}</span>
                        {theme === option.value && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>)
}

export default function Header({ activeView, setActiveView, isLoggedIn, onLogout, isLoading, heroVisible, isStaticPage = false, navOpen, setNavOpen, userRole }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = React.useState(false);


    const handleLogoClick = () => {
        if (pathname === '/terms-of-service' || pathname === '/privacy-policy') {
            setIsNavigating(true);
            router.push('/');
        } else {
            setActiveView("home");
        }
    };


    const preloadRecaptcha = () => {
        const scriptId = 'recaptcha-preload-link';
        if (!document.getElementById(scriptId)) {
            const link = document.createElement('link');
            link.id = scriptId;
            link.rel = 'preload';
            link.as = 'script';
            link.href = 'https://www.google.com/recaptcha/enterprise.js?render=6LfZ4H8rAAAAAA0NMVH1C-sCiE9-Vz4obaWy9eUI';
            document.head.appendChild(link);
        }
    };

    const handleAuthClick = (view: 'login' | 'signup') => {
        preloadRecaptcha();
        setActiveView(view);
    };

    const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
        e.preventDefault();
        if (pathname !== '/') {
            router.push('/');
            setTimeout(() => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500); // Wait for page to potentially load
        } else {
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const BrandLogo = ({ inSheet = false }: { inSheet?: boolean }) => {
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
                className="flex flex-col items-center gap-3 cursor-pointer "
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
                        <Separator orientation="vertical" className="h-6 bg-border " />
                        <p className="text-xs text-muted-foreground">
                            Smart hustle. <br /> Infinite growth..
                        </p>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={`relative z-50 ${navOpen ? '' : 'pointer-events-none'}`}>
            <nav className="menu menu-desktop hidden xl:flex pointer-events-auto">
                <DesktopNav
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isLoggedIn={isLoggedIn}
                    onLogout={onLogout}
                    isLoading={isLoading}
                    navOpen={navOpen}
                    setNavOpen={setNavOpen}
                    heroVisible={heroVisible}
                    userRole={userRole}
                />
            </nav>

            <nav className="menu menu-mobile flex xl:hidden">
                <MobileNav
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isLoggedIn={isLoggedIn}
                    onLogout={onLogout}
                    isLoading={isLoading}
                    heroVisible={heroVisible}
                    userRole={userRole}
                    navOpen={navOpen}
                    setNavOpen={setNavOpen}
                />
            </nav>
        </div>


    );
}