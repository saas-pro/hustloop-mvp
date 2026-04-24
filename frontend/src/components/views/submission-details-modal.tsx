'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

import {
    Info,
    Paperclip,
    File as FileIcon,
    X,
    Trash2,
    Edit,
    Save,
    Loader2,
    Reply
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';
import { MarkdownViewer } from '../ui/markdownViewer';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Submission } from '@/app/types';
import { SolutionMarkdownViewer } from '../ui/SolutionMarkdownViewer';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { AvatarCircles } from '@/components/ui/avatar-circles';

interface FileData {
    name: string;
    path: string;
    previewUrl: string;
}



interface Comment {
    id: string;
    authorId: string;
    authorName?: string;
    authorRole?: string;
    text: string;
    timestamp: string;
    solutionId: string;
    parentId?: string | null;
    fileName?: string;
    fileURL?: string;
    isUpdated?: boolean;
    commentType?: string;
}



interface SubmissionDetailsModalProps {
    submission: Submission | null;
    onOpenChange: (open: boolean) => void;
}

const socket: Socket = io(API_BASE_URL, {
    transports: ['websocket'],
    withCredentials: true,
});

export default function SubmissionDetailsModal({
    submission,
    onOpenChange,
}: SubmissionDetailsModalProps) {
    const { toast } = useToast();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
    const textareaId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const [isOtherType, setIsOtherType] = useState<boolean>(false);

    const isCommentsDisabled =
        (submission?.challenge?.status === 'stopped') || (submission?.status === 'rejected');

    const scrollToBottom = useCallback(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

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

    useEffect(() => {
        if (!submission) return;
        const fetchComments = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/comments?solutionId=${submission.solutionId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error('Failed to load comments');
                const data = await res.json();
                setComments(data.comments || []);

                scrollToBottom();
            } catch {
                toast({
                    title: 'Error',
                    description: 'Failed to load comments',
                    variant: 'destructive',
                });
            }
        };

        fetchComments();
    }, [submission?.solutionId, toast, scrollToBottom, submission]);

    useEffect(() => {
        if (!submission) return;
        const { solutionId } = submission;

        socket.emit('join_solution', { solutionId });

        socket.on("new_comment", (comment: Comment) => {
            if (comment.solutionId !== solutionId) return;

            setComments((prev) => {
                if (prev.some((c) => c.id === comment.id)) {
                    return prev;
                }
                return [...prev, comment];
            });

            setTimeout(scrollToBottom, 150);
        });


        return () => {
            socket.emit('leave_solution', { solutionId });
            socket.off('new_comment');
        };
    }, [submission?.solutionId, scrollToBottom, submission]);

    const handleAddComment = async () => {
        if (!newComment.trim() && !attachedFile) {
            toast({ title: 'Error', description: 'Please enter a comment or attach a file.', variant: 'destructive' });
            return;
        }

        const formData = new FormData();
        formData.append('text', newComment);
        formData.append('solutionId', submission!.solutionId);
        formData.append('challengeId', submission!.challengeId);
        if (replyingTo) formData.append('parentId', replyingTo.id);
        if (attachedFile) formData.append('file', attachedFile);

        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/comments`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to add comment');


            const data = await res.json();
            const newCommentObj = data.comment;
            setComments((prev) => {
                if (prev.some((c) => c.id === newCommentObj.id)) return prev;
                return [...prev, newCommentObj];
            });
            setNewComment('');
            setAttachedFile(null);
            setReplyingTo(null);
        } catch {
            toast({ title: 'Error', description: 'Could not add comment.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteComment = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            toast({ title: 'Comment deleted' });
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch {
            toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
        }
    };

    const handleEditComment = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditingText(comment.text);
    };

    const handleSaveEdit = async () => {
        if (!editingText.trim() || !editingCommentId) return;

        setIsLoading(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${editingCommentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: editingText }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                toast({
                    title: 'Error',
                    description: responseData.error || 'Failed to update comment',
                    variant: 'destructive',
                });
                return;
            }

            const updatedCommentData: Comment = responseData.comment;

            if (!updatedCommentData || !updatedCommentData.text) {
                throw new Error('Invalid response from server.');
            }
            setComments((prevComments) =>
                prevComments.map((comment) =>
                    comment.id === editingCommentId
                        ? {
                            ...comment,
                            text: updatedCommentData.text,
                            isUpdated: updatedCommentData.isUpdated ?? true,
                            timestamp: updatedCommentData.timestamp,
                        }
                        : comment
                )
            );

            toast({
                title: 'Success',
                description: 'Comment updated successfully!',
            });
            setEditingCommentId(null);
            setEditingText('');
        } catch (err) {
            console.error('Error updating comment:', err);
            toast({
                title: 'Error',
                description: 'Failed to edit comment',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelReply = () => setReplyingTo(null);

    const findParentComment = (parentId: string | null): Comment | undefined => {
        if (!parentId) return undefined;
        const stringParentId = String(parentId);
        return comments.find(c => String(c.id) === stringParentId);
    };

    useEffect(() => {
        if (highlightedCommentId) {
            const element = document.getElementById(`comment-${highlightedCommentId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const timeout = setTimeout(() => setHighlightedCommentId(null), 3000);
                return () => clearTimeout(timeout);
            }
        }
    }, [highlightedCommentId, comments]);

    if (!submission) return null;

    const scrollToComment = (id: string) => {
        const element = document.getElementById(`comment-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(id);
            setTimeout(() => {
                setHighlightedCommentId(null);
            }, 3000);
        }
    };

    function formatTime(timestamp: Date) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

        if (diffSeconds < 60) {
            return "just now";
        } else if (diffSeconds < 3600) {
            const minutes = Math.floor(diffSeconds / 60);
            return `${minutes} m${minutes > 1 ? "" : ""} ago`;
        } else if (diffSeconds < 86400) {
            const hours = Math.floor(diffSeconds / 3600);
            return `${hours} h${hours > 1 ? "" : ""} ago`;
        } else {
            const days = Math.floor(diffSeconds / 86400);
            return `${days} d${days > 1 ? "" : ""} ago`;
        }
    }

    const renderFileAttachment = (fileURL: string, fileName: string, key: string) => (
        <a
            href={fileURL}
            rel="noopener noreferrer"
            key={key}
            className="flex items-center gap-2 p-2 mt-2 border border-dashed rounded-md bg-accent/30 hover:bg-accent transition-colors"
        >
            <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium text-sm text-primary break-words">
                {fileName || 'Attached File'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap flex-shrink-0">
                (Click to View)
            </span>
        </a>
    );

    const getCommentActions = (comment: Comment) => {
        const authorId = comment.authorId;
        const currentUserId = getCurrentUserId();
        const currentUserRoles = getCurrentUserRole();

        const isAuthor = currentUserId !== null && currentUserId === authorId;
        const isAdmin = currentUserRoles.includes('admin');

        const createdAt = new Date(comment.timestamp);

        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        const canEdit = (isAdmin) || (isAuthor && diffMinutes < 5);
        const canDelete = (isAdmin) || (isAuthor && diffMinutes < 30);

        return { canEdit, canDelete, isAuthor, isAdmin };
    };

    return (
        <Dialog open={!!submission} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col border bg-background w-[90vw] h-[90vh] max-w-[90vw] p-0 rounded-lg shadow-lg">
                <div className="flex justify-between items-center p-4 border-b bg-muted/50">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-medium text-muted-foreground">
                            {submission.challenge?.postedBy?.companyName || "Unknown Company"}
                        </h2>
                        <DialogTitle className="text-xl font-bold text-foreground">
                            {submission.challenge?.title || "Untitled Challenge"}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Submitted by <span className="font-semibold">{submission.contactName}</span>
                        </p>
                    </div>

                </div>

                <div className="flex-grow overflow-y-auto p-4">

                    {/* TIMELINE WRAPPER */}
                    <div className="relative pl-2 space-y-4">

                        {/* GLOBAL TIMELINE LINE that scrolls correctly */}
                        <div className="absolute left-[28px] top-1 bottom-1 w-px bg-muted-foreground"></div>


                        {/* ===================== DESCRIPTION CARD ===================== */}
                        <Card className="rounded-none border-none shadow-none bg-transparent relative">
                            <CardHeader className="p-1 flex flex-row items-start justify-between">

                                <div className="flex gap-3 items-start relative">

                                    {/* Submission Avatar – anchored to timeline */}
                                    <Avatar className="h-8 w-8 relative z-10">
                                        <AvatarFallback className="font-semibold">
                                            {submission.contactName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>



                                    <div className='flex flex-col justify-between'>
                                        <div className="flex items-center gap-2">
                                            <p className="text-muted-foreground text-sm">
                                                Submitted By{" "}
                                                <span className="font-semibold">
                                                    {submission.contactName} to {submission.challenge?.postedBy?.companyName}
                                                </span>
                                            </p>
                                        </div>


                                        <div className="mt-3">
                                            <h1 className="text-lg mb-2">Description:</h1>
                                            <SolutionMarkdownViewer content={submission.description} />

                                            {submission.files && submission.files?.length > 0 && (
                                                <div className="mt-4 border-t pt-3">
                                                    <p className="font-medium text-primary-dark mb-2">
                                                        Attached Submission Files:
                                                    </p>

                                                    <div className="space-y-2">
                                                        {submission.files.map((file) =>
                                                            renderFileAttachment(file.previewUrl, file.name, file.name)
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {submission.team_members && submission.team_members.length > 0 && (
                                                <div className="mt-4 border-t pt-3">
                                                    <p className="font-medium text-primary-dark mb-2">
                                                        {submission.team_members.length === 1
                                                            ? "Submitter:"
                                                            : `Team Members (${submission.team_members.length}):`}
                                                    </p>

                                                    <div className="flex items-center gap-4">
                                                        <AvatarCircles
                                                            avatarUrls={submission.team_members.map(member => ({
                                                                imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`,
                                                                profileUrl: member.name // Or a link to their profile if available
                                                            }))}
                                                            numPeople={submission.team_members.length > 5 ? submission.team_members.length - 5 : 0}
                                                        />
                                                        <div className="flex flex-col">
                                                            <p className="text-sm text-muted-foreground">
                                                                {submission.team_members.map(m => m.name).join(", ")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>


                            </CardHeader>
                        </Card>



                        {/* ===================== COMMENTS ===================== */}
                        {comments.length === 0 ? (
                            <p className="text-center text-muted-foreground mt-10">No comments yet. Be the first!</p>
                        ) : (
                            comments.map((comment) => {
                                const { canEdit, canDelete } = getCommentActions(comment);

                                if (comment.commentType === "verified") {
                                    return (
                                        <div key={comment.id} className="my-6 flex items-center w-full select-none">
                                            <div className="h-2 w-2 ml-[17.5px] z-10 bg-accent rounded-full"></div>
                                            <div className='flex items-center w-full overflow-hidden'>
                                                <div className="w-6 border-t border-muted-foreground flex-shrink-0"></div>

                                                <span className="mx-3 px-1 py-1 text-xs font-medium text-muted-foreground rounded-full truncate">
                                                    {comment.text}
                                                </span>
                                                {/* 
                                                <div className="w-10 border-t border-muted-foreground"></div> */}
                                            </div>

                                        </div>

                                    );
                                }
                                if (comment.commentType === "points") {
                                    return (
                                        <div key={comment.id} className="my-6 flex items-center w-full select-none">
                                            <div className="h-2 w-2 ml-[17.5px] z-10 bg-yellow-500 rounded-full"></div>
                                            <div className='flex items-center w-full overflow-hidden'>
                                                <div className="w-6 border-t border-muted-foreground flex-shrink-0"></div>

                                                <span className="mx-3 px-1 py-1 text-xs font-medium text-muted-foreground rounded-full truncate">
                                                    {comment.text} By {comment.authorName}
                                                </span>
                                                {/* 
                                                <div className="w-10 border-t border-muted-foreground"></div> */}
                                            </div>

                                        </div>

                                    );
                                }
                                if (comment.commentType === "delete") {
                                    return (
                                        <div key={comment.id} className="my-6 flex items-center w-full select-none">
                                            <div className="h-2 w-2 ml-[17.5px] z-10 bg-destructive rounded-full"></div>
                                            <div className='flex items-center w-full overflow-hidden'>
                                                <div className="w-6 border-t border-muted-foreground flex-shrink-0"></div>

                                                <span className="mx-3 px-1 py-1 text-xs font-medium text-muted-foreground rounded-full truncate">
                                                    {comment.text}
                                                </span>
                                                {/* 
                                                <div className="w-10 border-t border-muted-foreground"></div> */}
                                            </div>

                                        </div>

                                    );
                                }

                                if (comment.commentType && comment.commentType !== "comment") {
                                    return (
                                        <div key={comment.id} className="my-6 flex items-center w-full select-none">
                                            <div className="h-2 w-2 ml-[17.5px] z-10 bg-primary rounded-full"></div>
                                            <div className='flex items-center w-full overflow-hidden'>
                                                <div className="w-6 border-t border-muted-foreground flex-shrink-0"></div>
                                                <span className="mx-3 px-1 py-1 text-xs font-medium text-muted-foreground rounded-full truncate">
                                                    {comment.text} By {comment.authorName}
                                                </span>

                                                {/* <div className="w-10 border-t border-muted-foreground"></div> */}
                                            </div>
                                        </div>
                                    );
                                }


                                // ================= NORMAL COMMENT WITH AVATAR =================
                                const parentComment = comment.parentId ? findParentComment(comment.parentId) : null;

                                return (
                                    <div
                                        key={comment.id}
                                        id={`comment-${comment.id}`}
                                        className={`relative flex gap-3 p-2 items-start bg-transparent transition-all duration-300 ${highlightedCommentId === comment.id
                                            && 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                                            }`}
                                    >

                                        {/* Comment avatar aligned to timeline */}
                                        <Avatar className="h-8 w-8 relative z-10">
                                            <AvatarFallback className="font-semibold">
                                                {comment.authorName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* COMMENT BODY */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">

                                                <div className='flex flex-col sm:flex-row gap-1 sm:gap-2 sm:items-center flex-wrap'>
                                                    <p className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                                        <span className="text-foreground break-words">{comment.authorName}</span>

                                                        {comment.authorRole && (
                                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                                                {comment.authorRole.toLowerCase() === "organisation"
                                                                    ? `${submission.challenge?.postedBy?.companyName || "Unknown Company"} Staff`
                                                                    : comment.authorRole.toLowerCase() === "admin"
                                                                        ? "Hustloop Triager"
                                                                        : comment.authorRole.charAt(0).toUpperCase() + comment.authorRole.slice(1)}
                                                            </span>
                                                        )}

                                                        {comment.isUpdated && (
                                                            <span className="text-xs italic text-muted-foreground whitespace-nowrap">(edited)</span>
                                                        )}
                                                    </p>

                                                    <small className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatTime(new Date(comment.timestamp))}
                                                    </small>
                                                </div>


                                                <div className="flex items-center justify-end text-xs flex-shrink-0">

                                                    {/* Reply button */}
                                                    {!isCommentsDisabled && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs block"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReplyingTo(comment);
                                                            }}
                                                        >
                                                            Reply
                                                        </Button>
                                                    )}

                                                    {(canEdit || canDelete) && (
                                                        <DropdownMenu >
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 flex items-center justify-center"
                                                                    onClick={(e) => e.stopPropagation()}   // PREVENTS parent click
                                                                    disabled={isCommentsDisabled}
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>

                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-32"
                                                                onClick={(e) => e.stopPropagation()}        // PREVENTS parent click
                                                            >

                                                                {/* Edit */}
                                                                {canEdit && (
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditComment(comment);
                                                                        }}
                                                                    >
                                                                        <Edit className="h-3 w-3 mr-2" /> Edit
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {/* Delete */}
                                                                {canDelete && (
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-red-600 focus:text-red-600"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();

                                                                        }}
                                                                    >
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <div
                                                                                    className="flex items-center"
                                                                                    onClick={(e) => e.stopPropagation()}  // avoid parent clicks
                                                                                >
                                                                                    <Trash2 className="h-3 w-3 mr-2" /> Delete
                                                                                </div>
                                                                            </AlertDialogTrigger>

                                                                            <AlertDialogContent
                                                                                onClick={(e) => e.stopPropagation()}      // safe
                                                                            >
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        This action cannot be undone.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>

                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>

                                                                                    <AlertDialogAction
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeleteComment(comment.id);
                                                                                        }}
                                                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                                                    >
                                                                                        Delete
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </DropdownMenuItem>
                                                                )}

                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>


                                            </div>

                                            {parentComment && (
                                                <div
                                                    className="mb-3 p-2 rounded-lg border-l-4 border-muted-foreground/30 cursor-pointer hover:bg-muted/50 text-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        scrollToComment(comment.parentId!);
                                                    }}
                                                >
                                                    <p className="font-semibold text-muted-foreground mb-0.5 truncate">
                                                        {parentComment.authorName}
                                                    </p>
                                                    <p className="line-clamp-1 text-muted-foreground">
                                                        {parentComment.text || parentComment.fileName || '— Attachment sent.'}
                                                    </p>
                                                </div>
                                            )}

                                            {editingCommentId === comment.id ? (
                                                <div>
                                                    <Textarea
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        className="mb-2"
                                                        disabled={isLoading}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => setEditingCommentId(null)} disabled={isLoading}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="break-words whitespace-pre-wrap overflow-wrap-anywhere">{comment.text}</p>
                                                    {comment.fileURL && (
                                                        comment.fileName &&
                                                        renderFileAttachment(comment.fileURL, comment.fileName, comment.fileName)
                                                    )}
                                                </>
                                            )}


                                        </div>
                                    </div>
                                );
                            })
                        )}

                        <div ref={commentsEndRef} />

                    </div>
                </div>



                {/* Input area */}
                <div className="p-4 border-t bg-muted/30 flex flex-col">
                    {isCommentsDisabled ? (
                        <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-md border border-dashed">
                            <p className="text-sm font-medium">Comments are disabled</p>
                            <p className="text-xs mt-1">
                                {submission?.challenge?.status === 'stopped'
                                    && "This challenge has ended or is stopped."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {replyingTo && (
                                <div className="p-2 mb-2 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/50 rounded-md flex justify-between items-center">
                                    <div className='truncate pr-2'>
                                        <p className="font-semibold text-green-700 dark:text-green-300 text-sm">Replying to {replyingTo.authorName}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyingTo.text || replyingTo.fileName || 'Attachment.'}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCancelReply}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <Textarea
                                id={textareaId}
                                placeholder="Write your comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={3}
                                disabled={isLoading}
                            />
                            {attachedFile && (
                                <div className="mt-2 flex items-center gap-2 p-2 rounded-md border bg-muted text-sm">
                                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium truncate">{attachedFile.name}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">({(attachedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 shrink-0" onClick={() => setAttachedFile(null)} disabled={isLoading}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex justify-between mt-2">
                                <Button size="sm" className='flex items-center gap-2' onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                    <Paperclip className="h-5 w-5" />
                                    <span>Attachment</span>
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setAttachedFile(file);
                                    }}
                                />
                                <Button onClick={handleAddComment} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Post Comment
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog >
    );
}