"use client";

import { useState, useEffect } from "react";
import { type BlogPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Palette, Check, Home, LogOut, BookOpen, ShieldCheck, FileText, XCircle, Eye, CheckCircle } from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/blog/brand-logo";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthContext";
import BloggerDashboard from "@/components/blog/BloggerDashboard";
import BloggerEditor from "@/components/blog/BloggerEditor";
import BlogPreviewModal from "@/components/blog/BlogPreviewModal";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function ThemeToggleDropdown() {
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
        </DropdownMenu>
    );
}

export default function BloggerClient() {
    const { userRole, isLoading: isAuthLoading, logout } = useAuth();
    const [view, setView] = useState<'dashboard' | 'editor' | 'preview'>('dashboard');
    const [editingBlog, setEditingBlog] = useState<BlogPost | undefined>(undefined);
    const [previewBlog, setPreviewBlog] = useState<BlogPost | undefined>(undefined);
    const router = useRouter();

    if (isAuthLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (userRole !== 'blogger' && userRole !== 'admin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
                <div className="relative flex items-center justify-center mb-4">
                    <svg viewBox="0 0 24 24" className="w-32 h-32 text-destructive stroke-current fill-destructive/10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    </svg>
                    <span className="absolute text-destructive font-bold text-3xl font-headline mt-3">401</span>
                </div>
                <h2 className="text-3xl font-bold text-foreground font-headline">Unauthorized Access</h2>

                <Link href="/">
                    <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Return to Home</Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Simple Header with Logo */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <BrandLogo />
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Home className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/blog">
                                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
                                    <BookOpen className="h-5 w-5" />
                                    <span className="sr-only">View Blog</span>
                                </Button>
                            </Link>
                            <ThemeToggleDropdown />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    logout();
                                    router.push("/");
                                }}
                                className="rounded-full text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Logout</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-16">
                {view === 'dashboard' ? (
                    <BloggerDashboard
                        onEdit={(blog) => {
                            setEditingBlog(blog);
                            setView('editor');
                        }}
                        onCreate={() => {
                            setEditingBlog(undefined);
                            setView('editor');
                        }}
                        onPreview={(blog) => {
                            setPreviewBlog(blog);
                            setView('preview');
                        }}
                    />
                ) : view === 'preview' ? (
                    <BlogPreviewModal
                        blog={previewBlog ?? null}
                        open={true}
                        onClose={() => {
                            setPreviewBlog(undefined);
                            setView('dashboard');
                        }}
                    />
                ) : (
                    <BloggerEditor
                        initialData={editingBlog}
                        onBack={() => setView('dashboard')}
                        onSaveSuccess={() => {
                            setView('dashboard');
                        }}
                    />
                )}
            </div>
        </>
    );
}
