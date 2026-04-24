
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import * as React from 'react';
import { Suspense } from 'react';
import { API_BASE_URL } from "@/lib/api";
import { UserRole } from "@/app/types";

const profileSchema = z.object({
    role: z.string({ required_error: "Please select a role." }),
});

type ProfileSchema = z.infer<typeof profileSchema>;
type AuthProvider = 'local' | 'google' | 'linkedin';

function CompleteProfileForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const token = searchParams.get('token');

    const form = useForm<ProfileSchema>({
        resolver: zodResolver(profileSchema),
    });

    const { formState: { isSubmitting } } = form;

    const onLoginSuccess = (data: { role: UserRole, token: string, hasSubscription: boolean, name: string, email: string, authProvider: AuthProvider }) => {
        const { role, token: loginToken, hasSubscription, name, email, authProvider } = data;
        const userData = { name, email };

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', loginToken);
        localStorage.setItem('authProvider', authProvider);

        // Dispatch a custom event to notify other parts of the app that auth state has changed.
        window.dispatchEvent(new Event('storage'));

        toast({ title: "Profile Complete!", description: `Welcome to Hustloop, ${name}!` });
        router.push('/');
    };

    const onSubmit = async (values: ProfileSchema) => {
        if (!token) {
            toast({ variant: "destructive", title: "Error", description: "Invalid session. Please try logging in again." });
            router.push('/');
            return;
        }

        try {
            const apiBaseUrl = API_BASE_URL;
            const response = await fetch(`${apiBaseUrl}/api/complete-registration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (response.ok) {
                onLoginSuccess(data);
            } else {
                toast({
                    variant: "destructive",
                    title: "Submission Failed",
                    description: data.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "Could not connect to the server. Please try again later.",
            });
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Invalid Link</CardTitle>
                        <CardDescription>This profile completion link is invalid or has expired. Please try signing up again.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push('/')}>Go to Homepage</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>One Last Step!</CardTitle>
                    <CardDescription>Please tell us who you are to complete your profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>I want to register as a...</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select your role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="founder">Entrepreneur</SelectItem>
                                                <SelectItem value="mentor">Mentor</SelectItem>
                                                <SelectItem value="incubator">Incubator</SelectItem>
                                                <SelectItem value="organisation">Organisation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Complete Registration
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}


export default function CompleteProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <CompleteProfileForm />
        </Suspense>
    );
}
