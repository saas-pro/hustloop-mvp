"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Save, ChevronLeft, Send, Trash2, UploadCloud, Image as ImageIcon,
    Globe, Linkedin, Twitter, Instagram, Youtube, User2
} from "lucide-react";
import EditorBubbleMenu from "./EditorBubbleMenu";
import {
    bloggerCreateBlog, bloggerUpdateBlog, submitForReview,
    type BlogPost, type CreateBlogData
} from "@/lib/api";

interface BloggerEditorProps {
    initialData?: BlogPost;
    onBack: () => void;
    onSaveSuccess: () => void;
}

const LIMITS = {
    title: 200,
    tags: 300,
    excerpt: 500,
    youtubeEmbedUrl: 500,
    metaTitle: 60,
    metaDescription: 160,
};

function CharCounter({ current, max }: { current: number; max: number }) {
    const near = current >= max * 0.85;
    const over = current >= max;
    return (
        <span className={`text-xs font-mono tabular-nums transition-colors ${over ? "text-destructive font-semibold" : near ? "text-amber-500" : "text-muted-foreground"}`}>
            {current}/{max}
        </span>
    );
}

function FieldLabel({ label, required, current, max }: { label: string; required?: boolean; current: number; max: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </span>
            <CharCounter current={current} max={max} />
        </div>
    );
}

function SmallLabel({ label, required, current, max }: { label: string; required?: boolean; current: number; max: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </span>
            <CharCounter current={current} max={max} />
        </div>
    );
}

function InlineError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function SocialInput({
    icon: Icon,
    label,
    placeholder,
    value,
    onChange,
}: {
    icon: React.ElementType;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Icon className="h-3 w-3" /> {label}
            </label>
            <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="bg-background text-sm" />
        </div>
    );
}

