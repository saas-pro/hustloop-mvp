"use client";

import { Suspense, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

function UnsubscribePage() {

    const { toast } = useToast()
    const router = useRouter()
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
            toast({
                variant: "destructive",
                title: "Invalid Link",
                description: "This unsubscribe link is missing a token.",
            });
            return;
        }

        fetch(`${API_BASE_URL}/api/unsubscribe-newsletter?token=${token}`)
            .then(async (res) => {
                if (res.status === 200) {
                    toast({
                        title: "Unsubscribed",
                        description: "You have been successfully unsubscribed. We're sorry to see you go!",
                    });
                    router.push('/')
                } else if (res.status === 400 || res.status === 404) {
                    toast({
                        variant: "destructive",
                        title: "Invalid Link",
                        description: "This unsubscribe link is invalid or has already been used.",
                    });
                    router.push('/')
                } else {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Something went wrong. Please contact support.",
                    });
                    router.push('/')
                }
            })
            .catch(() => {
                toast({
                    variant: "destructive",
                    title: "Network Error",
                    description: "Unable to connect to the server. Try again later.",
                });
                router.push('/')
            });
    });

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <h1 className="text-lg font-semibold text-gray-700">
                Processing your request...
            </h1>
        </div>
    );
}

export default function Unsubscribed() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <UnsubscribePage />
        </Suspense>
    );
}
