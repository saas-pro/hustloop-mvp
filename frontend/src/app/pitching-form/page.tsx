"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, FileEdit, Send, AlertTriangle, Loader2, CheckCircle, Lock, Home } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Unauthorized from "../unauthorized";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/footer";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"
import { useForm } from "react-hook-form";

const formSchema = z.object({
    pitchDate: z.string().min(1, "Preferred date is required"),
    pitchTime: z.string().min(1, "Preferred time is required"),
    requirements: z.string().optional()
});
type FormValues = z.infer<typeof formSchema>;

function PitchingFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [allowForm, setAllowForm] = useState(false);
    const [reason, setReason] = useState<string | null>(null);

    // Data from validate endpoint
    const [solutionId, setSolutionId] = useState<string | null>(null);
    const [solutionTitle, setSolutionTitle] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);

    const [expired, setExpired] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);

    // Form states
    const [pitchDate, setPitchDate] = useState("");
    const [pitchTime, setPitchTime] = useState("");
    const [requirements, setRequirements] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            pitchDate: "",
            pitchTime: "",
            requirements: ""
        }
    })
    useEffect(() => {
        if (!token) {
            setLoading(false);
            setReason("Token is missing");
            return;
        }

        const fetchStatus = async () => {
            setLoading(true);
            const authToken = localStorage.getItem("token");

            if (!authToken) {
                setUnauthorized(true);
                setReason("Please log in to view this page.");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/pitching/validate?token=${token}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const data = await res.json();

                if (res.ok) {
                    setAllowForm(true);
                    // Assuming success_response returns data in 'message' based on user's previous code snippet
                    const info = data.message || data;
                    setSolutionId(info.solution_id);
                    setSolutionTitle(info.solution_title);
                    setCompanyName(info.company_name);
                    setReason(null);
                } else {
                    setAllowForm(false);
                    const errorMsg = data.error || data.message || "Validation failed";

                    if (errorMsg === "Token expired" || errorMsg === "Token already used") {
                        setExpired(true);
                        setReason("expired");
                        if (data.solution_id) {
                            setSolutionId(data.solution_id);
                        }
                    } else if (res.status === 401 || res.status === 403 || errorMsg === "Unauthorized") {
                        setUnauthorized(true);
                        setReason(errorMsg);
                    } else {
                        setReason(errorMsg);
                    }
                }
            } catch (err) {
                console.error("Error validating token:", err);
                setAllowForm(false);
                setReason("Network error or server unavailable");
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [token]);

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/pitching/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    pitch_date: values.pitchDate,
                    pitch_time: values.pitchTime,
                    requirements: values.requirements
                })
            })

            const data = await res.json()

            if (res.ok) {
                setSubmitted(true)
                setAllowForm(false)
                toast({ title: "Success", description: "Pitching details submitted successfully!" })
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" })
            }
        } catch {
            toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
        } finally {
            setSubmitting(false)
        }
    }

    const handleResendLink = async () => {
        if (!solutionId) return;

        setResending(true);
        try {
            const authToken = localStorage.getItem("token");
            if (!authToken) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to request a new link.",
                    variant: "destructive",
                });
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/pitching/resend/${solutionId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                },
            });

            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Link Sent",
                    description: "A new pitching form link has been sent to your email.",
                });
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to resend link.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to request new link.",
                variant: "destructive",
            });
        } finally {
            setResending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (reason === "Token is missing") {
        return <Unauthorized />;
    }

    return (
        <div className="flex flex-col">
            {/* Logo + Home Button */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <div onClick={() => router.push("/")} className="cursor-pointer">
                    <Image src="/logo.png" alt="Hustloop Logo" width={120} height={120} />
                </div>
                <Link href="/" passHref>
                    <Button variant="outline" size="icon" aria-label="Home">
                        <Home className="h-5 w-5" />
                    </Button>
                </Link>
            </div>
            <main className="flex-grow container relative z-40 ultrawide-fix m-auto px-4 py-12 md:pt-14 mt-16">
                <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                    <Card className="w-full max-w-lg shadow-lg">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-gray-900">Pitching Session Details</CardTitle>
                            {(solutionTitle || companyName) && (
                                <CardDescription className="mt-2 text-gray-600">
                                    For: <span className="font-semibold">{solutionTitle}</span>
                                    {companyName && <span> ({companyName})</span>}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <CheckCircle className="h-16 w-16 text-green-500" />
                                    <h3 className="text-xl font-semibold text-gray-900">Submission Received</h3>
                                    <p className="text-gray-600">
                                        Thank you for submitting your pitching preferences. We will review them and contact you shortly.
                                    </p>
                                </div>
                            ) : expired ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <AlertTriangle className="h-16 w-16 text-yellow-500" />
                                    <h3 className="text-xl font-semibold text-gray-900">Link Expired</h3>
                                    <p className="text-gray-600">
                                        This pitching form link has expired (valid for 24 hours).
                                    </p>
                                    {solutionId && (
                                        <Button onClick={() => handleResendLink()} disabled={resending} className="mt-4">
                                            {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Request New Link
                                        </Button>
                                    )}
                                </div>
                            ) : unauthorized ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <Lock className="h-16 w-16 text-red-500" />
                                    <h3 className="text-xl font-semibold text-gray-900">Access Denied</h3>
                                    <p className="text-gray-600">
                                        {reason || "You are not authorized to view this page."}
                                    </p>
                                    <Button onClick={() => window.location.href = "/"} className="mt-4">
                                        Go to Home
                                    </Button>
                                </div>
                            ) : allowForm ? (
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> Preferred Date <span className="text-red-600">*</span>
                                        </label>
                                        <Input type="date" min={new Date().toISOString().split("T")[0]} {...form.register("pitchDate")} />
                                        {form.formState.errors.pitchDate && (
                                            <p className="text-sm text-red-600">
                                                {form.formState.errors.pitchDate.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> Preferred Time <span className="text-red-600">*</span>
                                        </label>
                                        <Input type="time" {...form.register("pitchTime")} />
                                        {form.formState.errors.pitchTime && (
                                            <p className="text-sm text-red-600">
                                                {form.formState.errors.pitchTime.message}
                                            </p>
                                        )}

                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                            <FileEdit className="h-4 w-4" /> Special Requirements (Optional)
                                        </label>
                                        <Textarea {...form.register("requirements")} placeholder="Optional requirements" />

                                    </div>

                                    <Button type="submit" className="w-full" disabled={submitting}>
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                            </>
                                        ) : (
                                            "Submit Details"
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {reason === "submitted" ? (
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <CheckCircle className="h-16 w-16 text-green-500" />
                                            <h3 className="text-xl font-semibold text-gray-900">Already Submitted</h3>
                                            <p>You have already submitted the pitching details for this solution.</p>
                                        </div>
                                    ) : (
                                        <p>{reason || "Invalid or expired link."}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <div className="w-full mt-6">
                <Footer />
            </div>
        </div>

    );
}

export default function PitchingFormPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <PitchingFormContent />
        </Suspense>
    );
}
