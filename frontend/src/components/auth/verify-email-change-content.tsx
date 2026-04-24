"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import Image from "next/image";

export default function VerifyEmailChangeContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Missing or invalid verification link.",
            });
            router.replace("/"); // redirect immediately
            return;
        }

        let isCancelled = false;

        const verifyEmailChange = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/verify-email-change`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Verification failed");

                localStorage.clear(); // clear auth token only

                toast({
                    title: "Success",
                    description:
                        "Your email has been updated successfully! Please log in again.",
                });

                setTimeout(() => {
                    if (!isCancelled) router.replace("/");
                }, 1000);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "The verification link is invalid or expired.",
                });
                router.replace("/");
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        verifyEmailChange();
        return () => {
            isCancelled = true;
        };
    }, [token, router, toast]);

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-6">
            {loading && (
                <>
                    <Image
                        src="/logo.png"
                        alt="App Logo"
                        className="h-16 w-auto"
                    />
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <p>Verifying your email...</p>
                    </div>
                </>
            )}
        </div>

    );
}
