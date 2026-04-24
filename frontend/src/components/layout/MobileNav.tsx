
"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import React from 'react'
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Sun, Moon, Palette, Check, Loader2, UserCircle, LogOut } from 'lucide-react';
import { View } from '@/app/types';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from "next/navigation";
import { Separator } from '@radix-ui/react-separator';
import Image from 'next/image';
import CardNav, { CardNavItem } from '@/components/CardNav';

interface MobileNavProps {
    activeView: View;
    setActiveView: (view: View) => void;
    isLoggedIn: boolean;
    onLogout: () => void;
    isLoading: boolean;
    isStaticPage?: boolean;
    heroVisible?: boolean;
    userRole?: string;
    navOpen?: boolean;
    setNavOpen?: (value: boolean) => void;
}

const navItems: { id: View; label: string; loggedIn?: boolean }[] = [
    { id: "mentors", label: "Mentors" },
    { id: "incubators", label: "Incubators" },
    { id: "msmes", label: "MSMEs" },
    { id: "education", label: "Education" },
    { id: "early-bird", label: "Early Bird" },
    { id: "marketplace", label: "Marketplace" },
];

export function ThemeToggleDropdown({ heroVisible }: MobileNavProps) {
    const { theme, setTheme } = useTheme();
    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'purple', label: 'Purple', icon: Palette },
        { value: 'blue', label: 'Blue', icon: Palette },
        { value: 'green', label: 'Green', icon: Palette },
        { value: 'orange', label: 'Orange', icon: Palette },
        { value: 'blue-gray', label: 'Blue Gray', icon: Palette },
    ];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={`${heroVisible && "text-white"} text-current`}>
                    <Sun className={`h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 `} />
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

const MobileNav = ({ activeView, setActiveView, isLoggedIn, onLogout, isLoading, isStaticPage = false, heroVisible, userRole, navOpen, setNavOpen }: MobileNavProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = React.useState(false);

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

    const handleLogoClick = () => {
        if (pathname === '/terms-of-service' || pathname === '/privacy-policy') {
            setIsNavigating(true);
            router.push('/');
        } else {
            setActiveView("home");
        }
    };

    const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>, sectionId: string) => {
        if (pathname !== '/') {
            router.push('/');
            setTimeout(() => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
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
                className="flex flex-row items-center gap-2 cursor-pointer"
                onClick={handleLogoClick}
            >
                <Image
                    src="/logo.png"
                    alt="Hustloop logo"
                    width={120}
                    height={48}
                    className="h-12 w-auto min-w-[120px] max-w-[200px] object-contain"
                />
                {!inSheet && (
                    <div className="flex items-center gap-2">
                        <Separator orientation="vertical" className="h-6 bg-border w-px" />
                        <p className="text-xs text-muted-foreground">
                            Smart hustle. <br /> Infinite growth..
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const cardNavItems: CardNavItem[] = [
        {
            label: "Main Navigation",
            bgColor: "#ffffff",
            textColor: "#000000",
            links: navItems
                .filter((item) => {
                    if (userRole === 'blogger') {
                        return item.id === 'blog';
                    }
                    return !item.loggedIn || isLoggedIn;
                })
                .map((item) => ({
                    label: userRole === 'blogger' && item.id === 'blog' ? "Workspace" : item.label,
                    href: item.id === 'blog' && userRole === 'blogger' ? "/blogger" : (item.id === "early-bird" ? "#newsletter-section" : `#${item.id}`),
                    ariaLabel: `Navigate to ${item.label}`,
                    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        if (item.id === "early-bird") {
                            handleScrollToSection(e, 'newsletter-section');
                        } else if (item.id === 'blog' && userRole === 'blogger') {
                            router.push('/blogger');
                        } else {
                            setActiveView(item.id);
                        }
                    }
                }))
        },
        {
            label: "Additional",
            bgColor: "#ffffff",
            textColor: "#000000",
            links: [
                {
                    label: "Pricing",
                    href: "/pricing",
                    ariaLabel: "View pricing"
                },
                {
                    label: "Blog",
                    href: "/blog",
                    ariaLabel: "View blog"
                },
                {
                    label: "Contact Us",
                    href: "#contact-section",
                    ariaLabel: "Contact us",
                    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        handleScrollToSection(e, "contact-section");
                    }
                }
            ].filter(link => {
                if (userRole === 'blogger') {
                    return false;
                }
                return true;
            })
        },
        {
            label: "Account",
            bgColor: "#ffffff",
            textColor: "#000000",
            isHorizontal: !isLoggedIn,
            links: isLoggedIn
                ? [
                    {
                        label: "Profile",
                        href: "#profile",
                        ariaLabel: "View profile",
                        icon: <UserCircle className="h-5 w-5" />,
                        iconOnly: true,
                        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            if (userRole === 'blogger') {
                                router.push('/blogger');
                            } else {
                                setActiveView("dashboard");
                            }
                        }
                    },
                    {
                        label: "Logout",
                        href: "#logout",
                        ariaLabel: "Logout",
                        icon: <LogOut className="h-5 w-5" />,
                        iconOnly: true,
                        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            onLogout();
                        }
                    }
                ]
                : [
                    {
                        label: "Login",
                        href: "#login",
                        ariaLabel: "Login to your account",
                        styleVariant: 'primary' as const,
                        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            handleAuthClick('login');
                        }
                    },
                    {
                        label: "Sign Up",
                        href: "#signup",
                        ariaLabel: "Create an account",
                        styleVariant: 'secondary' as const,
                        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            handleAuthClick('signup');
                        }
                    }
                ]
        }
    ];

    return (
        <CardNav
            brandLogo={<BrandLogo />}
            items={cardNavItems}
            className="xl:hidden"
            themeToggle={<ThemeToggleDropdown
                activeView={activeView}
                setActiveView={setActiveView}
                isLoggedIn={isLoggedIn}
                onLogout={onLogout}
                isLoading={isLoading}
                heroVisible={heroVisible}
                userRole={userRole}
            />}
        />
    )
}

export default MobileNav;