export default function BloggerEditor({ initialData, onBack, onSaveSuccess }: BloggerEditorProps) {
    // ── Content fields ──────────────────────────────────────────────────────
    const [title, setTitle] = useState(initialData?.title || "");
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
    const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
    const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
    const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
    const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(initialData?.youtube_embed_url || "");

    // ── Social / website links (stored on the blog post) ───────────────────
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.website_url || "");
    const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url || "");
    const [twitterUrl, setTwitterUrl] = useState(initialData?.x_url || "");
    const [instagramUrl, setInstagramUrl] = useState(initialData?.instagram_url || "");
    const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url || "");

    // ── Image ───────────────────────────────────────────────────────────────
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>(initialData?.featured_image_url || "");
    const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);

    // ── UI state ────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [validated, setValidated] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: "Write your story here..." }),
            Link.configure({ openOnClick: false }),
            Image,
            Typography,
            Highlight,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: initialData?.content || "",
        editorProps: {
            attributes: {
                class: "editor-content max-w-none focus:outline-none min-h-[500px] px-4 py-8 pt-4",
            },
        },
    });

    // Revoke object URL on unmount
    useEffect(() => {
        return () => {
            if (featuredImagePreview && !featuredImagePreview.startsWith('http')) {
                URL.revokeObjectURL(featuredImagePreview);
            }
        };
    }, [featuredImagePreview]);

    // Live re-validate after first attempt
    useEffect(() => {
        if (validated) validateFields();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, youtubeEmbedUrl, validated]);

    const validateFields = () => {
        const errs: Record<string, string> = {};
        if (!title.trim()) errs.title = "Title is required.";
        if (!youtubeEmbedUrl.trim()) errs.youtubeEmbedUrl = "YouTube Embed URL is required.";
        if (editor && editor.getText().trim() === "") errs.content = "Content is required.";
        setErrors(errs);
        return errs;
    };

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
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const buildData = (): CreateBlogData => {
        const data: CreateBlogData = {
            title,
            excerpt,
            content: editor!.getHTML(),
            tags,
            meta_title: metaTitle,
            meta_description: metaDescription,
            youtube_embed_url: youtubeEmbedUrl,
            website_url: websiteUrl || undefined,
            instagram_url: instagramUrl || undefined,
            linkedin_url: linkedinUrl || undefined,
            x_url: twitterUrl || undefined,
            youtube_url: youtubeUrl || undefined,
        };
        if (featuredImageFile) {
            data.featured_image = featuredImageFile;
        } else if (featuredImagePreview) {
            data.featured_image_url = featuredImagePreview;
        }
        return data;
    };

    const handleSave = async (): Promise<BlogPost | null> => {
        setValidated(true);
        const errs = validateFields();

        if (errs.title) {
            toast({ title: "Title Required", description: "Please enter a title.", variant: "destructive" });
            return null;
        }
        if (errs.content) {
            toast({ title: "Content Required", description: "Please write some content.", variant: "destructive" });
            return null;
        }
        if (errs.youtubeEmbedUrl) {
            toast({ title: "YouTube Link Required", description: "Please enter a YouTube Embed URL.", variant: "destructive" });
            return null;
        }
        if (!token) return null;

        try {
            setSaving(true);
            let savedBlog: BlogPost;
            if (initialData) {
                const res = await bloggerUpdateBlog(initialData.id, buildData(), token);
                savedBlog = res.blog;
                toast({ title: "Updated", description: "Blog post saved." });
            } else {
                const res = await bloggerCreateBlog(buildData(), token);
                savedBlog = res.blog;
                toast({ title: "Created", description: "Blog saved as draft." });
            }
            onSaveSuccess();
            return savedBlog;
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save.", variant: "destructive" });
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!token) return;
        setSubmitting(true);
        try {
            const savedBlog = await handleSave();
            if (!savedBlog) { setSubmitting(false); return; }
            await submitForReview(savedBlog.id, token);
            toast({ title: "Submitted", description: "Blog submitted for review." });
            onBack();
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to submit.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const isDraft = !initialData || initialData.status === 'draft';
    const isRejected = initialData?.status === 'rejected';

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Sticky header bar */}
            <div className="flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-4 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-semibold">{initialData ? "Edit Post" : "New Post"}</h1>
                        {initialData && (
                            <Badge variant={
                                initialData.status === 'published' ? 'default' :
                                    initialData.status === 'rejected' ? 'destructive' :
                                        initialData.status === 'pending_review' ? 'secondary' : 'outline'
                            } className="mt-1 w-fit">
                                {initialData.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {isRejected && initialData?.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                    <h3 className="text-red-800 dark:text-red-200 font-semibold mb-1">Reviewer Feedback:</h3>
                    <p className="text-red-700 dark:text-red-300 text-sm whitespace-pre-wrap">{initialData.rejection_reason}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ── Left: Editor ─────────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Blog Title<span className="text-destructive ml-0.5">*</span>
                            </span>
                            <CharCounter current={title.length} max={LIMITS.title} />
                        </div>
                        <Textarea
                            placeholder="Blog Title"
                            value={title}
                            maxLength={LIMITS.title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                e.target.style.height = 'inherit';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className={`!text-3xl !font-headline sm:text-4xl font-bold border-none px-4 focus-visible:ring-0 placeholder:text-muted-foreground/40 shadow-none bg-transparent resize-none overflow-hidden h-fit leading-tight w-full ${errors.title ? "border-b border-destructive" : ""}`}
                            rows={1}
                        />
                        <InlineError message={errors.title} />
                    </div>

                    {/* Editor */}
                    <div className="editor-wrapper">
                        <EditorBubbleMenu editor={editor} />
                        <div className={`border rounded-none bg-card/50 ${errors.content ? "border-destructive" : "border-border/50"}`}>
                            <EditorContent editor={editor} />
                        </div>
                        <InlineError message={errors.content} />
                    </div>
                </div>

                {/* ── Right: Sticky sidebar ─────────────────────────────────── */}
                <div className="lg:col-span-4 sticky top-[73px] self-start max-h-[calc(100vh-90px)] overflow-y-auto space-y-4 pr-1">

                    {/* Main metadata card */}
                    <Card className="p-5 space-y-5 bg-muted/20 border-border/50 shadow-sm">
                        {/* Featured Image */}
                        <div className="space-y-2">
                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" /> Featured Image
                            </span>
                            {featuredImagePreview ? (
                                <div className="relative rounded-lg overflow-hidden border border-border group aspect-video">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={featuredImagePreview} alt="Featured" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={removeImage}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-video flex flex-col items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">Click to upload</p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF (max 5 MB)</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <FieldLabel label="Tags" current={tags.length} max={LIMITS.tags} />
                            <Input placeholder="tech, innovation, ai" value={tags} maxLength={LIMITS.tags} onChange={(e) => setTags(e.target.value)} className="bg-background" />
                            <p className="text-xs text-muted-foreground">Comma-separated</p>
                        </div>

                        {/* Excerpt */}
                        <div className="space-y-2">
                            <FieldLabel label="Short Description" current={excerpt.length} max={LIMITS.excerpt} />
                            <Textarea placeholder="A brief summary..." value={excerpt} maxLength={LIMITS.excerpt} onChange={(e) => setExcerpt(e.target.value)} className="bg-background h-24" />
                        </div>

                        {/* YouTube Embed URL */}
                        <div className="space-y-2">
                            <FieldLabel label="YouTube Embed URL" required current={youtubeEmbedUrl.length} max={LIMITS.youtubeEmbedUrl} />
                            <Input
                                placeholder="https://www.youtube.com/embed/..."
                                value={youtubeEmbedUrl}
                                maxLength={LIMITS.youtubeEmbedUrl}
                                onChange={(e) => setYoutubeEmbedUrl(e.target.value)}
                                className={`bg-background ${errors.youtubeEmbedUrl ? "border-destructive" : ""}`}
                            />
                            {errors.youtubeEmbedUrl
                                ? <InlineError message={errors.youtubeEmbedUrl} />
                                : <p className="text-xs text-muted-foreground">Required</p>
                            }
                        </div>

                        {/* SEO */}
                        <div className="border-t border-border/50 pt-4 space-y-4">
                            <h3 className="text-sm font-semibold">SEO Metadata</h3>
                            <div className="space-y-2">
                                <SmallLabel label="Meta Title" current={metaTitle.length} max={LIMITS.metaTitle} />
                                <Input placeholder="SEO Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={LIMITS.metaTitle} className="bg-background" />
                            </div>
                            <div className="space-y-2">
                                <SmallLabel label="Meta Description" current={metaDescription.length} max={LIMITS.metaDescription} />
                                <Textarea placeholder="SEO Description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={LIMITS.metaDescription} className="bg-background resize-none h-20" />
                            </div>
                        </div>
                    </Card>

                    {/* Social / Author Links card */}
                    <Card className="p-5 space-y-4 bg-muted/20 border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User2 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Author / Blog Links</h3>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">Shown on your published blog post.</p>

                        <SocialInput icon={Globe} label="Website" placeholder="https://yourwebsite.com" value={websiteUrl} onChange={setWebsiteUrl} />
                        <SocialInput icon={Linkedin} label="LinkedIn" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={setLinkedinUrl} />
                        <SocialInput icon={Twitter} label="X / Twitter" placeholder="https://twitter.com/..." value={twitterUrl} onChange={setTwitterUrl} />
                        <SocialInput icon={Instagram} label="Instagram" placeholder="https://instagram.com/..." value={instagramUrl} onChange={setInstagramUrl} />
                        <SocialInput icon={Youtube} label="YouTube Channel" placeholder="https://youtube.com/@..." value={youtubeUrl} onChange={setYoutubeUrl} />

                        <div className="pt-2 border-t border-border/50 flex flex-col gap-3">
                            {(isDraft || isRejected) ? (
                                <>
                                    <Button
                                        className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-sm mb-2"
                                        size="lg"
                                        onClick={handleSave}
                                        disabled={submitting || saving}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? "Saving..." : "Save Draft"}
                                    </Button>
                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                                        size="lg"
                                        onClick={handleSubmitForReview}
                                        disabled={submitting || saving}
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {submitting ? "Submitting..." : "Submit for Review"}
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Admins will review before it goes live.
                                    </p>
                                </>
                            ) : (
                                <Button
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                                    size="lg"
                                    onClick={handleSave}
                                    disabled={submitting || saving}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <style jsx global>{`
        .editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.5);
          pointer-events: none;
          height: 0;
        }
        .editor-wrapper .ProseMirror { outline: none !important; color: hsl(var(--foreground)); line-height: 1.6; font-size: 1.125rem; }
        .editor-wrapper .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin: 2rem 0 1rem; }
        .editor-wrapper .ProseMirror h2 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 .75rem; }
        .editor-wrapper .ProseMirror h3 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 .5rem; }
        .editor-wrapper .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; }
        .editor-wrapper .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
        .editor-wrapper .ProseMirror li { margin-bottom: .5rem; }
        .editor-wrapper img { border-radius: .75rem; margin: 2rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .editor-wrapper blockquote { border-left: 4px solid hsl(var(--primary)); background: hsl(var(--muted)/.5); padding: 1.5rem; margin: 1.5rem 0; font-style: italic; border-radius: 0 .5rem .5rem 0; }
        .editor-wrapper pre { background: #0f172a; color: #e2e8f0; padding: 1.5rem; border-radius: .75rem; margin: 1.5rem 0; overflow-x: auto; }
        .editor-wrapper code { background: hsl(var(--muted)); padding: .2rem .4rem; border-radius: .25rem; font-size: .875rem; }
        .editor-wrapper pre code { background: transparent; padding: 0; }
      `}</style>
        </div>
    );
}
