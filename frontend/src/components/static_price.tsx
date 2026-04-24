const plans = [
    {
        id: 0,
        name: "Free",
        price: "₹0",
        price_in_paise: 0,
        billing_cycle: "lifetime",
        description: "Kickstart with technology discovery and foundational support at no cost.",
        features: [
            "Technology / IP (Intellectual Property)",
            "Basic support"
        ],
        cta: "Get Started",
        primary: false,
    },
    {
        id: 1,
        name: "Standard",
        price: "₹999",
        price_in_paise: 99900,
        billing_cycle: "monthly",
        originally: "₹1499",
        offer: "33% OFF",
        description: "Accelerate incubation with full access and priority support.",
        features: [
            "Access to all incubators",
            "Submit 1 Idea to Incubator",
            "45 Days Duration",
            "Priority Support"
        ],
        cta: "Buy Now",
        primary: false,
    },
    {
        id: 2,
        name: "Premium",
        tag: "Popular",
        price: "₹2999",
        price_in_paise: 299900,
        billing_cycle: "monthly",
        originally: "₹3999",
        offer: "25% OFF",
        description: "Solve Organisation's challenge with submissions and 24/7 priority support.",
        features: [
            "Browse Challenges",
            "Submit 1 solution to Organisation",
            "60 days duration",
            "24/7 priority support"
        ],
        cta: "Buy Now",
        primary: true,
    },
    {
        id: 3,
        name: "Enterprise",
        price: "Custom",
        price_in_paise: 0,
        billing_cycle: "custom",
        description: "High-touch support with fully customizable problem‑solving solutions and dedicated expert assistance.",
        features: [
            "Tailored Solutions",
            "You can discuss your requirements with us",
            "24/7 priority support"
        ],
        cta: "Contact Us",
        primary: false,
    }
];

export default plans;