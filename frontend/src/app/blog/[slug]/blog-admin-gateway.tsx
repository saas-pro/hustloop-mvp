"use client";

import { useState, useEffect, useCallback } from "react";
import { getBlogBySlug, type BlogPost, API_BASE_URL } from "@/lib/api";
import BlogDetailClient from "./blog-detail-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, LogIn, ShieldAlert, Home, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/blog/brand-logo";
import { useAuth } from "@/providers/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

// Google coloured icon (same as login-modal.tsx)
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" {...props}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        <path fill="none" d="M0 0h48v48H0z" />
    </svg>
);

interface BlogAdminGatewayProps {
    slug: string;
}

/**
 * BlogAdminGateway — rendered when a blog is not found in the public feed
 * (i.e., status is draft / pending_review / rejected).
 *
 * Flow:
 *  1. On mount, read token from localStorage.
 *  2. If token present → retry getBlogBySlug with admin token.
 *     - Success → render BlogDetailClient
 *     - 404     → show "not found" page
 *  3. If no token (or ?login=1 in URL) → show login modal.
 *     - After login → retry with token.
 */
export default function BlogAdminGateway({ slug }: BlogAdminGatewayProps) {
    const { setAuthData } = useAuth();
    const { toast } = useToast();
    const { auth } = useFirebaseAuth();

    const [state, setState] = useState<'loading' | 'login' | 'found' | 'notfound'>('loading');
    const [blog, setBlog] = useState<BlogPost | null>(null);

    // Login form
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const tryFetchWithToken = useCallback(async (token: string) => {
        try {
            const res = await getBlogBySlug(slug, token);
            if (res?.blog) {
                setBlog(res.blog);
                setState('found');
            } else {
                setState('notfound');
            }
        } catch {
            setState('notfound');
        }
    }, [slug]);

    const persistAndUpdate = (data: {
        token: string; role: string; name: string; email: string;
        uid?: string; founder_role?: string; hasSubscription?: boolean;
    }, provider: 'local' | 'google') => {
        const userData = { name: data.name || '', email: data.email, userId: data.uid || '' };
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', data.token);
        localStorage.setItem('authProvider', provider);
        setAuthData({
            user: userData,
            userRole: data.role as any,
            founderRole: (data.founder_role || null) as any,
            isLoggedIn: true,
            hasSubscription: data.hasSubscription || false,
        });
        window.dispatchEvent(new Event('storage'));
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams(window.location.search);
        const needsLogin = params.get('login') === '1';

        if (token) {
            tryFetchWithToken(token);
        } else if (needsLogin) {
            setState('login');
            setShowLoginModal(true);
        } else {
            setState('notfound');
        }
    }, [slug, tryFetchWithToken]);

    // ─── Email / password login ─────────────────────────────────────────────
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
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await response.json();

            if (data.action === 'complete-profile' && data.token) {
                window.location.href = `/complete-profile?token=${data.token}`;
                return;
            }

            if (!response.ok) throw new Error(data.error || 'Login failed');

            persistAndUpdate({ ...data, email: loginEmail }, 'local');
            setShowLoginModal(false);
            toast({ title: "Logged in!", description: "Fetching blog..." });
            setState('loading');
            await tryFetchWithToken(data.token);
        } catch (err: any) {
            let description = "Invalid email or password.";
            if (err.code === 'auth/invalid-api-key') {
                description = "API key is not valid. Please check your configuration.";
            } else if (err.message) {
                description = err.message;
            }
            toast({
                title: "Login failed",
                description,
                variant: "destructive"
            });
        } finally {
            setLoginLoading(false);
        }
    };

    // ─── Google login ───────────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
        if (!auth) {
            toast({ variant: 'destructive', title: 'Error', description: 'Authentication service unavailable.' });
            return;
        }
        setGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();

            if (data.action === 'complete-profile' && data.token) {
                // Needs profile — just redirect
                window.location.href = `/complete-profile?token=${data.token}`;
                return;
            }

            if (!res.ok) throw new Error(data.error || 'Google login failed');

            persistAndUpdate({ ...data, uid: data.uid || result.user.uid }, 'google');
            setShowLoginModal(false);
            toast({ title: "Signed in with Google!", description: "Fetching blog..." });
            setState('loading');
            await tryFetchWithToken(data.token);
        } catch (err: any) {
            if (err?.code !== 'auth/popup-closed-by-user') {
                toast({
                    title: "Google sign-in failed",
                    description: err?.message || "An error occurred.",
                    variant: "destructive"
                });
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    // ─── Found: render full blog ────────────────────────────────────────────
    if (state === 'found' && blog) {
        return <BlogDetailClient blog={blog} />;
    }

    // ─── Loading spinner ────────────────────────────────────────────────────
    if (state === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading blog...</p>
            </div>
        );
    }

    // ─── Not found ──────────────────────────────────────────────────────────
    if (state === 'notfound') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
                <ShieldAlert className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-3xl font-bold">Blog Not Found</h1>
                <p className="text-muted-foreground max-w-md">
                    This blog post doesn&apos;t exist or may have been removed.
                </p>
                <Link href="/blog">
                    <Button variant="outline" className="gap-2">
                        <Home className="h-4 w-4" /> Back to Blog
                    </Button>
                </Link>
            </div>
        );
    }

    // ─── Login gate (state === 'login') ─────────────────────────────────────
    return (
        <>
            <div className="min-h-screen flex flex-col">
                {/* Minimal header */}
                <header className="w-full border-b bg-background/95 backdrop-blur px-4 py-4">
                    <div className="container mx-auto flex items-center justify-between">
                        <BrandLogo />
                        <Button size="sm" className="gap-2" onClick={() => setShowLoginModal(true)}>
                            <LogIn className="h-4 w-4" /> Admin Login
                        </Button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Admin Access Required</h1>
                    <p className="text-muted-foreground max-w-md">
                        This blog is not yet published and can only be viewed by administrators.
                        Log in to review and moderate this blog post.
                    </p>
                    <div className="flex gap-3">
                        <Link href="/blog">
                            <Button variant="outline" className="gap-2">
                                <Home className="h-4 w-4" /> All Blogs
                            </Button>
                        </Link>
                        <Button className="gap-2" onClick={() => setShowLoginModal(true)}>
                            <LogIn className="h-4 w-4" /> Login as Admin
                        </Button>
                    </div>
                </div>
            </div>

            {/* Login Modal */}
            <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-primary" /> Admin Login
                        </DialogTitle>
                        <DialogDescription>
                            Log in to preview and moderate this blog post.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {/* Google sign-in */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleGoogleLogin}
                            disabled={googleLoading || loginLoading}
                        >
                            {googleLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <GoogleIcon />
                            }
                            Sign in with Google
                        </Button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        {/* Email / password form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="gw-email">Email</Label>
                                <Input
                                    id="gw-email"
                                    type="email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    placeholder="admin@hustloop.com"
                                    required
                                    autoFocus
                                    disabled={loginLoading || googleLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gw-password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="gw-password"
                                        type={showPassword ? "text" : "password"}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        disabled={loginLoading || googleLoading}
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
                            <DialogFooter className="mt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowLoginModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loginLoading || googleLoading} className="gap-2">
                                    {loginLoading
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging in...</>
                                        : <><LogIn className="h-4 w-4" /> Login</>
                                    }
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
