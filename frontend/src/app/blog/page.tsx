import { Metadata } from "next";
import { getPublicBlogs } from "@/lib/api";
import { Suspense } from "react";
import BlogListClient from "./blog-list-client";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Blog",
    description: "Read the latest insights, tips, and stories from the Hustloop community",
    alternates: {
        canonical: "https://hustloop.com/blog",
    },
    openGraph: {
        title: "Blog",
        description: "Read the latest insights, tips, and stories from the Hustloop community",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Blog",
        description: "Read the latest insights, tips, and stories from the Hustloop community",
    },
};

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<BlogListSkeleton />}>
                <BlogListClient />
            </Suspense>
        </div>
    );
}

function BlogListSkeleton() {
    return (
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-6xl mx-auto">
                <div className="h-12 w-48 bg-muted animate-pulse rounded mb-4" />
                <div className="h-6 w-96 bg-muted animate-pulse rounded mb-12" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-4">
                            <div className="h-48 bg-muted animate-pulse rounded" />
                            <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-4 bg-muted animate-pulse rounded w-full" />
                            <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
