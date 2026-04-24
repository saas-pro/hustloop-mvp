"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    Send,
    FileText,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    UploadCloud,
    Image as ImageIcon
} from "lucide-react";
import {
    getAdminBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    publishBlog,
    unpublishBlog,
    rejectBlog,
    type BlogPost,
    type CreateBlogData,
} from "@/lib/api";
import BlogPreviewModal from "@/components/blog/BlogPreviewModal";

interface BlogDashboardProps {
    token: string;
}

export default function BlogDashboard({ token }: BlogDashboardProps) {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending_review" | "published" | "rejected">("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
    const [previewBlog, setPreviewBlog] = useState<BlogPost | null>(null);

    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const { toast } = useToast();

    // Fetch blogs
    const fetchBlogs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getAdminBlogs(
                token,
                page,
                10,
                statusFilter === "all" ? undefined : (statusFilter as any),
                false // Deleted blogs are now hard-deleted, no need to include them
            );
            setBlogs(response.blogs);
            setTotalPages(response.pages);
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to fetch blogs",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [token, page, statusFilter, toast]);

    useEffect(() => {
        fetchBlogs();
    }, [page, statusFilter, fetchBlogs]);

    const handlePublish = async (blogId: number) => {
        try {
            await publishBlog(blogId, token);
            toast({ title: "Success", description: "Blog published successfully" });
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to publish blog", variant: "destructive" });
        }
    };

    const handleUnpublish = async (blogId: number) => {
        try {
            await unpublishBlog(blogId, token);
            toast({ title: "Success", description: "Blog unpublished successfully" });
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to unpublish blog", variant: "destructive" });
        }
    };

    const handleDelete = async (blogId: number) => {
        if (!confirm("Are you sure you want to permanently delete this blog?")) return;
        try {
            await deleteBlog(blogId, token);
            toast({ title: "Success", description: "Blog deleted successfully" });
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete blog", variant: "destructive" });
        }
    };

    const handleRejectSubmit = async () => {
        if (!selectedBlog) return;
        if (!rejectionReason.trim()) {
            toast({ title: "Reason Required", description: "Please provide a reason for rejection.", variant: "destructive" });
            return;
        }
        try {
            await rejectBlog(selectedBlog.id, rejectionReason, token);
            toast({ title: "Success", description: "Blog rejected successfully" });
            setRejectionModalOpen(false);
            setRejectionReason("");
            fetchBlogs();
        } catch (error) {
            toast({ title: "Error", description: "Failed to reject blog", variant: "destructive" });
        }
    };

    const handlePreview = (blog: BlogPost) => {
        if (blog.status === 'published' && blog.slug) {
            window.open(`/blog/${blog.slug}`, '_blank');
        } else {
            setPreviewBlog(blog);
        }
    };

    // Filter blogs by search query
    const filteredBlogs = blogs.filter((blog) =>
        blog.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 w-[90vw] md:w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Blog Management</h2>
                    <p className="text-muted-foreground">
                        Create, moderate, and manage all blog posts.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Blog Post
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search blogs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(value: any) => setStatusFilter(value)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending_review">Pending Review</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Blog List */}
            <Card>
                <CardHeader>
                    <CardTitle>Blog Posts</CardTitle>
                    <CardDescription>
                        Moderate blogger submissions and manage content.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : filteredBlogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No blog posts found.
                        </div>
                    ) : (
                        <div className="rounded-md border min-w-[800px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Title</TableHead>
                                        <TableHead className="min-w-[120px]">Status</TableHead>
                                        <TableHead className="min-w-[120px]">Author</TableHead>
                                        <TableHead className="min-w-[100px]">Created</TableHead>
                                        <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBlogs.map((blog) => (
                                        <TableRow key={blog.id}>
                                            <TableCell className="font-medium">
                                                <div className="truncate max-w-[200px]" title={blog.title}>{blog.title}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        blog.status === "published" ? "default" :
                                                            blog.status === "rejected" ? "destructive" :
                                                                blog.status === "pending_review" ? "secondary" : "outline"
                                                    }
                                                >
                                                    {blog.status.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="truncate max-w-[120px]" title={blog.author?.name}>
                                                    {blog.author?.name || "Unknown"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(blog.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    {/* Preview */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={blog.status === 'published' ? "View Live Post" : "Preview"}
                                                        onClick={() => handlePreview(blog)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setSelectedBlog(blog);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>

                                                    {blog.status === 'pending_review' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                                                title="Approve & Publish"
                                                                onClick={() => handlePublish(blog.id)}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                                title="Reject"
                                                                onClick={() => {
                                                                    setSelectedBlog(blog);
                                                                    setRejectionReason("");
                                                                    setRejectionModalOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}

                                                    {blog.status === 'published' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                                            title="Unpublish to Draft"
                                                            onClick={() => handleUnpublish(blog.id)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Admin force delete */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:text-red-600"
                                                        title="Delete"
                                                        onClick={() => handleDelete(blog.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Form Dialog */}
            <BlogFormDialog
                isOpen={isCreateDialogOpen || isEditDialogOpen}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedBlog(null);
                }}
                blog={selectedBlog}
                token={token}
                onSuccess={fetchBlogs}
            />

            <BlogPreviewModal
                blog={previewBlog}
                open={previewBlog !== null}
                onClose={() => setPreviewBlog(null)}
            />

            {/* Rejection Modal */}
            <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Blog Submission</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this blog post. This feedback will be emailed to the author.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <Label htmlFor="rejectReason">Rejection Reason</Label>
                        <Textarea
                            id="rejectReason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Needs more detail in section 2, or images are missing."
                            className="mt-2 min-h-[100px]"
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setRejectionModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectSubmit}>Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Blog Form Dialog Component
interface BlogFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    blog: BlogPost | null;
    token: string;
    onSuccess: () => void;
}

function BlogFormDialog({
    isOpen,
    onClose,
    blog,
    token,
    onSuccess,
}: BlogFormDialogProps) {
    const [formData, setFormData] = useState<CreateBlogData>({
        title: "",
        excerpt: "",
        content: "",
        tags: "",
        meta_title: "",
        meta_description: "",
    });
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>("");
    const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Populate form when editing
    useEffect(() => {
        if (blog && isOpen) {
            setFormData({
                title: blog.title,
                excerpt: blog.excerpt || "",
                content: blog.content,
                youtube_embed_url: blog.youtube_embed_url || "",
                meta_title: blog.meta_title || "",
                meta_description: blog.meta_description || "",
                tags: blog.tags?.join(", ") || "",
            });
            setFeaturedImagePreview(blog.featured_image_url || "");
            setFeaturedImageFile(null);
        } else if (!blog && isOpen) {
            setFormData({
                title: "",
                excerpt: "",
                content: "",
                youtube_embed_url: "",
                meta_title: "",
                meta_description: "",
                tags: "",
            });
            setFeaturedImagePreview("");
            setFeaturedImageFile(null);
        }
    }, [blog, isOpen]);

    useEffect(() => {
        return () => {
            if (featuredImagePreview && !featuredImagePreview.startsWith('http')) {
                URL.revokeObjectURL(featuredImagePreview);
            }
        };
    }, [featuredImagePreview]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFeaturedImageFile(file);
            setFeaturedImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setFeaturedImageFile(null);
        setFeaturedImagePreview("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payload = { ...formData };
        if (featuredImageFile) {
            payload.featured_image = featuredImageFile;
        } else if (featuredImagePreview) {
            payload.featured_image_url = featuredImagePreview;
        } else {
            payload.featured_image_url = "";
        }

        try {
            if (blog) {
                await updateBlog(blog.id, payload, token);
                toast({ title: "Success", description: "Blog updated successfully" });
            } else {
                await createBlog(payload, token);
                toast({ title: "Success", description: "Blog created successfully" });
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save blog",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{blog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                    <DialogDescription>
                        {blog
                            ? "Update blog post details as admin."
                            : "Provide details to create a new blog post."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">
                            Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            placeholder="Enter blog title"
                            required
                            maxLength={300}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Excerpt */}
                        <div className="space-y-2">
                            <Label htmlFor="excerpt">Excerpt</Label>
                            <Textarea
                                id="excerpt"
                                value={formData.excerpt}
                                onChange={(e) =>
                                    setFormData({ ...formData, excerpt: e.target.value })
                                }
                                placeholder="Brief summary of the blog post"
                                rows={4}
                                maxLength={500}
                            />
                        </div>

                        {/* Featured Image Upload */}
                        <div className="space-y-2">
                            <Label>Featured Image</Label>
                            {featuredImagePreview ? (
                                <div className="relative rounded-md overflow-hidden border bg-muted aspect-video flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImagePreview} alt="Featured" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button type="button" variant="destructive" size="sm" onClick={removeImage}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex flex-col items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
                                    <p className="text-sm">Upload Image</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <Label htmlFor="content">
                            Content (HTML) <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="content"
                            value={formData.content}
                            onChange={(e) =>
                                setFormData({ ...formData, content: e.target.value })
                            }
                            placeholder="Write your blog content here (HTML supported)"
                            rows={10}
                            required
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            value={formData.tags}
                            onChange={(e) =>
                                setFormData({ ...formData, tags: e.target.value })
                            }
                            placeholder="tech, startup, innovation (comma-separated)"
                        />
                    </div>

                    {/* YouTube Embed URL */}
                    <div className="space-y-2">
                        <Label htmlFor="youtube_embed_url">
                            YouTube Embed URL <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="youtube_embed_url"
                            value={formData.youtube_embed_url || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, youtube_embed_url: e.target.value })
                            }
                            placeholder="https://www.youtube.com/embed/..."
                            required
                        />
                        <p className="text-xs text-muted-foreground">Required YouTube embed URL for the blog post.</p>
                    </div>

                    {/* SEO Metadata */}
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <h3 className="text-sm font-semibold">SEO Metadata</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="meta_title">Meta Title</Label>
                                <Input
                                    id="meta_title"
                                    value={formData.meta_title || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, meta_title: e.target.value })
                                    }
                                    placeholder="SEO Title (max 60 chars)"
                                    maxLength={60}
                                />
                                <p className="text-xs text-muted-foreground">{(formData.meta_title || "").length}/60 characters</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meta_description">Meta Description</Label>
                                <Textarea
                                    id="meta_description"
                                    value={formData.meta_description || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, meta_description: e.target.value })
                                    }
                                    placeholder="SEO Description (max 160 chars)"
                                    maxLength={160}
                                    rows={3}
                                />
                                <p className="text-xs text-muted-foreground">{(formData.meta_description || "").length}/160 characters</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : blog ? "Update Blog" : "Create Blog"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
