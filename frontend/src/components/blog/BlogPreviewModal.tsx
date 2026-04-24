"use client";

import { type BlogPost } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowLeft, AlertTriangle, Calendar, User, Share2 } from "lucide-react";
import Image from "next/image";

interface BlogPreviewModalProps {
    blog: BlogPost | null;
    open: boolean;
    onClose: () => void;
}

export default function BlogPreviewModal({ blog, open, onClose }: BlogPreviewModalProps) {
    if (!blog) return null;

    const isPublished = blog.status === "published";

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full max-h-[93vh] overflow-y-auto p-0 gap-0">
                {/* Preview Header Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-background border-b shadow-sm">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground">Blog Preview</span>
                    </div>
                    {!isPublished && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Preview Mode — Not Published Yet
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Blog Content */}
                <div className="px-6 py-8 max-w-3xl mx-auto w-full">
                    <article>
                        <header className="mb-8">
                            {/* Tags */}
                            {blog.tags && blog.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {blog.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Title */}
                            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{blog.title}</h1>

                            {/* Excerpt */}
                            {blog.excerpt && (
                                <p className="text-lg text-muted-foreground mb-5">{blog.excerpt}</p>
                            )}

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">{blog.author?.name || "Anonymous"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(blog.created_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                        style={{
                                            background: blog.status === 'published' ? 'rgba(34,197,94,0.1)' :
                                                blog.status === 'pending_review' ? 'rgba(234,179,8,0.1)' :
                                                    blog.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                                            color: blog.status === 'published' ? 'rgb(22,163,74)' :
                                                blog.status === 'pending_review' ? 'rgb(161,98,7)' :
                                                    blog.status === 'rejected' ? 'rgb(220,38,38)' : 'rgb(71,85,105)'
                                        }}
                                    >
                                        {blog.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </header>

                        {/* Featured Image */}
                        {blog.featured_image_url && (
                            <div className="relative w-full h-[300px] md:h-[400px] mb-8 rounded-lg overflow-hidden">
                                <Image
                                    src={blog.featured_image_url}
                                    alt={blog.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        )}

                        {/* YouTube Embed */}
                        {blog.youtube_embed_url && (
                            <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
                                <iframe
                                    src={blog.youtube_embed_url}
                                    title="YouTube video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full"
                                />
                            </div>
                        )}

                        {/* Blog Content */}
                        <Card className="mb-8">
                            <CardContent className="pt-6">
                                <div
                                    className="blog-content max-w-none text-foreground"
                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                />
                            </CardContent>
                        </Card>

                        {/* Rejection Reason (if rejected) */}
                        {blog.status === 'rejected' && blog.rejection_reason && (
                            <Card className="mb-8 border-destructive/40 bg-destructive/5">
                                <CardContent className="pt-6">
                                    <p className="text-sm font-semibold text-destructive mb-1">Rejection Reason</p>
                                    <p className="text-sm text-muted-foreground">{blog.rejection_reason}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bottom close */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button variant="outline" onClick={onClose}>
                                <X className="mr-2 h-4 w-4" />
                                Close Preview
                            </Button>
                        </div>
                    </article>
                </div>
            </DialogContent>
        </Dialog>
    );
}
