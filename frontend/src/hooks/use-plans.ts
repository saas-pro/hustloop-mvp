"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

export interface Plan {
    id: number;
    name: string;
    price: string;
    price_in_paise: number;
    billing_cycle: string;
    description: string;
    features: string[];
    cta?: string;
    primary?: boolean;
    tag?: string;
    originally?: string;
    offer?: string;
    is_active?: boolean;
    tax_percentage?: number;
    duration_days?: number;
}

export function usePlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/plans`);

                if (!response.ok) {
                    throw new Error("Failed to fetch plans");
                }

                const data = await response.json();
                const fetchedPlans = data.plans || [];

                // Transform backend data to match frontend expectations
                const transformedPlans: Plan[] = fetchedPlans.map((plan: any) => ({
                    id: plan.id,
                    name: plan.name,
                    price: plan.name === "Enterprise" ? null : plan.price_in_paise === 0 ? "₹0" : `₹${(plan.price_in_paise / 100).toFixed(0)}`,
                    price_in_paise: plan.price_in_paise,
                    billing_cycle: plan.billing_cycle || "monthly",
                    description: plan.description || "",
                    originally: plan.originally,
                    offer: plan.offer,
                    features: Array.isArray(plan.features) ? plan.features : [],
                    cta: plan.name === "Free" ? "Get Started" : plan.name === "Enterprise" ? "Contact Us" : "Buy Now",
                    primary: plan.name === "Premium",
                    tag: plan.name === "Premium" ? "Popular" : undefined,
                    is_active: plan.is_active,
                    tax_percentage: plan.tax_percentage,
                    duration_days: plan.duration_days
                }));

                setPlans(transformedPlans);
                setError(null);
            } catch (err: any) {
                console.error("Error fetching plans:", err);
                setError(err.message || "Failed to load plans");
                setPlans([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    return { plans, loading, error };
}
