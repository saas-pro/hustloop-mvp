"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { UserRole, founderRole } from '@/app/types';

interface User {
    name: string;
    email: string;
    userId: string;
    founderRole?: founderRole | null;
}

interface AuthContextType {
    user: User | null;
    userRole: UserRole | null;
    founderRole: founderRole | null;
    isLoggedIn: boolean;
    hasSubscription: boolean;
    isLoading: boolean;
    setAuthData: (data: AuthData) => void;
    logout: () => void;
}

interface AuthData {
    user: User | null;
    userRole: UserRole | null;
    founderRole: founderRole | null;
    isLoggedIn: boolean;
    hasSubscription: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [founderRole, setFounderRole] = useState<founderRole | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [hasSubscription, setHasSubscription] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const setAuthData = useCallback((data: AuthData) => {
        setUser(data.user);
        setUserRole(data.userRole);
        setFounderRole(data.founderRole);
        setIsLoggedIn(data.isLoggedIn);
        setHasSubscription(data.hasSubscription);
        setIsLoading(false);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setUserRole(null);
        setFounderRole(null);
        setIsLoggedIn(false);
        setHasSubscription(false);
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('hasSubscription');
        localStorage.removeItem('appliedPrograms');
        localStorage.removeItem('authProvider');
        localStorage.removeItem('founder_role');
        window.dispatchEvent(new Event('storage'));
        setIsLoading(false);
    }, []);

    const checkToken = useCallback(async () => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.hustloop.com'}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setAuthData({
                        user: {
                            name: data.user.name,
                            email: data.user.email,
                            userId: data.user.uid || data.user.userId,
                            founderRole: data.user.founder_role
                        },
                        userRole: data.user.role,
                        founderRole: data.user.founder_role,
                        isLoggedIn: true,
                        hasSubscription: !!data.user.has_subscription,
                    });
                } else {
                    logout();
                }
            } else {
                logout();
            }
        } catch (error) {
            console.error("Auth hydration failed:", error);
            setIsLoading(false);
        }
    }, [setAuthData, logout]);

    useEffect(() => {
        checkToken();
    }, [checkToken]);

    return (
        <AuthContext.Provider value={{
            user,
            userRole,
            founderRole,
            isLoggedIn,
            hasSubscription,
            isLoading,
            setAuthData,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
