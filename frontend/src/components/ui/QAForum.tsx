'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, MessageCircle, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import QuillEditor from './quillEditor';
import QAItemViewer from './QAItemViewer';
import { toast } from '@/hooks/use-toast';
import { jwtDecode } from "jwt-decode";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Skeleton } from './skeleton';

interface QAItem {
    id: string;
    author: string;
    parent_id: string | null
    author_id: string;
    user_id: string;
    isOrganizer?: boolean;
    timestamp: string;
    text: string;
    attachment?: { name: string; url: string; type: 'image' | 'doc' | 'pdf' };
    replies: QAItem[];
    role: string;
    collaboration?: {
        company_name?: string;
    };
}

interface QAForumProps {
    collaborationId: string;
    isExpired?: boolean;
}

const QAReplyForm = ({
    parentId,
    onAddReply,
    onCancel,
    isPostingReply
}: {
    parentId: string;
    onAddReply: (text: string, file: File | null) => void;
    onCancel: () => void;
    isPostingReply: boolean
}) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleCancelFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = () => {
        if (text.trim() || file) {
            onAddReply(text, file);
            setText('');
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="ml-8 mt-2 space-y-2 border-l-2 pl-4">
            <QuillEditor
                value={text}
                onChange={setText}
                placeholder="Ask your question here..."
                height="150px"
                disabled={isPostingReply}
            />
            <div className="flex justify-between items-center">
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    disabled={isPostingReply}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className='flex items-center gap-2'>
                    <div className='flex flex-col md:flex-row items-center gap-2'>
                        <Button
                            className='flex gap-2'
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!!file || isPostingReply}
                        >
                            <Paperclip className="h-4 w-4" />
                            <p>Attachment</p>
                        </Button>
                        <span className="text-xs text-muted-foreground md:block hidden">
                            Supported file types: PDF, DOC, DOCX, JPG, PNG
                        </span>
                    </div>

                    {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
                    {file && (
                        <Button
                            variant="destructive"
                            onClick={handleCancelFile}
                            className="text-xs"
                            disabled={isPostingReply}
                        >
                            Remove File
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPostingReply}>
                        Cancel
                    </Button>
                    <Button disabled={isPostingReply} size="sm" onClick={handleSubmit}>
                        {isPostingReply ? "Posting..." : "Reply"}
                    </Button>
                </div>
            </div>
        </div>
    );
};



const QAItemView = ({
    item,
    onReply,
    replyingTo,
    setReplyingTo,
    onAddReply,
    onDelete,
    onUpdate,
    isPostingReply,
    isUpdating,
    isExpired

}: {
    item: QAItem;
    onReply: (id: string) => void;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    onAddReply: (parentId: string, text: string, file: File | null) => void;
    onDelete: (id: string) => void;
    onUpdate: (itemId: string, updatedText: string, newFile: File | null, removeExistingAttachment: boolean) => void;
    isPostingReply: boolean
    isUpdating: boolean
    isExpired?: boolean
}) => {

    const [isAuthor, setIsAuthorOrAdmin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(item.text);
    const [editFile, setEditFile] = useState<File | null>(null);
    const [removeAttachment, setRemoveAttachment] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const getCurrentUserId = (): string | null => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload: { user_id: string } = jwtDecode(token);
                return payload.user_id;
            } catch (e) {
                console.error("Failed to decode token for user ID:", e);
                return null;
            }
        }
        return null;
    };

    const getCurrentUserRole = (): string[] => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload: { user_id: string, role: string[] } = jwtDecode(token);
                return payload.role || [];
            } catch (e) {
                console.error("Failed to decode token for roles:", e);
                return [];
            }
        }
        return [];
    };

    const getQAactions = (item: QAItem) => {
        const authorId = item.author_id;
        const currentUserId = getCurrentUserId();
        const currentUserRoles = getCurrentUserRole();

        const isAuthor = currentUserId !== null && currentUserId === authorId;
        const isAdmin = currentUserRoles.includes('admin');

        const createdAt = new Date(item.timestamp);

        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        const canEdit = (isAdmin) || (isAuthor && diffMinutes < 5);
        const canDelete = (isAdmin) || (isAuthor && diffMinutes < 30);

        return { canEdit, canDelete, isAuthor, isAdmin };
    };

    useEffect(() => {
        if (isEditing) {
            if (item.text) {
                setEditText(item.text);
            }
        }
    }, [isEditing, item.text]);
    const handleSaveEdit = () => {
        onUpdate(item.id, editText, editFile, removeAttachment);
        setIsEditing(false);
        setEditFile(null);
        setRemoveAttachment(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditText(item.text);
        setEditFile(null);
        setRemoveAttachment(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditFile(e.target.files?.[0] || null);
        setRemoveAttachment(false);
    };

    const handleRemoveCurrentAttachment = () => {
        setRemoveAttachment(true);
        setEditFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    function formatRelativeTime(dateString: string): string {
        const now = new Date();
        const past = new Date(dateString);

        const diff = (now.getTime() - past.getTime()) / 1000;

        const minutes = Math.floor(diff / 60);
        const hours = Math.floor(diff / 3600);
        const days = Math.floor(diff / 86400);
        const months = Math.floor(diff / 2592000);
        const years = Math.floor(diff / 31536000);

        if (diff < 5) return "just now";
        if (diff < 60) return `${Math.floor(diff)}s`;
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 30) return `${days}d`;
        if (months < 12) return `${months}mo`;
        return `${years}y`;
    }


    const { canEdit, canDelete } = getQAactions(item);

    return (
        <div className="flex gap-3 text-base mt-6">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Avatar className="h-6 w-6">
                        <AvatarFallback>{item?.author?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span
                        className={`font-semibold text-[14px] text-foreground`}
                    >
                        {item?.author || 'Unknown User'}
                    </span>
                    {item.isOrganizer ? (
                        <Badge variant="secondary">{item.collaboration?.company_name} Staff</Badge>
                    ) : item.role === "admin" ? (
                        <Badge variant="default">Hustloop Triager</Badge>
                    ) : (
                        <Badge variant="outline">{item.role}</Badge>
                    )}
                    <span>• {formatRelativeTime(item.timestamp)}</span>
                </div>
                <div className='ml-2 py-1 max-w-full break-words'>
                    <QAItemViewer html={item.text} />
                    {item.attachment && (
                        <a
                            href={item.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 ml-2  flex items-center gap-2 text-sm text-blue-500 hover:underline"
                        >
                            <Paperclip className="h-4 w-4" />
                            {item.attachment.name}
                        </a>
                    )}
                </div>
                {isEditing ? (
                    <div className="space-y-2">
                        <QuillEditor
                            key={`edit-${item.id}`}
                            value={editText}
                            onChange={setEditText}
                            placeholder="Edit your question/reply..."
                            height="150px"
                            disabled={isUpdating}
                        />
                        <div className="flex justify-between items-center">
                            <Input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                disabled={isUpdating}
                                onChange={handleFileChange}
                            />

                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isUpdating}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
                                    {isUpdating ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mt-1">
                            {!isExpired && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => onReply(item.id)}
                                >
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    Reply
                                </Button>
                            )}

                            <>
                                {canEdit && (
                                    (item.text ? <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit
                                    </Button> : null)
                                )}
                                {canDelete && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-red-500 hover:text-red-600"
                                        onClick={() => onDelete(item.id)}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </>
                        </div>
                    </>
                )}


                {replyingTo === item.id && (
                    <QAReplyForm
                        parentId={item.id}
                        onCancel={() => setReplyingTo(null)}
                        onAddReply={(text, file) => onAddReply(item.id, text, file)}
                        isPostingReply={isPostingReply}
                    />
                )}

                <div className="mt-4 space-y-4 border-l-2 pl-4">
                    {(item.replies || []).map((reply) => (
                        <QAItemView
                            key={reply.id}
                            item={reply}
                            onReply={onReply}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            onAddReply={onAddReply}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            isPostingReply={isPostingReply}
                            isUpdating={isUpdating}
                            isExpired={isExpired}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
};

export function QAForum({ collaborationId, isExpired }: QAForumProps) {
    const [qaData, setQaData] = useState<QAItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPostingQuestion, setIsPostingQuestion] = useState(false);
    const [isPostingReply, setIsPostingReply] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const openDeleteDialog = (id: string) => {
        setDeleteId(id);
    };

    useEffect(() => {
        if (!collaborationId) return;
        const fetchQA = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");

                const res = await fetch(`${API_BASE_URL}/api/qa/${collaborationId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                setQaData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchQA();
    }, [collaborationId]);



    const addReplyToItem = (items: QAItem[], parentId: string, newReply: QAItem): QAItem[] => {
        return items.map((item) => {
            if (item.id === parentId) {
                return { ...item, replies: [...item.replies, newReply] };
            }
            if (item.replies.length > 0) {
                return { ...item, replies: addReplyToItem(item.replies, parentId, newReply) };
            }
            return item;
        });
    };

    const handlePostQuestion = async () => {
        if (!newQuestion.trim() && !newFile) return;

        setIsPostingQuestion(true);

        const formData = new FormData();
        formData.append('text', newQuestion);
        formData.append('collaboration_id', String(collaborationId));
        if (newFile) formData.append('attachment', newFile);

        try {
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE_URL}/api/qa`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) {
                toast({ title: 'Failed to post question', variant: "destructive" });
                return;
            }

            const newItem = await res.json();

            setQaData((prev) => [newItem, ...prev]);
            setNewQuestion('');
            setNewFile(null);
        } finally {
            setIsPostingQuestion(false);
        }
    };


    const handleAddReply = async (parentId: string, text: string, file: File | null) => {
        if (!text.trim() && !file) {
            toast({
                variant: "destructive",
                title: "Reply cannot be empty",
            });
            return;
        }
        setIsPostingReply(true)
        try {
            const formData = new FormData();

            formData.append('text', text);
            formData.append('collaboration_id', String(collaborationId));
            formData.append('parent_id', String(parentId));
            if (file) formData.append('attachment', file);

            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE_URL}/api/qa`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                toast({
                    variant: "destructive",
                    title: "Failed to post reply",
                    description: error.error || "Something went wrong.",
                });
                return;
            }

            const newReply = await res.json();
            setQaData(prev => addReplyToItem(prev, parentId, newReply));
            setReplyingTo(null);
        } catch (err) {
            console.error("Reply error:", err);
            toast({
                variant: "destructive",
                title: "Network error",
                description: "Unable to post your reply. Please try again.",
            });
        } finally {
            setIsPostingReply(false)
        }
    };


    const confirmDelete = async () => {
        if (!deleteId) return;

        setIsDeleting(true);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/qa/${deleteId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const error = await res.json();
                toast({
                    variant: "destructive",
                    title: "Delete failed",
                    description: error.message || "Something went wrong. Please try again.",
                });
                return;
            }

            const removeItem = (items: QAItem[]): QAItem[] =>
                items
                    .filter((i) => i.id !== deleteId)
                    .map((i) => ({
                        ...i,
                        replies: removeItem(i.replies),
                    }));

            setQaData((prev) => removeItem(prev));

            toast({
                title: "Deleted successfully",
                description: "The question has been removed.",
            });
        } catch (err) {
            console.error("Error deleting item:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete the question. Please try again later.",
            });
        } finally {
            setIsDeleting(false);
            setDeleteId(null);
        }
    };

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleCancel = () => {
        setNewFile(null);
        setNewQuestion('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    const updateItemInTree = (items: QAItem[], updatedItem: QAItem): QAItem[] => {
        return items.map((item) => {
            if (item.id === updatedItem.id) {
                return {
                    ...item,
                    ...updatedItem,
                    replies: updatedItem.replies || item.replies || []
                };
            }
            if ((item.replies || []).length > 0) {
                return { ...item, replies: updateItemInTree(item.replies || [], updatedItem) };
            }
            return item;
        });
    };

    const handleUpdateItem = async (
        itemId: string,
        updatedText: string,
        newFile: File | null,
        removeExistingAttachment: boolean
    ) => {
        const formData = new FormData();
        setIsUpdating(true)
        formData.append('text', updatedText);
        formData.append('collaboration_id', String(collaborationId));
        if (newFile) {
            formData.append('attachment', newFile);
        } else if (removeExistingAttachment) {
            formData.append('remove_attachment', 'true');
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/qa/${itemId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                toast({
                    variant: "destructive",
                    title: "Update failed",
                    description: error.message || "Something went wrong. Please try again.",
                });
                return;
            }

            const updatedItem = await res.json();
            setQaData((prev) => updateItemInTree(prev, updatedItem));
            toast({
                title: "Updated successfully",
                description: "Your item has been updated.",
            });
        } catch (err) {
            console.error("Error updating item:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update the item. Please try again later.",
            });
        } finally {
            setIsUpdating(false)
        }
    };


    return (
        <Card className="border shadow-sm p-4 min-h-[400px]">
            <div className="mb-8 text-left m-3">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <HelpCircle className="h-8 w-8" />
                    Q/A Forum
                </h2>
                <p className="text-muted-foreground">
                    Ask questions and collaborate with others on this challenge.
                </p>
            </div>

            <CardContent>
                {/* Display existing questions first */}
                {loading ? (
                    <div className="space-y-6 mt-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {qaData.map((item, id) => (
                            <QAItemView
                                key={id}
                                item={item}
                                onReply={setReplyingTo}
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                onAddReply={handleAddReply}
                                onDelete={openDeleteDialog}
                                onUpdate={handleUpdateItem}
                                isPostingReply={isPostingReply}
                                isUpdating={isUpdating}
                                isExpired={isExpired}
                            />
                        ))}
                    </div>
                )}

                {/* Separator between questions and form */}
                {qaData.length > 0 && !loading && !isExpired && (
                    <div className='mt-6 mb-4'>
                        <Separator />
                    </div>
                )}

                {/* Question form - always visible when not expired */}
                {!isExpired && (
                    <div className="space-y-3 p-4 border rounded-lg bg-background w-full mt-4">
                        <h4 className="font-semibold">Ask a Question</h4>
                        <QuillEditor
                            value={newQuestion}
                            onChange={setNewQuestion}
                            placeholder="Ask your question here..."
                            height="150px"
                            disabled={isPostingQuestion}
                        />

                        <div className="flex gap-2 items-center justify-between">
                            <div className='flex items-center  gap-2'>
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    disabled={isPostingQuestion}
                                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                                />

                                <div className='flex flex-col md:flex-row justify-center items-center gap-2'>
                                    <Button
                                        className='flex gap-2'
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!!newFile || isPostingQuestion}
                                    >
                                        <Paperclip className="h-4 w-4" />
                                        <p>Attachment</p>
                                    </Button>
                                    <span className="text-xs text-muted-foreground hidden md:block">
                                        Supported file types: PDF, DOC, DOCX, JPG, PNG
                                    </span>
                                </div>

                                {newFile && (
                                    <Button
                                        variant="destructive"
                                        onClick={handleCancel}
                                        className="text-xs"
                                        disabled={isPostingQuestion}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>

                            <div className="flex-grow" />
                            <Button onClick={handlePostQuestion} disabled={isPostingQuestion}>
                                {isPostingQuestion ? "Posting..." : "Post Question"}
                            </Button>
                        </div>

                        {newFile && <p className="text-xs text-muted-foreground">Selected: {newFile.name}</p>}
                    </div>
                )}

                {/* Expired state message */}
                {isExpired && (
                    <div className="text-center py-6 text-muted-foreground mt-4">
                        <p className="font-semibold">This Q/A section is closed.</p>
                        <p className="text-sm">New questions and replies are disabled because the challenge has ended or is stopped.</p>
                    </div>
                )}

                <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Question?</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. Are you sure you want to delete this question?
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className='flex flex-col gap-2'>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>
                                Cancel
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card >
    );
}
