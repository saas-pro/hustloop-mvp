"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import styles from "./page.styles.module.css";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Home, Loader2, X } from 'lucide-react'
import Image from "next/image";
import * as React from 'react';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Header from "@/components/layout/header";
import AnimatedColumns from "./animatedColumns";
import { API_BASE_URL } from "@/lib/api";
import { gsap } from "gsap";
import { PaymentModal } from "@/components/payment-modal"; // Ensure this path is correct

const registrationSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    phone: z
        .string()
        .regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
    eventName: z.string(),
    whoYouAre: z.string().min(1, { message: "Please select who you are." }),
    otherWhoYouAre: z.string().optional(),
}).refine((data) => {
    if (data.whoYouAre === 'other' && !data.otherWhoYouAre) {
        return false;
    }
    return true;
}, {
    message: "Please specify who you are.",
    path: ["otherWhoYouAre"],
});

type RegistrationSchema = z.infer<typeof registrationSchema>;

function RegistrationForm() {

    const { toast } = useToast();
    const router = useRouter();

    const [eventName, setEventName] = useState("SIF's-Aignite");
    const [isEventEnabled, setIsEventEnabled] = useState<boolean | null>(null);
    const [isCheckingEvent, setIsCheckingEvent] = useState(true);
    const pathname = usePathname();

    // Check event availability on component mount
    useEffect(() => {
        const checkEventAvailability = async () => {
            try {
                // Fetch event details based on the current registration route
                const response = await fetch(`${API_BASE_URL}/api/events/by-route?route=${pathname}`);

                if (response.ok) {
                    const data = await response.json();

                    // Check if registration is enabled for this specific event
                    if (!data.register_enabled) {
                        router.push('/404');
                        return;
                    }

                    setEventName(data.title);
                    setIsEventEnabled(true);
                } else {
                    // If event not found or not visible, redirect to 404
                    router.push('/404');
                }
            } catch (error) {
                console.error('Error checking event availability:', error);
                router.push('/404');
            } finally {
                setIsCheckingEvent(false);
            }
        };

        checkEventAvailability();
    }, [router, pathname]);

    const form = useForm<RegistrationSchema>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            eventName: eventName,
            whoYouAre: "",
            otherWhoYouAre: "",
        },
    });

    // Update form's eventName when it's fetched
    useEffect(() => {
        form.setValue('eventName', eventName);
    }, [eventName, form]);

    const { formState: { isSubmitting }, reset, watch, getValues } = form; // Added getValues

    const whoYouAreValue = watch("whoYouAre");
    const isOtherSelected = whoYouAreValue === "other";

    // State for managing the payment modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [currentPaymentLink, setCurrentPaymentLink] = useState('');
    const [currentQrCodeImageUrl, setCurrentQrCodeImageUrl] = useState(''); // Added QR Code Image URL
    const [currentUserName, setCurrentUserName] = useState('');
    const onInitialFormSubmit = async (data: RegistrationSchema) => {


        const payload = {
            full_name: data.name,
            email_address: data.email,
            phone_number: data.phone,
            event: data.eventName,
            who_you_are: data.whoYouAre === 'other' ? data.otherWhoYouAre : data.whoYouAre,
        };

        toast({
            title: 'Registration Initiated!',
            description: `Hi ${data.name}, your registration is started. Proceed to payment.`,
        });

        // Use API response to generate payment link & QR code if available
        const paymentLink = `https://rzp.io/rzp/GuIJIk1`;
        const qrCodeImageUrl = "qr-code.jpeg";

        setCurrentPaymentLink(paymentLink);
        setCurrentQrCodeImageUrl(qrCodeImageUrl);
        setCurrentUserName(data.name);
        setIsPaymentModalOpen(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/agnite-registrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
        } catch (error: any) {
            console.error("Registration failed:", error);
            toast({
                title: 'Registration Failed',
                description: error.message || 'Could not register. Please try again.',
                variant: 'destructive',
            });
        }
    };



    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
    };

    // Show loading while checking event availability
    if (isCheckingEvent) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-accent" />
            </div>
        );
    }

    // Don't render if event is not enabled
    if (!isEventEnabled) {
        return null;
    }

    return (
        <div className="text-white">
            <div className="flex items-center justify-between px-4">
                <div onClick={() => router.push('/')} className="cursor-pointer">
                    <Image src="/logo.png" alt="Hustloop Logo" width={120} height={120} className="h-12 w-auto min-w-[120px] max-w-[200px] object-contain" />
                </div>
                <div onClick={() => router.push('/')} className="pointer-events-auto cursor-pointer typeform-trigger rounded-md border border-solid w-[3.5rem] h-[3.5rem] flex items-center justify-center transition-colors backdrop-blur-sm z-10 bg-white/10">
                    <Home />
                </div>

            </div>
            <div className="w-full ">
                <div className="relative w-full">

                    <CardHeader >
                        <CardTitle className="text-3xl font-bold font-headline capitalize">Register for {eventName}</CardTitle>
                        <CardDescription>Complete the form below to secure your spot.</CardDescription>
                    </CardHeader>

                </div>

                <CardContent>
                    <Form {...form}>
                        {/* The form's onSubmit now calls onInitialFormSubmit */}
                        <form onSubmit={form.handleSubmit(onInitialFormSubmit)} className="space-y-6 ">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name<span style={{ color: 'red' }}>*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter your full name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address<span style={{ color: 'red' }}>*</span></FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="you@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Phone Number<span style={{ color: 'red' }}>*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                maxLength={10}
                                                {...field}
                                                onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/\D/g, "");
                                                    field.onChange(numericValue);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="whoYouAre"
                                render={({ field }) => {
                                    const options = [
                                        { value: "Marketing Teams", label: "Marketing Teams" },
                                        { value: "Founders", label: "Founders" },
                                        { value: "CEO", label: "CEO" },
                                        { value: "Manager", label: "Manager" },
                                        { value: "other", label: "Other" },
                                    ];

                                    return (
                                        <FormItem>
                                            <FormLabel>Who You Are<span style={{ color: 'red' }}>*</span></FormLabel>
                                            <FormControl>
                                                <div
                                                    role="radiogroup"
                                                    aria-label="Who You Are"
                                                    className="flex flex-wrap gap-2 mb-4"
                                                >
                                                    {options.map((opt) => {
                                                        const id = `who-${opt.value}`;
                                                        return (
                                                            <div key={opt.value} className="flex">
                                                                <input
                                                                    type="radio"
                                                                    id={id}
                                                                    name={field.name}
                                                                    value={opt.value}
                                                                    checked={field.value === opt.value}
                                                                    onChange={() => field.onChange(opt.value)}
                                                                    ref={field.ref}
                                                                    className="peer sr-only"
                                                                />
                                                                <label
                                                                    htmlFor={id}
                                                                    className="
                                            w-fit cursor-pointer rounded-xl border p-2 text-center select-none
                                            duration-150
                                            bg-background text-foreground text- border-muted opacity-70
                                            peer-checked:bg-accent peer-checked:text-accent-foreground
                                            peer-checked:border-accent peer-checked:opacity-100
                                            hover:opacity-95 hover:shadow-sm
                                            focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent/30
                                        "
                                                                >
                                                                    {opt.label}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />

                            {isOtherSelected && (
                                <FormField
                                    control={form.control}
                                    name="otherWhoYouAre"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Please Specify</FormLabel><span style={{ color: 'red' }}>*</span>
                                            <FormControl>
                                                <Input placeholder="e.g., Researcher, Developer" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Proceed to Payment
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={handleClosePaymentModal}
                qrCodeImageUrl={currentQrCodeImageUrl}
                paymentLink={currentPaymentLink}
                eventName={eventName}
                userName={currentUserName}
            />
        </div>
    );
}

export default function StaticFormPage() {
    const [navOpen, setNavOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (navOpen) {
            document.body.style.overflow = "hidden";
            const formSection = document.getElementById("form-section");
            if (formSection) {
                formSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [navOpen]);



    const headerProps = {
        activeView: "home" as const,
        setActiveView: () => { },
        isLoggedIn: false,
        onLogout: () => { },
        isLoading: false,
        isStaticPage: true,
        navOpen,
        setNavOpen,
        heroVisible: false
    };

    return (
        <div className="overflow-hidden relative flex flex-col min-h-screen bg-background theme-dark  h-screen">

            <main className={styles.split} id="main-view1">
                <div className="hidden md:block">
                    <AnimatedColumns />
                </div>
                <section className={`${styles.right} `}>

                    <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary" />}>
                        <RegistrationForm />
                    </Suspense>
                </section>
            </main>
        </div>
    );
}