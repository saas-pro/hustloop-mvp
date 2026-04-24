"use client";

import { useState, useEffect } from "react";
import { getPublicBlogs, type BlogPost } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, User, ArrowRight, Sun, Moon, Palette, Check, Home, Eye, FileText, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import BrandLogo from "@/components/blog/brand-logo";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthContext";
import { useRouter } from "next/navigation";

/**
 * Calculates read time following Medium's algorithm:
 * - 265 words per minute for text
 * - Image viewing time: 12s for image #1, decreasing by 1s each image down to 3s minimum
 */
function calculateReadTime(content: string, imageCount: number = 0): number {
    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text ? text.split(' ').filter(Boolean).length : 0;

    // Text reading time in seconds
    const textSeconds = (wordCount / 265) * 60;

    // Image viewing time in seconds (Medium formula)
    let imageSeconds = 0;
    for (let i = 0; i < imageCount; i++) {
        // First image: 12s, each subsequent drops by 1s, minimum 3s
        imageSeconds += Math.max(12 - i, 3);
    }

    const totalSeconds = textSeconds + imageSeconds;
    return Math.max(1, Math.ceil(totalSeconds / 60));
}

function ThemeToggleDropdown() {
    const { theme, setTheme } = useTheme();
    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'purple', label: 'Purple', icon: Palette },
        { value: 'blue', label: 'Blue', icon: Palette },
        { value: 'green', label: 'Green', icon: Palette },
        { value: 'orange', label: 'Orange', icon: Palette },
        { value: 'blue-gray', label: 'Blue Gray', icon: Palette },
    ];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {themeOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
                        <option.icon className="mr-2 h-4 w-4" />
                        <span>{option.label}</span>
                        {theme === option.value && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function BlogListClient() {
    const { userRole, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Redirect blogger to workspace
    // useEffect(() => {
    //     if (!isAuthLoading && userRole === 'blogger') {
    //         router.push('/blogger');
    //     }
    // }, [userRole, isAuthLoading, router]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to first page on search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch blogs — admin gets all blogs (via token), public gets published only
    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                // Pass token if admin so backend returns all statuses
                const adminToken = userRole === 'admin' && token ? token : undefined;
                const response = await getPublicBlogs(page, 9, debouncedSearch, undefined, adminToken);
                setBlogs(response.blogs);
                setTotalPages(response.pages);
            } catch (error) {
                console.error("Failed to fetch blogs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlogs();
    }, [page, debouncedSearch, userRole]);

    return (
        <>
            {/* Simple Header with Logo */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <BrandLogo />
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Home className="h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                        <ThemeToggleDropdown />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-16">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Insights, tips, and stories from the Hustloop community
                        </p>
                    </div>

                    {/* Search */}
                    <div className="mb-8">
                        <div className="relative max-w-md mx-auto">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search blogs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Blog Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <BlogCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground text-lg">
                                {searchQuery ? "No blogs found matching your search." : "No blogs published yet."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {blogs.map((blog) => (
                                    <BlogCard key={blog.id} blog={blog} isAdmin={userRole === 'admin'} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-12">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground px-4">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function BlogCard({ blog, isAdmin }: { blog: BlogPost; isAdmin?: boolean }) {
    const isPublished = blog.status === 'published';
    // Admin can see unpublished blogs via the gateway (with ?login=1)
    const href = isPublished ? `/blog/${blog.slug}` : `/blog/${blog.slug}?login=1`;

    const statusBadge = !isPublished && isAdmin ? (
        <Badge
            variant={blog.status === 'rejected' ? 'destructive' : 'outline'}
            className={`text-xs absolute top-2 right-2 z-10 ${blog.status === 'pending_review'
                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                : ''
                }`}
        >
            {blog.status === 'pending_review' && <><Eye className="h-3 w-3 mr-1" />Pending</>}
            {blog.status === 'draft' && <><FileText className="h-3 w-3 mr-1" />Draft</>}
            {blog.status === 'rejected' && <><XCircle className="h-3 w-3 mr-1" />Rejected</>}
        </Badge>
    ) : null;

    return (
        <Link href={href}>
            <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer group relative ${!isPublished && isAdmin ? 'border-dashed opacity-80 hover:opacity-100' : ''
                }`}>
                {statusBadge}
                {blog.featured_image_url && (
                    <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                        <Image
                            src={blog.featured_image_url}
                            alt={blog.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                )}
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        {blog.tags && blog.tags.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {blog.tags[0]}
                            </Badge>
                        )}
                    </div>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                        {blog.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                        {blog.excerpt || blog.content.replace(/<[^>]*>/g, "").substring(0, 150) + "..."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {blog.author?.name && <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{blog.author?.name}</span>
                        </div>}
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(blog.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            })}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{calculateReadTime(
                            blog.content,
                            blog.featured_image_url ? 1 : 0
                        )} min read</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-primary font-medium">
                        {isPublished ? 'Read more' : isAdmin ? 'Preview (Admin)' : 'Read more'} <ArrowRight className="h-4 w-4" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}


function BlogCardSkeleton() {
    return (
        <Card className="h-full">
            <div className="h-48 bg-muted animate-pulse rounded-t-lg" />
            <CardHeader>
                <div className="h-4 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2" />
                <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                    <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
            </CardContent>
        </Card>
    );
}
