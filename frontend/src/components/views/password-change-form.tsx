"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string()
        .min(10, { message: "Password must be at least 10 characters long." })
        .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter." })
        .regex(/[a-z]/, { message: "Must contain at least one lowercase letter." })
        .regex(/[0-9]/, { message: "Must contain at least one number." })
        .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function PasswordChangeForm() {
    const { toast } = useToast();
    const [showResetPasswords, setShowResetPasswords] = useState({ current: false, new: false, confirm: false });
    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const { formState: { isSubmitting } } = form;

    const onSubmit = async (data: PasswordFormValues) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Your password has been updated successfully.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: result.error || "An unknown error occurred.",
                });
            }

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: "Could not update password. Please try again later.",
            });
        }
    };

    return (
        <div>
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            type={showResetPasswords.current ? "text" : "password"}
                                            {...field}
                                            disabled={isSubmitting}
                                            className="pr-20"
                                        />
                                    </FormControl>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>
                                            {field.value?.length || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPasswords(prev => ({ ...prev, current: !prev.current }))}
                                            className="text-muted-foreground hover:text-foreground focus:outline-none"
                                            tabIndex={-1}
                                        >
                                            {showResetPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            type={showResetPasswords.new ? "text" : "password"}
                                            {...field}
                                            disabled={isSubmitting}
                                            className="pr-20"
                                        />
                                    </FormControl>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>
                                            {field.value?.length || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPasswords(prev => ({ ...prev, new: !prev.new }))}
                                            className="text-muted-foreground hover:text-foreground focus:outline-none"
                                            tabIndex={-1}
                                        >
                                            {showResetPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-muted-foreground">Must be 10+ characters with uppercase, lowercase, number, and special character.</p>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            type={showResetPasswords.confirm ? "text" : "password"}
                                            {...field}
                                            disabled={isSubmitting}
                                            className="pr-20"
                                        />
                                    </FormControl>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className={`text-xs ${field.value?.length >= 10 ? "text-gray-500" : "text-red-500"}`}>
                                            {field.value?.length || 0}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                            className="text-muted-foreground hover:text-foreground focus:outline-none"
                                            tabIndex={-1}
                                        >
                                            {showResetPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </form>
            </Form>
        </div>
    );
}
