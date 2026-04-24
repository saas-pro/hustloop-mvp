"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getAuth } from "firebase/auth";
import {
    checkActionCode,
    applyActionCode,
    verifyPasswordResetCode,
    confirmPasswordReset,
} from "firebase/auth";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/api";
import { useEffect } from "react";

function getFriendlyError(code: string, fallback: string) {
    switch (code) {
        case "auth/invalid-action-code":
        case "invalid-action-code":
            return "This verification link is invalid or has already been used.";
        case "auth/expired-action-code":
        case "expired-action-code":
            return "This verification link has expired. Please request a new one.";
        case "auth/user-not-found":
        case "user-not-found":
            return "No account found with this email.";
        case "auth/too-many-requests":
        case "too-many-requests":
            return "Too many attempts. Please try again later.";
        default:
            return fallback;
    }
}

const passwordResetSchema = z
    .object({
        password: z
            .string()
            .min(10, "Password must be at least 10 characters long.")
            .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
            .regex(/[a-z]/, "Must contain at least one lowercase letter.")
            .regex(/[0-9]/, "Must contain at least one number.")
            .regex(/[^A-Za-z0-9]/, "Must contain at least one special character."),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

const resendSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
});

type Action = "resetPassword" | "verifyEmail" | null;
type PasswordResetValues = z.infer<typeof passwordResetSchema>;
type ResendValues = z.infer<typeof resendSchema>;

const ResendVerificationForm = () => {
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<ResendValues>({ resolver: zodResolver(resendSchema) });

    const onSubmit = async (data: ResendValues) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/resend-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (res.ok) {
                // Success: user exists and is not verified
                toast({
                    title: "Verification Email Sent",
                    description: `A verification email has been sent to ${data.email}. Please check your inbox.`,
                });
                router.push("/");
            } else {
                let errorMsg = result.error;
                if (errorMsg?.toLowerCase().includes("already verified")) {
                    errorMsg = "Your email is already verified. You can log in with your password.";
                } else if (errorMsg?.toLowerCase().includes("no account")) {
                    errorMsg = "No account found with that email address.";
                }
                toast({ variant: "destructive", title: "Failed", description: errorMsg });
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Network Error" });
        }
    };

    return (
        <>
            <CardHeader className="text-center">
                <CardTitle>Link Expired or Invalid</CardTitle>
                <CardDescription>
                    This link has expired. Enter your email to receive a new one.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                            {form.formState.isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Resend Verification Link
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </>
    );
};

const ActionHandlerContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { auth } = useFirebaseAuth();
    const { toast } = useToast();

    const [mode, setMode] = React.useState<Action>(null);
    const [actionCode, setActionCode] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [showVerifiedSuccess, setShowVerifiedSuccess] = React.useState(false);
    const [info, setInfo] = React.useState<{ email: string; from: Action } | null>(null);
    const [showResendForm, setShowResendForm] = React.useState(false);
    const form = useForm<PasswordResetValues>({ resolver: zodResolver(passwordResetSchema) });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // If there are no query params, show the ResendVerificationForm immediately
    const modeParam = searchParams.get("mode") as Action;
    const codeParam = searchParams.get("oobCode");
    useEffect(() => {
        if (!modeParam && !codeParam) {
            setShowResendForm(true);
            setLoading(false);
        }
    }, [modeParam, codeParam]);

    const handlePasswordResetSubmit = async (data: PasswordResetValues) => {
        if (!auth || !actionCode) return;
        try {
            await confirmPasswordReset(auth, actionCode, data.password);
            setSuccess(true);
        } catch (err) {
            setError("Failed to reset password. Try again.");
        }
    };

    useEffect(() => {
        if (!auth || !modeParam || !codeParam) return;
        setMode(modeParam);
        setActionCode(codeParam);

        const handleAction = async () => {
            try {
                const actionInfo = await checkActionCode(auth, codeParam);
                const { operation } = actionInfo;
                const { email } = actionInfo.data;

                if (!email) throw new Error("Email missing in action.");

                if (operation === "VERIFY_EMAIL") {
                    await applyActionCode(auth, codeParam);
                    setShowVerifiedSuccess(true);
                    toast({
                        title: "Email Verified!",
                        description: "Please log in to activate your account.",
                    });
                    router.push("/?action=login&from=verification_success");

                } else if (operation === "PASSWORD_RESET") {
                    await verifyPasswordResetCode(auth, codeParam);
                    setInfo({ email, from: "resetPassword" });
                } else {
                    throw new Error("Unsupported action.");
                }
            } catch (err: any) {
                if (err.code === "auth/invalid-action-code") {
                    setShowResendForm(true);
                } else {
                    setError(getFriendlyError(err.code, err.message));
                }
            } finally {
                setLoading(false);
            }
        };

        handleAction();
    }, [auth, modeParam, codeParam, router, toast]);

    if (loading) {
        return (
            <div className="text-center p-8">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                <p>Verifying...</p>
            </div>
        );
    }
    if (showResendForm) return <ResendVerificationForm />;
    if (error)
        return (
            <div className="text-center p-8">
                <XCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                <p className="font-bold">{error}</p>
                <Button onClick={() => router.push("/")} className="mt-4">
                    Go to Homepage
                </Button>
            </div>
        );
    if (showVerifiedSuccess)
        return (
            <div className="text-center p-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
                <p className="font-bold">Email Verified!</p>
                <p className="text-muted-foreground">You can now log in.</p>
                <Button className="mt-4" onClick={() => router.push("/?action=login")}>Go to Login</Button>
            </div>
        );
    if (success && info?.from === 'resetPassword') {
        return (
            <div className="text-center p-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Password Updated!</h2>
                <p className="mb-6">Your password has been reset successfully. You can now log in with your new password.</p>
                <Button onClick={() => router.push('/?action=login')}>Go to Login</Button>
            </div>
        );
    }
    if (mode === "resetPassword" && info)
        return (
            <>
                <CardHeader className="text-center">
                    <CardTitle>Reset Your Password</CardTitle>
                    <CardDescription>Enter a new password for {info.email}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handlePasswordResetSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </>
        );
    return (
        <div className="text-center p-8">
            <CardHeader>
                <CardTitle>Check or Resend Email Verification</CardTitle>
                <CardDescription>
                    Enter your email to check verification status or resend the link.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted">This is the fallback screen.</p>
                <Button className="mt-4" onClick={() => router.push("/")}>Go to Homepage</Button>
            </CardContent>
        </div>
    );
};

export default function AuthActionPage() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div
                className="flex items-center gap-2 cursor-pointer mb-8"
                onClick={() => router.push("/")}
            >
                <Image src="/logo.png" alt="Logo" width={120} height={40} />
            </div>
            <Card className="w-full max-w-md">
                <React.Suspense
                    fallback={
                        <div className="p-12 flex justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    }
                >
                    <ActionHandlerContent />
                </React.Suspense>
            </Card>
        </div>
    );
}