"use client";

import { type BlogPost, publishBlog, unpublishBlog, rejectBlog, API_BASE_URL } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Calendar, User, Share2, ArrowLeft, Sun, Moon, Palette, Check,
    Home, CheckCircle, XCircle, FileText, ExternalLink,
    ChevronDown, Eye, LogIn, ShieldCheck, X, EyeOff,
    ChevronRight, Clock, Globe, Linkedin, Twitter, Instagram
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/blog/brand-logo";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthContext";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

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

interface BlogDetailClientProps {
    blog: BlogPost;
    nextBlogs?: BlogPost[] | null;
}

export default function BlogDetailClient({ blog, nextBlogs }: BlogDetailClientProps) {
    const { toast } = useToast();
    const { userRole, setAuthData } = useAuth();
    const { auth } = useFirebaseAuth();
    const isAdmin = userRole === 'admin';

    // FIX: token is always null on server, only populated client-side via useEffect
    const [token, setToken] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setToken(localStorage.getItem('token'));
    }, []);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    // Blog status local state for instant feedback
    const [blogStatus, setBlogStatus] = useState<BlogPost['status']>(blog.status);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Reject inline form
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // FAB open/close
    const [fabOpen, setFabOpen] = useState(false);

    // Login modal
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);



    useEffect(() => {
        let previousScrollPosition = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Calculate reading progress independent of header visibility
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (scrollHeight > 0) {
                const progress = (currentScrollY / scrollHeight) * 100;
                setScrollProgress(Math.min(100, Math.max(0, progress)));
            }

            // Determine header visibility
            if (currentScrollY < 10) {
                // Always show at the very top
                setIsHeaderVisible(true);
            } else if (currentScrollY > previousScrollPosition + 5) {
                // Scrolling down (added a small buffer of 5px to prevent jitter)
                setIsHeaderVisible(false);
            } else if (currentScrollY < previousScrollPosition - 5) {
                // Scrolling up
                setIsHeaderVisible(true);
            }

            previousScrollPosition = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); // Initial check

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // --- Admin Actions ---
    const handlePublish = async () => {
        if (!token) return;
        setActionLoading('publish');
        try {
            await publishBlog(blog.id, token);
            setBlogStatus('published');
            setFabOpen(false);
            toast({ title: "Published!", description: "Blog is now live." });
        } catch {
            toast({ title: "Error", description: "Failed to publish.", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnpublish = async () => {
        if (!token) return;
        setActionLoading('unpublish');
        try {
            await unpublishBlog(blog.id, token);
            setBlogStatus('draft');
            setFabOpen(false);
            toast({ title: "Unpublished", description: "Blog moved back to draft." });
        } catch {
            toast({ title: "Error", description: "Failed to unpublish.", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!token || !rejectionReason.trim()) {
            toast({ title: "Reason Required", description: "Please enter a rejection reason.", variant: "destructive" });
            return;
        }
        setActionLoading('reject');
        try {
            await rejectBlog(blog.id, rejectionReason, token);
            setBlogStatus('rejected');
            setShowRejectForm(false);
            setRejectionReason("");
            setFabOpen(false);
            toast({ title: "Rejected", description: "Blog rejected and author notified." });
        } catch {
            toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    // --- Login ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        try {
            if (!auth) throw new Error('Authentication service is not available.');
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            const firebaseUser = userCredential.user;

            if (!firebaseUser.emailVerified) {
                await sendEmailVerification(firebaseUser);
                toast({
                    variant: "destructive",
                    title: "Email Not Verified",
                    description: "Please check your inbox to verify your email. A new verification link has been sent.",
                });
                return;
            }

            const idToken = await firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();

            if (data.action === 'complete-profile' && data.token) {
                window.location.href = `/complete-profile?token=${data.token}`;
                return;
            }

            if (!res.ok) throw new Error(data.error || 'Login failed');

            const userData = {
                name: data.name || data.user?.name || '',
                email: loginEmail,
                userId: data.uid || data.user?.uid || ''
            };
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', data.token);
            localStorage.setItem('authProvider', 'local');
            setToken(data.token);

            setAuthData({
                user: userData,
                userRole: data.role,
                founderRole: data.founder_role || null,
                isLoggedIn: true,
                hasSubscription: data.hasSubscription || false,
            });

            window.dispatchEvent(new Event('storage'));
            setShowLoginModal(false);
            toast({ title: "Welcome back!", description: "You are now logged in." });
        } catch (err: any) {
            let description = "Invalid email or password.";
            if (err.code === 'auth/invalid-api-key') {
                description = "API key is not valid. Please check your configuration.";
            } else if (err.message) {
                description = err.message;
            }
            toast({ title: "Login failed", description, variant: "destructive" });
        } finally {
            setLoginLoading(false);
        }
    };

    // --- Share ---
    const shareUrl = `https://hustloop.com/blog/${blog.slug}`;

    const shareOnLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank", "width=600,height=400");
    };
    const shareOnTwitter = () => {
        window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(blog.title)}`, "_blank", "width=600,height=400");
    };
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast({ title: "Link copied!" });
        } catch {
            toast({ title: "Failed to copy", variant: "destructive" });
        }
    };

    const getStatusBadge = (status: BlogPost['status']) => {
        switch (status) {
            case 'draft': return <Badge variant="outline" className="flex items-center gap-1 text-xs"><FileText className="h-3 w-3" /> Draft</Badge>;
            case 'pending_review': return <Badge className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Eye className="h-3 w-3" /> Pending Review</Badge>;
            case 'published': return <Badge className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3" /> Published</Badge>;
            case 'rejected': return <Badge variant="destructive" className="flex items-center gap-1 text-xs"><XCircle className="h-3 w-3" /> Rejected</Badge>;
        }
    };

    return (
        <>
            {/* Header */}
            <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}>
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
                            <ThemeToggleDropdown />
                        </div>
                    </div>
                </div>
                {/* Reading Progress Tracker (now at bottom of header) */}
                <div
                    className={`absolute bottom-0 left-0 w-full h-[4px] z-[60] bg-primary/20 translate-y-full transition-opacity duration-300 ${isHeaderVisible ? "opacity-0" : "opacity-100"}`}
                >
                    <div
                        className="h-full bg-primary shadow-[0_0_2px_rgba(0,0,0,0.3)] dark:shadow-[0_0_2px_rgba(255,255,255,0.3)] transition-all duration-150 ease-out"
                        style={{ width: `${scrollProgress}%` }}
                    />
                </div>
            </header>

            {/* ===== ADMIN FLOATING ACTION BUTTON (FAB) ===== */}
            {isAdmin && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end gap-3">

                    {/* Expandable panel — slides up / fades in */}
                    <div
                        className={`flex flex-col items-end gap-2 transition-all duration-300 origin-bottom ${fabOpen
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 translate-y-4 pointer-events-none"
                            }`}
                    >
                        {/* Header row inside panel */}
                        <div className="bg-card border shadow-xl rounded-2xl p-4 w-[calc(100vw-2rem)] max-w-xs sm:w-80">
                            <div className="flex flex-col gap-1 mb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold">Admin Controls</span>
                                    </div>
                                    {getStatusBadge(blogStatus)}
                                </div>
                            </div>



                            {/* Action buttons */}
                            <div className="flex flex-col gap-2">
                                {/* Publish */}
                                {(blogStatus === 'draft' || blogStatus === 'pending_review' || blogStatus === 'rejected') && (
                                    <Button
                                        size="sm"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 justify-start"
                                        onClick={handlePublish}
                                        disabled={!!actionLoading}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {actionLoading === 'publish' ? "Publishing..." : "Publish Blog"}
                                    </Button>
                                )}

                                {/* Unpublish */}
                                {blogStatus === 'published' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-yellow-600 border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 gap-2 justify-start"
                                        onClick={handleUnpublish}
                                        disabled={!!actionLoading}
                                    >
                                        <FileText className="h-4 w-4" />
                                        {actionLoading === 'unpublish' ? "Unpublishing..." : "Unpublish"}
                                    </Button>
                                )}

                                {/* Reject */}
                                {blogStatus === 'pending_review' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-red-500 border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2 justify-start"
                                        onClick={() => setShowRejectForm(!showRejectForm)}
                                        disabled={!!actionLoading}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showRejectForm ? 'rotate-180' : ''}`} />
                                    </Button>
                                )}

                                {/* Reject form */}
                                {showRejectForm && (
                                    <div className="space-y-2 pt-1">
                                        <Label className="text-xs">Rejection Reason <span className="text-destructive">*</span></Label>
                                        <Textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="e.g. Needs more detail, images missing..."
                                            rows={2}
                                            className="text-xs"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" variant="destructive" className="flex-1" onClick={handleReject} disabled={actionLoading === 'reject'}>
                                                {actionLoading === 'reject' ? "..." : "Confirm"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Divider */}
                                <hr className="border-muted" />

                                {/* Open Dashboard */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full gap-2 justify-start text-muted-foreground hover:text-foreground"
                                    onClick={() => window.open('/blogger', '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Dashboard
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* FAB Toggle Button */}
                    <button
                        onClick={() => { setFabOpen(!fabOpen); if (fabOpen) setShowRejectForm(false); }}
                        className={`h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${fabOpen
                            ? "bg-muted text-muted-foreground rotate-0"
                            : "bg-primary text-primary-foreground"
                            }`}
                        title="Admin Actions"
                    >
                        {fabOpen
                            ? <X className="h-6 w-6" />
                            : <ShieldCheck className="h-6 w-6" />
                        }
                    </button>
                </div>
            )}

            {/* ===== LOGIN MODAL ===== */}
            <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-primary" />
                            Admin Login
                        </DialogTitle>
                        <DialogDescription>
                            Log in to access admin moderation controls for this blog post.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLogin} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input
                                id="login-email"
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="admin@hustloop.com"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="pr-16"
                                />
                                <span className={`text-xs absolute right-10 top-1/2 -translate-y-1/2 ${loginPassword.length >= 10 ? "text-gray-500" : "text-red-500"}`}>{loginPassword.length || 0}</span>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setShowLoginModal(false)}>
                                Continue as Guest
                            </Button>
                            <Button type="submit" disabled={loginLoading} className="gap-2">
                                {loginLoading ? "Logging in..." : <><LogIn className="h-4 w-4" /> Login</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ===== BLOG CONTENT ===== */}
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <Link href="/blog">
                        <Button variant="ghost" className="mb-6">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Blog
                        </Button>
                    </Link>

                    {/* Two-column layout on lg screens */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                        {/* Main Article Column */}
                        <div className="lg:col-span-8">
                            <article>
                                <header className="mb-8">
                                    <h1 className="text-4xl md:text-5xl font-bold mb-4">{blog.title}</h1>

                                    {blog.excerpt && (
                                        <p className="text-xl text-muted-foreground mb-6">{blog.excerpt}</p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                                        {blog.author?.name && <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span className="font-medium">{blog.author?.name}</span>
                                        </div>}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(blog.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pb-6 border-b">
                                        <span className="text-sm font-medium mr-2">Share:</span>
                                        <Button variant="outline" size="sm" onClick={shareOnLinkedIn} className="gap-2">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                            </svg>
                                            LinkedIn
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={shareOnTwitter} className="gap-2">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                            X
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
                                            <Share2 className="h-4 w-4" />
                                            Copy Link
                                        </Button>
                                    </div>
                                </header>

                                {blog.featured_image_url && (
                                    <div className="relative w-full h-[400px] md:h-[500px] mb-8 rounded-lg overflow-hidden">
                                        <Image src={blog.featured_image_url} alt={blog.title} fill className="object-cover" priority />
                                    </div>
                                )}

                                {blog.youtube_embed_url && (
                                    <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
                                        <iframe
                                            src={blog.youtube_embed_url}
                                            title="YouTube video"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 w-full h-full"
                                        />
                                    </div>
                                )}

                                <div className="mb-8 p-1">
                                    <div
                                        className="blog-content max-w-none text-foreground"
                                        dangerouslySetInnerHTML={{ __html: blog.content }}
                                    />
                                </div>

                                {/* Tags and Social Media at Bottom */}
                                <div className="mb-8">
                                    {blog.tags && blog.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {blog.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-sm">{tag}</Badge>
                                            ))}
                                        </div>
                                    )}

                                    {(blog.linkedin_url || blog.x_url || blog.instagram_url || blog.website_url || blog.youtube_url) && (
                                        <div className="flex items-center gap-4 pt-6 border-t border-border/40">
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Follow the Startup</span>
                                            <div className="flex items-center gap-3">
                                                {blog.linkedin_url && (
                                                    <a href={blog.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="LinkedIn">
                                                        <Linkedin className="h-5 w-5" />
                                                    </a>
                                                )}
                                                {blog.x_url && (
                                                    <a href={blog.x_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="X / Twitter">
                                                        <Twitter className="h-5 w-5" />
                                                    </a>
                                                )}
                                                {blog.instagram_url && (
                                                    <a href={blog.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                                                        <Instagram className="h-5 w-5" />
                                                    </a>
                                                )}
                                                {blog.youtube_url && (
                                                    <a href={blog.youtube_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="YouTube">
                                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                                    </a>
                                                )}
                                                {blog.website_url && (
                                                    <a href={blog.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Website">
                                                        <Globe className="h-5 w-5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Hustloop Branding Card */}
                                <Card className="mb-8 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10">
                                        <Image src="/hustloop_logo.png" alt="Hustloop Background" fill className="object-cover object-left" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-background" />
                                    </div>
                                    <CardContent className="pt-6 relative z-10">
                                        <div className="flex items-center justify-between gap-6 flex-wrap">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    <Image src="/hustloop_logo.png" alt="Hustloop" width={64} height={64} className="object-contain" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">Hustloop</h3>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <p className="text-sm font-medium">Follow us for more blogs</p>
                                                <div className="flex items-center gap-3">
                                                    <a href="https://linkedin.com/company/hustloop" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-colors">
                                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                    </a>
                                                    <a href="https://x.com/hustloop" target="_blank" aria-label="X" className="text-muted-foreground hover:text-black [.theme-dark_&]:hover:text-white [.theme-purple_&]:hover:text-white [.theme-orange_&]:hover:text-white [.theme-blue-gray_&]:hover:text-white transition-colors">
                                                        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
                                                            <title>X</title>
                                                            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.931L18.901 1.153Zm-1.653 19.57h2.608L6.856 2.597H4.062l13.185 18.126Z" />
                                                        </svg>
                                                    </a>
                                                    <a href="https://instagram.com/hustloop_official" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#E1306C] transition-colors">
                                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                                    </a>
                                                    <a href="https://www.youtube.com/@hustloop_talks" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#FF0000] transition-colors" title="YouTube">
                                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="lg:hidden sticky top-[89px] self-start space-y-4">
                                    {nextBlogs && nextBlogs.length > 0 ? (
                                        <Card className="overflow-hidden border-border/60 shadow-sm">
                                            <div className="p-4 border-b border-border/40 bg-muted/30">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <ChevronRight className="h-3.5 w-3.5" /> Suggested Blogs
                                                </p>
                                            </div>

                                            <div className="flex flex-col divide-y divide-border/40">
                                                {nextBlogs.map((nb) => (
                                                    <Link key={nb.id} href={`/blog/${nb.slug}`} className="block group hover:bg-muted/30 transition-colors p-4">
                                                        <div className="space-y-2">
                                                            {nb.tags && nb.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {nb.tags.slice(0, 3).map((tag) => (
                                                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{tag}</Badge>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                                                {nb.title}
                                                            </h3>

                                                            {nb.excerpt && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2">{nb.excerpt}</p>
                                                            )}

                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                                                                <span>{new Date(nb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </Card>
                                    ) : (
                                        <Card className="p-6 text-center border-border/60 shadow-sm bg-muted/20">
                                            <p className="text-sm text-muted-foreground">You&apos;ve reached the latest article!</p>
                                            <Link href="/blog">
                                                <Button variant="outline" size="sm" className="mt-3">
                                                    <ArrowLeft className="mr-2 h-3 w-3" /> All Articles
                                                </Button>
                                            </Link>
                                        </Card>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t">
                                    <Link href="/blog">
                                        <Button variant="outline">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back to Blog
                                        </Button>
                                    </Link>
                                </div>
                            </article>
                        </div>

                        {/* Right Sidebar — sticky "Suggested Blogs" panel */}
                        <div className="lg:col-span-4 hidden lg:block sticky top-[89px] self-start space-y-4">
                            {nextBlogs && nextBlogs.length > 0 ? (
                                <Card className="overflow-hidden border-border/60 shadow-sm">
                                    <div className="p-4 border-b border-border/40 bg-muted/30">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <ChevronRight className="h-3.5 w-3.5" /> Suggested Blogs
                                        </p>
                                    </div>

                                    <div className="flex flex-col divide-y divide-border/40">
                                        {nextBlogs.map((nb) => (
                                            <Link key={nb.id} href={`/blog/${nb.slug}`} className="block group hover:bg-muted/30 transition-colors p-4">
                                                <div className="space-y-2">
                                                    {nb.tags && nb.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {nb.tags.slice(0, 3).map((tag) => (
                                                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{tag}</Badge>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                                        {nb.title}
                                                    </h3>

                                                    {nb.excerpt && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{nb.excerpt}</p>
                                                    )}

                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                                                        <span>{new Date(nb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </Card>
                            ) : (
                                <Card className="p-6 text-center border-border/60 shadow-sm bg-muted/20">
                                    <p className="text-sm text-muted-foreground">You&apos;ve reached the latest article!</p>
                                    <Link href="/blog">
                                        <Button variant="outline" size="sm" className="mt-3">
                                            <ArrowLeft className="mr-2 h-3 w-3" /> All Articles
                                        </Button>
                                    </Link>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
