import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: string;
    attachments: string[];
    createdBy: string;
    createdAt: string;
}

interface AnnouncementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collaborationId: string;
    editingAnnouncement?: Announcement | null;
    onAnnouncementCreated?: () => void;
}

export function AnnouncementDialog({
    open,
    onOpenChange,
    collaborationId,
    editingAnnouncement,
    onAnnouncementCreated,
}: AnnouncementDialogProps) {
    const isEditMode = !!editingAnnouncement;
    const hasExistingAttachments = editingAnnouncement?.attachments && editingAnnouncement.attachments.length > 0;

    const [announcementForm, setAnnouncementForm] = useState({
        title: editingAnnouncement?.title || "",
        message: editingAnnouncement?.message || "",
        type: editingAnnouncement?.type || "general",
    });

    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const MAX_ATTACHMENTS = 1;

    // Update form when editingAnnouncement changes
    useEffect(() => {
        if (editingAnnouncement) {
            setAnnouncementForm({
                title: editingAnnouncement.title,
                message: editingAnnouncement.message,
                type: editingAnnouncement.type,
            });
        } else {
            setAnnouncementForm({
                title: "",
                message: "",
                type: "general",
            });
        }
    }, [editingAnnouncement]);
    const onDrop = (event: React.DragEvent) => {
        event.preventDefault();
        const newFiles = Array.from(event.dataTransfer.files);

        if (attachments.length + newFiles.length > MAX_ATTACHMENTS) {
            toast({
                title: "Limit Exceeded",
                description: `You can upload a maximum of ${MAX_ATTACHMENTS} attachments.`,
                variant: "destructive",
            });
            return;
        }

        setAttachments((prev) => [...prev, ...newFiles]);
    };

    const onDragOver = (event: React.DragEvent) => event.preventDefault();

    const onSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(event.target.files || []);

        if (attachments.length + newFiles.length > MAX_ATTACHMENTS) {
            toast({
                title: "Limit Exceeded",
                description: `Only ${MAX_ATTACHMENTS} attachments are allowed.`,
                variant: "destructive",
            });
            return;
        }

        setAttachments((prev) => [...prev, ...newFiles]);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("title", announcementForm.title);
            formData.append("message", announcementForm.message);
            formData.append("type", announcementForm.type);

            // Only append attachments if not in edit mode or if editing without existing attachments
            if (!isEditMode || !hasExistingAttachments) {
                attachments.forEach((file) => {
                    formData.append("attachments", file);
                });
            }

            const url = isEditMode
                ? `${API_BASE_URL}/api/announcements/${editingAnnouncement.id}`
                : `${API_BASE_URL}/api/announcements/${collaborationId}`;

            const method = isEditMode ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            if (res.ok) {
                toast({
                    title: isEditMode ? "Announcement Updated" : "Announcement Created",
                    description: isEditMode ? "Your announcement has been updated." : "Your announcement is now live.",
                });

                setAnnouncementForm({
                    title: "",
                    message: "",
                    type: "general",
                });
                setAttachments([]);
                onAnnouncementCreated?.();
                onOpenChange(false);
            } else {
                toast({
                    title: "Failed",
                    description: isEditMode ? "Unable to update announcement." : "Unable to create announcement.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Server error occurred.",
                variant: "destructive",
            });
        }

        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={(open) => {
            onOpenChange(open);
            if (!open) {
                // Reset form when closing
                setAnnouncementForm({
                    title: "",
                    message: "",
                    type: "general",
                });
                setAttachments([]);
            }
        }}>
            <DialogContent className=" space-y-4 p-6">
                <DialogTitle>{isEditMode ? "Edit Announcement" : "Create Announcement"}</DialogTitle>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Enter announcement title..."
                            className="w-full border rounded-md p-2 pr-16"
                            value={announcementForm.title}
                            maxLength={300}
                            disabled={isSubmitting}
                            onChange={(e) =>
                                setAnnouncementForm((f) => ({ ...f, title: e.target.value }))
                            }
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {announcementForm.title.length}/300
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Message <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Textarea
                            placeholder="Write the announcement message..."
                            className="w-full border rounded-md p-2 h-28 pb-6"
                            value={announcementForm.message}
                            maxLength={300}
                            disabled={isSubmitting}
                            onChange={(e) =>
                                setAnnouncementForm((f) => ({ ...f, message: e.target.value }))
                            }
                        />
                        <span className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                            {announcementForm.message.length}/300
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Type</Label>

                    <Select
                        value={announcementForm.type}
                        disabled={isSubmitting}
                        onValueChange={(value) =>
                            setAnnouncementForm((f) => ({ ...f, type: value }))
                        }
                    >
                        <SelectTrigger className="w-full border rounded-md p-2">
                            <SelectValue placeholder="Select announcement type" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="alert">Alert</SelectItem>
                                <SelectItem value="deadline">Deadline</SelectItem>
                                <SelectItem value="result">Result</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Attachment (Drag & Drop)</Label>

                    {hasExistingAttachments ? (
                        <div className="border-2 border-dashed rounded-md p-6 text-center bg-muted/30 opacity-60">
                            <p className="text-sm text-muted-foreground">
                                Attachments cannot be modified after submission
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                {editingAnnouncement.attachments.length} existing attachment(s)
                            </p>
                        </div>
                    ) : (
                        <>
                            <div
                                onDrop={attachments.length < MAX_ATTACHMENTS && !isSubmitting ? onDrop : undefined}
                                onDragOver={attachments.length < MAX_ATTACHMENTS && !isSubmitting ? onDragOver : undefined}
                                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer flex flex-col items-center justify-center
    ${attachments.length >= MAX_ATTACHMENTS || isSubmitting ? "opacity-50 cursor-not-allowed" : "border-muted/50 bg-muted/30 hover:border-muted/70 hover:bg-muted/50"}
  `}
                            >
                                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                <Input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="fileUpload"
                                    disabled={attachments.length >= MAX_ATTACHMENTS || isSubmitting}
                                    onChange={onSelectFiles}
                                />

                                <Label htmlFor="fileUpload" className="cursor-pointer text-sm text-muted-foreground">
                                    Drag files here or <span className="underline">browse</span>
                                </Label>
                            </div>

                            {attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between border rounded-md p-2 bg-white"
                                        >
                                            <span className="text-sm">{file.name}</span>
                                            <Button
                                                className=" text-xs"
                                                disabled={isSubmitting}
                                                onClick={() =>
                                                    setAttachments((prev) => prev.filter((_, i) => i !== index))
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {attachments.length}/{MAX_ATTACHMENTS} files uploaded
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-primary text-white px-4 py-2 rounded-md w-full"
                >
                    {isSubmitting ? (isEditMode ? "Updating..." : "Submitting...") : (isEditMode ? "Update Announcement" : "Submit Announcement")}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
