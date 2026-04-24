"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { usePlans } from "@/hooks/use-plans";

interface SubscriptionDetailsProps {
    user: any;
    founder_role: string | null;
}

export function SubscriptionDetails({ user, founder_role }: SubscriptionDetailsProps) {
    const { plans, loading: plansLoading } = usePlans();
    const [activeSubscription, setActiveSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (founder_role === "List a technology for licensing") {
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/subscription/${user.uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setActiveSubscription(data.subscription);
                }
            } catch (error) {
                console.error('Error fetching subscription:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [founder_role,user.uid]);

    if (loading || plansLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isFreePlanRole = founder_role === "List a technology for licensing";
    const planName = isFreePlanRole ? "Free Plan" : (activeSubscription?.plan_name || "No Plan");
    const status = isFreePlanRole ? "Active" : (activeSubscription?.status || "Inactive");

    const currentPlan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
    const features = currentPlan?.features || [];

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Subscription Details</CardTitle>
                        <CardDescription>Your current plan information and features.</CardDescription>
                    </div>
                    <Badge variant={(status === "Active" || status === "active" || isFreePlanRole) ? "default" : "destructive"} className="capitalize">
                        {status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Account Role</p>
                        <p className="text-lg font-semibold">{founder_role}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Current Plan</p>
                        <p className="text-lg font-semibold">{planName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Status</p>
                        <p className="text-lg font-semibold">
                            {activeSubscription?.days_remaining > 0 
                                ? `${activeSubscription.days_remaining} Days Remaining`
                                : 'Not Active'}
                        </p>
                    </div>
                    {activeSubscription?.end_date && !isFreePlanRole && (
                        <div className="col-span-1 space-y-1">
                            <p className="text-sm font-medium text-foreground">Renewal Date</p>
                            <p className="text-lg font-semibold">
                                {new Date(activeSubscription.end_date).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-3 pt-4 border-t">
                    <p className="text-sm font-medium text-foreground">Plan Features</p>
                    {features.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                    <span className="text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No features listed for this plan.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
