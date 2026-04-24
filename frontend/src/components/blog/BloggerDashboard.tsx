"use client";

import { useState, useEffect, useCallback } from "react";
import {
    getMyBlogs,
    getAdminBlogs,
    bloggerDeleteBlog,
    deleteBlog,
    submitForReview,
    publishBlog,
    unpublishBlog,
    rejectBlog,
    type BlogPost
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Plus, Edit, Eye, Trash2, Send, Clock, CheckCircle, XCircle,
    FileText, LayoutDashboard, Search, BookOpen
} from "lucide-react";
import { useAuth } from "@/providers/AuthContext";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from "@/components/ui/dialog";

interface BloggerDashboardProps {
    onEdit: (blog: BlogPost) => void;
    onCreate: () => void;
    onPreview: (blog: BlogPost) => void;
}

export default function BloggerDashboard({ onEdit, onCreate, onPreview }: BloggerDashboardProps) {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Reject modal state
    const [rejectingBlog, setRejectingBlog] = useState<BlogPost | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const { toast } = useToast();
    const { user, userRole } = useAuth();
    const isAdmin = userRole === 'admin';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchBlogs = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            let response;
            if (isAdmin) {
                // Admin sees ALL blogs
                response = await getAdminBlogs(token, 1, 50);
            } else {
                // Blogger sees only their own
                response = await getMyBlogs(token, 1, 50);
            }
            setBlogs(response.blogs);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch blogs.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [token, isAdmin, toast]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    // BLOGGER: delete own draft/rejected
    const handleBloggerDelete = async (id: number) => {
        if (!token) return;
        try {
            await bloggerDeleteBlog(id, token);
            toast({ title: "Deleted", description: "Blog post deleted successfully." });
            setBlogs(blogs.filter(b => b.id !== id));
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete blog.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    // ADMIN: force delete any blog
    const handleAdminDelete = async (id: number) => {
        if (!token) return;
        try {
            await deleteBlog(id, token);
            toast({ title: "Deleted", description: "Blog permanently deleted." });
            setBlogs(blogs.filter(b => b.id !== id));
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete blog.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    // BLOGGER: submit for review
    const handleSubmit = async (id: number) => {
        if (!token) return;
        try {
            await submitForReview(id, token);
            toast({ title: "Submitted", description: "Blog post submitted for review." });
            fetchBlogs();
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to submit for review.",
                variant: "destructive",
            });
        }
    };

    // ADMIN: publish
    const handlePublish = async (id: number) => {
        if (!token) return;
        try {
            await publishBlog(id, token);
            toast({ title: "Published", description: "Blog published successfully." });
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to publish.", variant: "destructive" });
        }
    };

    // ADMIN: unpublish
    const handleUnpublish = async (id: number) => {
        if (!token) return;
        try {
            await unpublishBlog(id, token);
            toast({ title: "Unpublished", description: "Blog moved back to pending review." });
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to unpublish.", variant: "destructive" });
        }
    };

    // ADMIN: reject with reason
    const handleRejectConfirm = async () => {
        if (!token || !rejectingBlog) return;
        if (!rejectionReason.trim()) {
            toast({ title: "Reason Required", description: "Please enter a rejection reason.", variant: "destructive" });
            return;
        }
        setRejecting(true);
        try {
            await rejectBlog(rejectingBlog.id, rejectionReason, token);
            toast({ title: "Rejected", description: "Blog has been rejected." });
            setRejectingBlog(null);
            setRejectionReason("");
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to reject blog.", variant: "destructive" });
        } finally {
            setRejecting(false);
        }
    };

    const handlePreviewClick = (blog: BlogPost) => {
        if (isAdmin && blog.slug) {
            // Admin: open live page in new tab (gateway handles auth for unpublished blogs)
            window.open(`/blog/${blog.slug}`, '_blank');
        } else {
            // Blogger: use in-app preview modal
            onPreview(blog);
        }
    };

    const getStatusBadge = (status: BlogPost['status']) => {
        switch (status) {
            case 'draft':
                return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Draft</Badge>;
            case 'pending_review':
                return <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3" /> Pending Review</Badge>;
            case 'published':
                return <Badge className="flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3" /> Published</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
        }
    };

    const filteredBlogs = blogs.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (isAdmin && b.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        {isAdmin ? (
                            <><BookOpen className="h-8 w-8 text-primary" /> Blog Management</>
                        ) : (
                            <><LayoutDashboard className="h-8 w-8 text-primary" /> Blogger Workspace</>
                        )}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? "Moderate, publish, and manage all blog posts."
                            : "Manage your stories and insights."}
                    </p>
                </div>
                <Button onClick={onCreate} className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Post
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={isAdmin ? "Search by title or author..." : "Search your blogs..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Blog Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <div className="h-40 bg-muted rounded-t-lg" />
                            <CardHeader className="space-y-2">
                                <div className="h-4 w-20 bg-muted rounded" />
                                <div className="h-6 w-full bg-muted rounded" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : filteredBlogs.length === 0 ? (
                <Card className="border-dashed py-20">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle>No posts yet</CardTitle>
                            <CardDescription>
                                {searchQuery ? "No results found." : "Start sharing your ideas with the community today."}
                            </CardDescription>
                        </div>
                        {!searchQuery && (
                            <Button onClick={onCreate} variant="outline">Create your first post</Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBlogs.map((blog) => (
                        <Card key={blog.id} onClick={() => onEdit(blog)} className="group relative flex flex-col border border-muted hover:border-primary/50 transition-all duration-300 cursor-pointer">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                                    {getStatusBadge(blog.status)}
                                    {isAdmin && blog.author?.name && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={blog.author.name}>
                                            by {blog.author.name}
                                        </span>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                    {blog.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 !font-sans text-sm font-medium">
                                    {blog.excerpt || "No summary provided."}
                                </CardDescription>
                                {/* Show rejection reason if rejected */}
                                {blog.status === 'rejected' && blog.rejection_reason && (
                                    <p className="text-xs text-destructive mt-1 italic">
                                        Reason: {blog.rejection_reason}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="pt-4 border-t border-muted/50 mt-auto">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(blog.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {/* Preview / View Live */}
                                        <Button
                                            variant="ghost" size="icon"
                                            onClick={(e) => { e.stopPropagation(); handlePreviewClick(blog); }}
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            title={blog.status === 'published' ? "View Live Post" : "Preview"}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>

                                        {/* Edit */}
                                        <Button
                                            variant="ghost" size="icon"
                                            onClick={(e) => { e.stopPropagation(); onEdit(blog); }}
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>

                                        {/* ADMIN ONLY: Publish (for pending/draft) */}
                                        {isAdmin && (blog.status === 'pending_review' || blog.status === 'draft') && (
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={(e) => { e.stopPropagation(); handlePublish(blog.id); }}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                                title="Publish"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* ADMIN ONLY: Unpublish */}
                                        {isAdmin && blog.status === 'published' && (
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleUnpublish(blog.id); }}
                                                className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                                title="Unpublish"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* ADMIN ONLY: Reject (for pending) */}
                                        {isAdmin && blog.status === 'pending_review' && (
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={(e) => { e.stopPropagation(); setRejectingBlog(blog); setRejectionReason(""); }}
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                title="Reject"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* BLOGGER ONLY: Submit for Review */}
                                        {!isAdmin && (blog.status === 'draft' || blog.status === 'rejected') && (
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleSubmit(blog.id); }}
                                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                title="Submit for Review"
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* Delete: Admin can delete any, blogger only own draft/rejected */}
                                        {(isAdmin || blog.status === 'draft' || blog.status === 'rejected') && (
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={(e) => { e.stopPropagation(); setDeletingId(blog.id); }}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the blog post.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (deletingId) {
                                    isAdmin ? handleAdminDelete(deletingId) : handleBloggerDelete(deletingId);
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Reason Dialog (Admin only) */}
            <Dialog open={rejectingBlog !== null} onOpenChange={() => { setRejectingBlog(null); setRejectionReason(""); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Blog Submission</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejection. This feedback will be emailed to the author.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Needs more detail, images missing, inappropriate content..."
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectingBlog(null); setRejectionReason(""); }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleRejectConfirm} disabled={rejecting}>
                            {rejecting ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
