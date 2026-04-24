"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { usePlans } from "@/hooks/use-plans";
import { Card, CardContent, CardHeader, CardFooter, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import SubscriptionSuccessPopup from "@/components/SubscriptionSuccessPopup";

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function PricingPageClient() {
    const router = useRouter();
    const { toast } = useToast();
    const { plans, loading: plansLoading, error: plansError } = usePlans();
    const [isProcessing, setIsProcessing] = useState<number | null>(null);
    const [activeSubscription, setActiveSubscription] = useState<any>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Fetch user's active subscription
    useEffect(() => {
        const fetchSubscription = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoadingSubscription(false);
                setActiveSubscription(null);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/subscription`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setActiveSubscription(data.subscription);
                } else {
                    setActiveSubscription(null);
                }
            } catch (error) {
                console.error('Error fetching subscription:', error);
                setActiveSubscription(null);
            } finally {
                setLoadingSubscription(false);
            }
        };

        fetchSubscription();
    }, []);

    // Fetch user profile for role-based restrictions
    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setUserProfile(null);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserProfile(data.user);
                } else {
                    setUserProfile(null);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setUserProfile(null);
            }
        };

        fetchUserProfile();
    }, []);

    // Monitor token changes and refetch data on login/logout
    useEffect(() => {
        let previousToken = localStorage.getItem('token');

        const checkToken = () => {
            const currentToken = localStorage.getItem('token');

            // Token removed (logout)
            if (previousToken && !currentToken) {
                setActiveSubscription(null);
                setUserProfile(null);
            }

            // Token added (login)
            if (!previousToken && currentToken) {
                // Refetch data immediately
                fetch(`${API_BASE_URL}/api/user/subscription`, {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => data && setActiveSubscription(data.subscription))
                    .catch(() => setActiveSubscription(null));

                fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => data && setUserProfile(data.user))
                    .catch(() => setUserProfile(null));
            }

            previousToken = currentToken;
        };

        // Listen for storage events (triggered on login)
        window.addEventListener('storage', checkToken);

        checkToken();
        const interval = setInterval(checkToken, 1000);

        return () => {
            window.removeEventListener('storage', checkToken);
            clearInterval(interval);
        };
    }, []);

    // Effect to automatically active Free plan for "List a technology for licensing" role
    useEffect(() => {
        if (userProfile?.founder_role === "List a technology for licensing" && plans.length > 0) {
            const freePlan = plans.find(p => p.name === "Free" || p.price_in_paise === 0);
            if (freePlan && (!activeSubscription || activeSubscription.plan_id !== freePlan.id)) {
                setActiveSubscription({
                    plan_id: freePlan.id,
                    plan_name: freePlan.name,
                    status: "active"
                });
            }
        }
    }, [userProfile, plans, activeSubscription]);

    // Check if a plan is allowed for the user's role
    const isPlanAllowed = (planName: string) => {
        // If no user profile, allow access (will be handled by auth)
        if (!userProfile) return true;
        // Organization role - can see all plans but can't buy
        if (userProfile.role === 'organisation') {
            return planName === "Enterprise"; // Disable all buy buttons for organizations
        }
        // Non-founder roles can't access any plans
        if (userProfile.role !== 'founder') {
            return false;
        }
        // Founder role specific access
        const founderPlanMap: Record<string, string> = {
            "List a technology for licensing": "Free",
            "Solve Organisation's challenge": "Premium",
            "Submit an innovative idea": "Standard"
        };
        // If founder role is not in the map, default to allowing access
        if (!userProfile.founder_role) return true;
        // Check if the plan matches the allowed plan for this founder role
        return founderPlanMap[userProfile.founder_role] === planName;
    };

    const handlePayment = async (plan: any) => {
        const token = localStorage.getItem('token');

        if (!token) {
            toast({
                title: "Login Required",
                description: "Please login to subscribe to a plan.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(plan.id);

        try {
            // 1. Create Order on Backend
            const orderRes = await fetch(`${API_BASE_URL}/api/create-subscription-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan_id: plan.id })
            });


            const orderData = await orderRes.json();

            if (!orderRes.ok) {
                throw new Error(orderData.message || "Failed to create order");
            }

            // 2. Initialize Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Hustloop",
                description: `Subscription: ${plan.name}`,
                notes: {
                    "Plan Name": plan?.name || "",
                    "Plan Features": plan?.features?.join(" | ") || "",
                    "Billing Cycle": plan?.billing_cycle || "Monthly",
                },
                image: "/hustloop_logo.png",
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    // 3. Verify Payment on Backend
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/verify-payment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (verifyRes.ok) {
                            const subscriptionRes = await fetch(`${API_BASE_URL}/api/user/subscription`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            const subscriptionData = await subscriptionRes.json();
                            setActiveSubscription(subscriptionData.subscription);
                            // Subscription status will be fetched from backend via AuthContext on next page load
                            toast({
                                title: "Payment Successful!",
                                description: "Your subscription has been activated.",
                            });
                        } else {
                            const verifyData = await verifyRes.json();
                            toast({
                                title: "Verification Failed",
                                description: verifyData?.message || "Something went wrong.",
                                variant: "destructive"
                            });
                        }
                    } catch (err: any) {
                        console.error(err);
                        toast({
                            title: "Error",
                            description: "Verification failed. Please contact support.",
                            variant: "destructive"
                        });
                    }
                },
                prefill: {
                    name: orderData.name,
                    email: orderData.email,
                },
                theme: {
                    color: "#3B82F6",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to initiate payment.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handlePlanClick = (idx: number) => {
        const plan = plans[idx];

        // Check if this is the active plan
        if (activeSubscription && activeSubscription.plan_id === plan.id) {
            toast({
                title: "Current Plan",
                description: "This is your active subscription plan.",
            });
            return;
        }

        if (idx === 1 || idx === 2) {
            handlePayment(plan);
            return;
        }

        if (idx === 3) {
            window.location.href = "/contact-us";
        }
    };

    return (
        <div className="flex flex-col">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <div onClick={() => router.push('/')} className="cursor-pointer">
                    <Image src="/logo.png" alt="Hustloop Logo" width={120} height={120} />
                </div>
                <Link href="/" passHref>
                    <Button variant="outline" size="icon" aria-label="Home">
                        <Home className="h-5 w-5" />
                    </Button>
                </Link>
            </div>
            <div className="container mx-auto pt-12 mt-5">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold font-headline">Our Pricing</h1>
                    <p className="max-w-xl mx-auto text-muted-foreground mt-2">
                        Choose a plan that&apos;s right for your startup. All plans are designed to help you succeed.
                    </p>
                </div>

                <ScrollArea className="h-full">
                    {plansLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : plansError ? (
                        <div className="text-center text-destructive p-8">
                            <p>Failed to load plans. Please try again later.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto pt-4">
                            {plans.map((plan, idx) => (
                                <Card
                                    key={plan.name}
                                    className={cn(
                                        "relative flex flex-col",
                                        plan.primary ? "border-primary border-2" : "border-border/50",
                                        activeSubscription && activeSubscription.plan_id === plan.id ? "border-2 border-green-500" : "",
                                        !isPlanAllowed(plan.name) ? "opacity-60" : ""
                                    )}
                                >
                                    {activeSubscription && activeSubscription.plan_id === plan.id && (
                                        <Badge className="absolute top-[-12px] left-4 bg-green-500 text-white hover:bg-green-600">
                                            Current Plan
                                        </Badge>
                                    )}
                                    {!isPlanAllowed(plan.name) && (
                                        <Badge className="absolute top-[-12px] left-4 bg-red-500 text-white hover:bg-red-600">
                                            Not Available for Your Role
                                        </Badge>
                                    )}
                                    {plan.tag && (
                                        <Badge className="absolute top-[-12px] right-4 bg-accent text-accent-foreground hover:bg-accent/90">
                                            {plan.tag}
                                        </Badge>
                                    )}
                                    <CardHeader>

                                        <div className="flex items-center">
                                            <CardTitle>{plan.name}</CardTitle>
                                            {plan.offer && (
                                                <Badge className="ml-2 bg-green-500/20 text-green-500 border border-green-500/50 rounded-sm py-1 px-2">{plan.offer}</Badge>
                                            )}
                                        </div>

                                        <CardDescription className="font-sans font-normal">{plan.description}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex-grow">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter className="flex-col items-start mt-4">
                                        <div className="flex items-baseline gap-3 mb-3">
                                            <div className="flex flex-col">
                                                {(idx === 1 || idx === 2) && (<div className="flex items-baseline gap-2">
                                                    <div className="text-4xl font-bold mt-1">
                                                        ₹{Math.round(plan.price_in_paise / 100 / 12)}
                                                        <span className="text-sm font-normal text-muted-foreground">/ month</span>
                                                    </div>
                                                </div>)}
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handlePlanClick(idx)}
                                            disabled={
                                                !isPlanAllowed(plan.name) ||
                                                (activeSubscription && activeSubscription.plan_id === plan.id) ||
                                                isProcessing === plan.id
                                            }
                                            className={cn(
                                                "w-full",
                                                plan.primary
                                                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                            )}
                                        >
                                            {isProcessing === plan.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : null}
                                            {!isPlanAllowed(plan.name)
                                                ? "Not Available"
                                                : activeSubscription && activeSubscription.plan_id === plan.id
                                                    ? "Current Plan"
                                                    : plan.cta
                                            }
                                        </Button>

                                        <div className="flex flex-col">
                                            {(idx == 1 || idx == 2) && (
                                                <span className="font-headline text-md text-muted-foreground mt-2">
                                                    Billed as {plan.price} per year <span className="text-muted-foreground line-through text-lg font-headline font-bold">
                                                        {plan.originally}
                                                    </span>
                                                </span>
                                            )}
                                            {(idx === 1 || idx === 2) && (
                                                <span className="text-xs text-muted-foreground">Incl GST</span>
                                            )}
                                        </div>

                                        {/* {plan.note && (
                                                <p className="text-xs text-muted-foreground mt-3 text-center w-full">{plan.note}</p>
                                            )} */}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </ScrollArea>

            </div>
            <div className="block w-full mt-6">
                <Footer />
            </div>
            <SubscriptionSuccessPopup isOpen={showSuccessPopup} onClose={() => setShowSuccessPopup(false)} />
        </div>
    );
}
