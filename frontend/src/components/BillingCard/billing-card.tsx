"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { usePlans } from "@/hooks/use-plans";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { View } from "@/app/types";
import { useAuth } from "@/providers/AuthContext";
import Script from "next/script";

interface PricingAccordion {
    setActiveView: (view: View) => void;
}

export default function PricingAccordion({ setActiveView }: PricingAccordion) {
    const { user, userRole, founderRole, hasSubscription, setAuthData } = useAuth();

    const router = useRouter();
    const { toast } = useToast();
    const { plans, loading: plansLoading, error: plansError } = usePlans();
    const [isProcessing, setIsProcessing] = useState<number | null>(null);
    const [activeSubscription, setActiveSubscription] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    useEffect(() => {
        const fetchSubscription = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setActiveSubscription(null);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/subscription`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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
                    headers: { 'Authorization': `Bearer ${token}` }
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

    const isPlanAllowed = (planName: string) => {
        // If no user profile, allow access (will be handled by auth)
        if (!userProfile?.role) return true;
        // Incubator and mentor roles can only see the "Enterprise" plan
        if (['incubator', 'mentor'].includes(userProfile.role)) {
            return false;
        }
        // Organization role - can see all plans but can't buy
        if (userProfile.role === 'organisation') {
            return planName === "Enterprise"; // Disable all buy buttons for organizations
        }
        // Founder role specific access
        if (userProfile.role === 'founder') {
            if (!userProfile.founder_role) return true;
            const founderPlanMap: Record<string, string> = {
                "List a technology for licensing": "Free",
                "Solve Organisation's challenge": "Premium",
                "Submit an innovative idea": "Standard"
            };
            return founderPlanMap[userProfile.founder_role] === planName;
        }
        // Default to allowing access for other roles (like admin)
        return true;
    };
    // Add a helper function to check if the plan is for founders only
    const isFounderOnlyPlan = (planName: string) => {
        return !['Enterprise'].includes(planName);
    };

    const handlePayment = async (plan: any) => {
        const token = localStorage.getItem('token');

        if (!token) {
            setActiveView('login');
            return;
        }

        setIsProcessing(plan.id);

        try {

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

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Hustloop",
                description: `Subscription: ${plan.name}`,
                image: "/hustloop_logo.png",
                order_id: orderData.order_id,
                handler: async function (response: any) {
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

                            // Update AuthContext with new subscription status
                            if (subscriptionData.subscription?.status === "active" && user) {
                                setAuthData({
                                    user,
                                    userRole,
                                    founderRole,
                                    isLoggedIn: true,
                                    hasSubscription: true,
                                });
                            }

                            toast({
                                title: "Payment Successful!",
                                description: "Your subscription has been activated.",
                            });
                        } else {
                            let errorMessage = "Payment verification failed";
                            try {
                                const errorData = await verifyRes.json();
                                if (errorData.error?.description) {
                                    errorMessage = errorData.error.description;
                                } else if (errorData.message) {
                                    errorMessage = errorData.message;
                                }

                                if (errorData.error?.reason === 'payment_risk_check_failed') {
                                    errorMessage = "Payment was declined by the payment processor due to security reasons. Please try a different payment method or contact support.";
                                }
                            } catch (e) {
                                console.error('Error parsing error response:', e);
                            }

                            toast({
                                title: "Payment Failed",
                                description: errorMessage,
                                variant: "destructive"
                            });
                        }
                    } catch (err: any) {
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

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
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
        <div className="flex flex-col items-center relative py-16 md:py-20 bg-background">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <div className="text-center mb-8 w-[95vw]">
                <h2 className="text-3xl font-bold font-headline">Our Pricing</h2>
                <p className="text-muted-foreground max-w-xl mx-auto mt-2">
                    Choose a plan that&apos;s right for your startup. All plans are designed to help you succeed.
                </p>
            </div>

            <div className={`w-[95vw] max-w-7xl relative`}>
                <Accordion type="single" collapsible>
                    <AccordionItem
                        value="pricing-plans"
                        className={`rounded-xl border border-border px-6 shadow-xl shadow-primary/5`}
                    >
                        <AccordionTrigger className="w-full text-center text-xl font-semibold hover:no-underline p-6">
                            View Pricing Plans
                        </AccordionTrigger>

                        <AccordionContent className={`mt-4 rounded-xl `}>
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
                                                "relative flex flex-col transition-all duration-200",
                                                plan.primary ? "border-primary border-2" : "border-border/50",
                                                activeSubscription && activeSubscription.plan_id === plan.id ? "border-2 border-green-500" : "",
                                                userProfile?.role && ['incubator', 'mentor'].includes(userProfile.role)
                                                    ? "opacity-70 blur-[1px] transition-all duration-300"
                                                    : !isPlanAllowed(plan.name)
                                                        ? "opacity-60"
                                                        : ""
                                            )}
                                        >
                                            {/* Current Plan Badge */}
                                            {activeSubscription && activeSubscription.plan_id === plan.id && (
                                                <Badge className="absolute top-[-12px] left-4 bg-green-500 text-white hover:bg-green-600">
                                                    Current Plan
                                                </Badge>
                                            )}
                                            {/* Role Restriction Badge */}

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
                                                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                                                        !isPlanAllowed(plan.name) ? "opacity-60 cursor-not-allowed" : ""
                                                    )}
                                                >
                                                    {isProcessing === plan.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : null}
                                                    {activeSubscription && activeSubscription.plan_id === plan.id
                                                        ? "Current Plan"
                                                        : !isPlanAllowed(plan.name)
                                                            ? (userProfile?.role === 'incubator' || userProfile?.role === 'mentor')
                                                                ? "For Founders Only"
                                                                : "Not Available"
                                                            : plan.cta}
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
                                    {userProfile?.role && ['incubator', 'mentor'].includes(userProfile.role) && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg p-6 flex justify-center flex-col items-center shadow-2xl border border-red-200 dark:border-red-900/50 max-w-md mx-auto">
                                                <Badge variant="destructive" className="text-base px-3 py-1.5 mb-3">
                                                    For Founders Only
                                                </Badge>
                                                <p className="text-sm text-center text-muted-foreground">
                                                    These plans are exclusively available for founder accounts. Please contact support to upgrade your account.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            {/* <SubscriptionSuccessPopup isOpen={showSuccessPopup} onClose={() => setShowSuccessPopup(false)} /> */}
        </div>

    );
}