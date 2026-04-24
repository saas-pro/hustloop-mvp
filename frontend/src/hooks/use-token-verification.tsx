"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthContext';
import type { UserRole, View } from '@/app/types';

type AuthProvider = 'local' | 'google';

type User = {
    name: string;
    email: string;
    userId: string;
}

interface TokenStatus {
    valid?: boolean;
    expired?: boolean;
    error?: string;
}

export function useTokenVerification({
    setActiveView
}: { setActiveView: (value: View) => void }) {
    const { setAuthData, logout: authLogout } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const logout = useCallback((title: string, description: string) => {
        toast({ title, description, variant: "destructive" });
        authLogout();
        window.dispatchEvent(new Event('storage'));
        setActiveView('home');
        router.push('/');
    }, [router, setActiveView, authLogout, toast]);
    const checkToken = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const [profileRes, tokenRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${API_BASE_URL}/api/check-token`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);
            if (!profileRes.ok) {
                logout("Session expired", "Please log in again.");
                return;
            }
            const userData = await profileRes.json();
            if (userData.user.role === null) {
                logout("Role is not set", "Please log in again to set your role.");
                return;
            }

            // Hydrate Context
            setAuthData({
                user: {
                    name: userData.user.name,
                    email: userData.user.email,
                    userId: userData.user.uid || userData.user.userId,
                    founderRole: userData.user.founder_role
                },
                userRole: userData.user.role,
                founderRole: userData.user.founder_role,
                isLoggedIn: true,
                hasSubscription: !!userData.user.has_subscription,
            });
            const tokenData: TokenStatus = await tokenRes.json();
            if (!tokenRes.ok) {
                logout(
                    tokenData.expired ? "Session expired" : "Invalid token",
                    "Please log in again."
                );
            }
        } catch {
            toast({
                title: "Network error",
                description: "Unable to verify token. Please try again later.",
                variant: "destructive",
            });
        }
    }, [logout, toast, setAuthData]);
    useEffect(() => {
        checkToken();
    }, [checkToken]);
}
