"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { Home, Loader2 } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Suspense, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import AnimatedColumns from "./animatedColumns";
import { API_BASE_URL } from "@/lib/api";


const registrationSchema = z
    .object({
        name: z.string().min(2, { message: "Name must be at least 2 characters." }),
        email: z.string().email({ message: "Please enter a valid email address." }),
        phone: z
            .string()
            .regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
        eventName: z.string(),
        whoYouAre: z.string().min(1, { message: "Please select who you are." }),
        otherWhoYouAre: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.whoYouAre === "other" && !data.otherWhoYouAre) {
                return false;
            }
            return true;
        },
        {
            message: "Please specify who you are.",
            path: ["otherWhoYouAre"],
        }
    );

type RegistrationSchema = z.infer<typeof registrationSchema>;

function RegistrationForm() {
    const { toast } = useToast();
    const router = useRouter();

    const eventName = "Connext";

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

    const {
        formState: { isSubmitting },
        watch,
    } = form;

    const whoYouAreValue = watch("whoYouAre");
    const isOtherSelected = whoYouAreValue === "other";

    const onSubmit = async (data: RegistrationSchema) => {
        try {
            const payload = {
                full_name: data.name,
                email_address: data.email,
                phone_number: data.phone,
                event: data.eventName,
                who_you_are: data.whoYouAre === "other" ? data.otherWhoYouAre : data.whoYouAre,
            };

            const response = await fetch(`${API_BASE_URL}/api/connex-registrations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to submit registration");
            }

            toast({
                title: "Registration Successful 🎉",
                description: `Hi ${data.name}, your registration for ${eventName} has been recorded successfully!`,
            });

            form.reset();
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="text-white">
            <div className="flex items-center justify-between px-4">
                <div onClick={() => router.push("/")} className="cursor-pointer">
                    <Image
                        src="/logo.png"
                        alt="Hustloop Logo"
                        width={120}
                        height={120}
                        className="h-12 w-auto min-w-[120px] max-w-[200px] object-contain"
                    />
                </div>
                <div
                    onClick={() => router.push("/")}
                    className="pointer-events-auto cursor-pointer rounded-md border border-solid w-[3.5rem] h-[3.5rem] flex items-center justify-center transition-colors backdrop-blur-sm z-10 bg-white/10"
                >
                    <Home />
                </div>
            </div>

            {/* Form */}
            <div className="w-full">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline capitalize">
                        Register for {eventName}
                    </CardTitle>
                    <CardDescription>
                        Complete the form below to secure your spot.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Full Name<span className="text-red-500">*</span>
                                        </FormLabel>
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
                                        <FormLabel>
                                            Email Address<span className="text-red-500">*</span>
                                        </FormLabel>
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
                                            Phone Number<span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                placeholder="Enter your 10-digit phone number"
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

                            {/* Who You Are */}
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
                                            <FormLabel>
                                                Who You Are<span className="text-red-500">*</span>
                                            </FormLabel>
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
                                                                    className="w-fit cursor-pointer rounded-xl border p-2 text-center select-none
                                    bg-background text-foreground border-muted opacity-70
                                    peer-checked:bg-accent peer-checked:text-accent-foreground
                                    peer-checked:border-accent peer-checked:opacity-100
                                    hover:opacity-95 hover:shadow-sm transition"
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

                            {/* Other Option */}
                            {isOtherSelected && (
                                <FormField
                                    control={form.control}
                                    name="otherWhoYouAre"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Please Specify<span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Researcher, Developer" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Registration
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </div>
        </div>
    );
}

export default function StaticFormPage() {
    const [navOpen, setNavOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = navOpen ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [navOpen]);

    return (
        <div className="overflow-hidden relative flex flex-col min-h-screen bg-background theme-dark">
            <main className="w-full h-screen flex justify-center items-center"
                id="main-view1"
            >
                <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin text-primary" />}>
                    <RegistrationForm />
                </Suspense>
            </main>
        </div>
    );
}
