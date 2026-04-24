"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { API_BASE_URL } from "@/lib/api"
import { useAuth } from "@/providers/AuthContext"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { AuthProvider, signOut } from "firebase/auth"

function VerifyContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const router = useRouter()
    const { toast } = useToast()
    const { logout: authLogout, setAuthData, isLoggedIn } = useAuth()
    const { auth } = useFirebaseAuth()
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
    const [status, setStatus] = useState<"loading" | "invalid" | "expired" | "error" | "success" | "already_invited">("loading")
    const [expiredData, setExpiredData] = useState<{ email: string; solution_id: string } | null>(null)
    const [isResending, setIsResending] = useState(false)

    useEffect(() => {
        const handleLogout = async () => {
            if (auth) {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error("Logout failed:", error);
                }
            }
            authLogout();
            toast({
                title: "Please login again",
            });
        };

        const existingToken = localStorage.getItem("token");
        if (existingToken && isLoggedIn) {
            setAuthData({ isLoggedIn: false, user: null, userRole: null, founderRole: null, hasSubscription: false })
            handleLogout();
        }

        if (!token) {
            setStatus("invalid")
            toast({
                variant: "destructive",
                title: "Invalid or missing token"
            })
            return
        }

        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/verify-team-member?token=${token}`);
                const data = await res.json();

                // Handle error responses
                if (!data.success) {
                    // Check for specific "already_invited" error
                    if (data.error === "already_invited") {
                        setStatus("already_invited");
                        toast({
                            variant: "destructive",
                            title: "Already invited",
                        });
                        setTimeout(() => {
                            router.push("/");
                        }, 1000);
                        return;
                    }

                    // Generic error handling
                    setStatus("error");
                    toast({
                        variant: "destructive",
                        title: data.message || "Verification failed",
                    });
                    return;
                }

                // Handle success responses with nested message object
                if (data.message?.status === "expired") {
                    setStatus("expired");
                    setExpiredData({
                        email: data.message.email,
                        solution_id: data.message.solution_id
                    });

                    toast({
                        variant: "destructive",
                        title: "Invitation link expired",
                    });
                    return;
                }

                if (data.message?.status === "success") {
                    setStatus("success");
                    toast({
                        title: "Verification successful",
                        description: "You Can Now Login With Your Credentials"
                    });

                    setTimeout(() => {
                        router.push(data.message.redirect_to || "/");
                    }, 1500);
                    return;
                }

                // Fallback for unexpected responses
                setStatus("error");
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                });

            } catch (error) {
                setStatus("error");
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                });
            }
        };

        verify()
    }, [token, router, toast, authLogout, auth, isLoggedIn, setAuthData])

    const handleResend = async () => {
        if (!expiredData) return
        const id = token;
        setIsResending(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/resend-invite-team-member`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: id })
            })

            if (res.ok) {
                toast({
                    title: "Invitation link resent successfully"
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to resend invitation"
                })
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Failed to resend invitation"
            })
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md text-center py-4">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Image
                            src="https://api.hustloop.com/static/images/logo.png"
                            width={120}
                            height={120}
                            alt="Hustloop Logo"
                            className="rounded-md"
                        />
                    </div>

                    <CardTitle className="text-xl font-semibold">Team Verification</CardTitle>

                    <CardDescription className="mt-2">
                        {status === "loading" && "Verifying your invitation..."}
                        {status === "invalid" && "Invalid or missing token."}
                        {status === "expired" && "Your invitation link has expired."}
                        {status === "error" && "Verification failed."}
                        {status === "success" && "Verified successfully! Redirecting..."}
                        {status === "already_invited" && "Already invited! Redirecting..."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center justify-center gap-4">
                    {(status === "loading" || status === "success" || status === "already_invited") && (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    )}

                    {status === "expired" && (
                        <Button onClick={handleResend} disabled={isResending}>
                            {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resend Invitation
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyContent />
        </Suspense>
    )
}
