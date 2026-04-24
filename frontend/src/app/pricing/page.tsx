import { Metadata } from "next";
import PricingPageClient from "./pricing-client";

export const metadata: Metadata = {
    title: 'Pricing — Hustloop',
    description: 'Explore Hustloop plans: Free, Standard, Premium and Enterprise. Choose the best plan for your startup — transparent pricing, flexible features, and priority support.',
    alternates: {
        canonical: 'https://hustloop.com/pricing',
    },
    robots: 'index, follow',
    openGraph: {
        siteName: 'Hustloop',
        title: 'Pricing — Hustloop' ,
        description: 'Explore Hustloop plans: Free, Standard, Premium and Enterprise.',
        type: 'website',
        url: 'https://hustloop.com/pricing',
        images: ['https://hustloop.com/logo.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Pricing — Hustloop',
        description: 'Explore Hustloop plans: Free, Standard, Premium and Enterprise.',
        images: ['https://hustloop.com/logo.png'],
    },
};



export default function PricingPage() {
    return (
        <>
            <PricingPageClient />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "ItemList",
                        "name": "Hustloop Pricing Plans",
                        "itemListElement": [
                            {
                                "@type": "Offer",
                                "name": "Free",
                                "price": "0",
                                "priceCurrency": "INR",
                                "description": "Kickstart with technology discovery and foundational support at no cost."
                            },
                            {
                                "@type": "Offer",
                                "name": "Standard",
                                "price": "999",
                                "priceCurrency": "INR",
                                "description": "Accelerate incubation with full access and priority support."
                            },
                            {
                                "@type": "Offer",
                                "name": "Premium",
                                "price": "2999",
                                "priceCurrency": "INR",
                                "description": "Solve Organisation's challenges with submissions and 24/7 priority support."
                            }
                        ]
                    })
                }}
            />
        </>
    );
}
