"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlans } from "@/hooks/use-plans";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { API_BASE_URL } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGetStartedClick: () => void;
}

export default function PricingView({ isOpen, onOpenChange, onGetStartedClick }: PricingViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user's active subscription
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

  // Check if a plan is allowed for the user's role
  const isPlanAllowed = (planName: string) => {
    if (!userProfile?.founder_role) return true;

    if (userProfile.founder_role === "Solve Organisation's challenge") {
      return planName === "Premium";
    }

    if (userProfile.founder_role === "Submit an innovative idea") {
      return planName === "Standard";
    }

    return true;
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
        image: "/logo.png",
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

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              toast({
                title: "Payment Successful!",
                description: "Your subscription is being activated.",
              });
              onOpenChange(false);
              router.push('/');
            } else {
              toast({
                title: "Verification Failed",
                description: verifyData.message || "Something went wrong.",
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
          name: "",
          email: "",
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

    if (idx === 0) {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center font-headline">Our Pricing</DialogTitle>
          <DialogDescription className="text-center max-w-xl mx-auto">Choose a plan that&apos;s right for your startup. All plans are designed to help you succeed.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full mt-4">
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
                    "relative flex flex-col bg-card/50 backdrop-blur-sm",
                    plan.primary ? "ring-2 ring-primary" : "border-border/50",
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
                        <Badge className="ml-2 bg-green-100 text-green-800 border rounded-sm py-1 px-2">{plan.offer}</Badge>
                      )}
                    </div>

                    <CardDescription>{plan.description}</CardDescription>
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
                      {plan.originally && (
                        <span className="text-3xl  text-muted-foreground line-through">{plan.originally}</span>
                      )}

                      <div className="flex flex-col">

                        <span className="text-4xl font-bold">{plan.price}</span>
                        {(idx === 1 || idx === 2) && (
                          <span className="text-xs text-muted-foreground">INR + GST Applicable</span>
                        )}
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
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
