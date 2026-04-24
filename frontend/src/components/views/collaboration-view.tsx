import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';
import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Info, Edit, X, Save, Trash2, FileText, MoreVertical, Upload } from 'lucide-react';
import { MarkdownViewer } from '../ui/markdownViewer';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '../ui/select';
import SectorSearchWithDropdown from '../ui/SectorSearchWithDropdown';
import ChallengeMarkdownEditor from '../ui/ChallengeMarkdown';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/providers/AuthContext';

export interface SectorData {
    id: number | string
    name: string
    children: string[]
}

interface CollaborationViewProps {
    collaborationId: number;
    onClose: () => void;
    initialEditMode?: boolean;
}

interface GetUsersCollaborationSchema {
    id: number;
    title: string;
    description: string;
    reward_amount: number;
    reward_min: number;
    reward_max: number;
    challenge_type: 'corporate' | 'msme' | 'government';
    start_date: Date | undefined;
    end_date: Date | undefined;
    sector: string;
    technology_area: string;
    status: string;
    contact_name: string;
    contact_role: string;
    created_at: string;
    user_id: number;
    attachments: [];
}


const editCollaborationSchema = z.object({
    title: z.string().min(3, { message: "Title is required." }),
    description: z.string().min(10, { message: "Description is required." }),
    technologyArea: z
        .object({
            sector: z.string().min(1, "Sector is required"),
            techArea: z.string().min(1, "Technology area is required"),
        })
        .refine(
            (val) => val.sector && val.techArea,
            { message: "Please select a technology area", path: ["techArea"] }
        ),
    challenge_type: z.enum(['corporate', 'msme', 'government'], {
        errorMap: () => ({ message: "Please select a challenge type." }),
    }),
    contact_name: z.string().min(2, { message: "Contact name is required." }),
    contact_role: z.string().min(2, { message: "Contact role is required." }),
});

type EditCollaborationFormValues = z.infer<typeof editCollaborationSchema>;

const CollaborationView = ({ collaborationId, onClose, initialEditMode = false }: CollaborationViewProps) => {
    const [collabDetails, setCollabDetails] = useState<GetUsersCollaborationSchema | null>(null);

    const [isFetching, setIsFetching] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(true);
    const [isEditMode, setIsEditMode] = useState(initialEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sectors, setSectors] = useState<SectorData[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isFetchingAnnouncements, setIsFetchingAnnouncements] = useState(false);
    const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
    const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [editingAnnouncementData, setEditingAnnouncementData] = useState<any>(null);
    const [announcementForm, setAnnouncementForm] = useState({
        title: "",
        message: "",
        type: "general",
    });
    const [announcementAttachments, setAnnouncementAttachments] = useState<File[]>([]);
    const { userRole } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");

    const editForm = useForm<EditCollaborationFormValues>({
        resolver: zodResolver(editCollaborationSchema),
        defaultValues: {
            title: '',
            description: '',
            technologyArea: {
                sector: '',
                techArea: ''
            },
            challenge_type: 'corporate',
            contact_name: '',
            contact_role: '',
        },
    });

    const handleCloseDialog = useCallback(() => {
        setIsDialogOpen(false);
        onClose();
    }, [onClose]);

    const fetchSectors = async () => {
        const res = await fetch(`${API_BASE_URL}/api/sectors`);
        const data = await res.json();
        setSectors(data);
    };

    const fetchCollabDetails = useCallback(async () => {
        setIsFetching(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/get-users-collaboration?id=${collaborationId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const collaboration = data.collaborations[0];

                setCollabDetails(collaboration);

                editForm.reset({
                    title: collaboration.title,
                    description: collaboration.description,
                    technologyArea: {
                        sector: collaboration.sector || '',
                        techArea: collaboration.technology_area || ''
                    },
                    challenge_type: collaboration.challenge_type,
                    contact_name: collaboration.contact_name,
                    contact_role: collaboration.contact_role,
                });
            } else {
                toast({
                    title: 'Failed to load Collaboration',
                    description: 'Unknown error occurred',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong while loading collaboration details.',
                variant: 'destructive',
            });
        } finally {
            setIsFetching(false);
        }
    }, [collaborationId, editForm]);

    const fetchAnnouncements = useCallback(async () => {
        setIsFetchingAnnouncements(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/announcements/${collaborationId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements);
            }
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setIsFetchingAnnouncements(false);
        }
    }, [collaborationId]);

    useEffect(() => {
        fetchCollabDetails();
        fetchSectors();
        fetchAnnouncements();
    }, [collaborationId, fetchCollabDetails, fetchAnnouncements]);


    const safeParse = (jsonString: string | any[]) => {
        if (Array.isArray(jsonString)) return jsonString;
        if (!jsonString) return [];
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return [];
        }
    };

    const attachments = safeParse(collabDetails?.attachments || "[]");

    const onEditSubmit = async (data: EditCollaborationFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/collaborations/${collaborationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    sector: data.technologyArea?.sector,
                    technologyArea: data.technologyArea?.techArea,
                    challenge_type: data.challenge_type,
                    contact_name: data.contact_name,
                    contact_role: data.contact_role,
                }),
            });

            if (response.ok) {
                toast({
                    title: 'Collaboration Updated',
                    description: 'Your collaboration details have been updated successfully.',
                });
                setIsEditMode(false);
                await fetchCollabDetails();
            } else {
                const errorData = await response.json();
                toast({
                    variant: 'destructive',
                    title: 'Failed to update collaboration',
                    description: errorData.error || 'An unknown error occurred.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Network Error',
                description: 'Could not update collaboration. Please try again later.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/collaborations/${collaborationId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                toast({
                    title: 'Collaboration Deleted',
                    description: 'The collaboration has been successfully deleted.',
                });
                setIsDeleteDialogOpen(false);
                onClose();
                window.location.reload(); // Refresh to show updated list
            } else {
                const errorData = await response.json();
                toast({
                    title: 'Error',
                    description: errorData.error || 'Failed to delete collaboration',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An error occurred while deleting the collaboration',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (res.ok) {
                toast({
                    title: "Announcement Deleted",
                    description: "The announcement has been removed.",
                });
                fetchAnnouncements();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete announcement.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting announcement", error);
        }
    };

    const handleSubmitAnnouncement = async () => {
        if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
            toast({
                title: "Validation Error",
                description: "Title and message are required.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmittingAnnouncement(true);

        try {
            const formData = new FormData();
            formData.append("title", announcementForm.title);
            formData.append("message", announcementForm.message);
            formData.append("type", announcementForm.type);

            announcementAttachments.forEach((file) => {
                formData.append("attachments", file);
            });

            // Determine if we're editing or creating
            const isEditing = isEditingAnnouncement && editingAnnouncementData;
            const url = isEditing
                ? `${API_BASE_URL}/api/announcements/${editingAnnouncementData.id}`
                : `${API_BASE_URL}/api/announcements/${collaborationId}`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            if (res.ok) {
                toast({
                    title: isEditing ? "Announcement Updated" : "Announcement Created",
                    description: isEditing ? "Your announcement has been updated." : "Your announcement is now live.",
                });

                // Reset form and states
                setAnnouncementForm({
                    title: "",
                    message: "",
                    type: "general",
                });
                setAnnouncementAttachments([]);
                setIsCreatingAnnouncement(false);
                setIsEditingAnnouncement(false);
                setEditingAnnouncementData(null);

                // Refresh announcements
                await fetchAnnouncements();
            } else {
                toast({
                    title: "Failed",
                    description: isEditing ? "Unable to update announcement." : "Unable to create announcement.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Server error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingAnnouncement(false);
        }
    };

    const handleEditAnnouncement = (announcement: any) => {
        setEditingAnnouncementData(announcement);
        setAnnouncementForm({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type || "general",
        });
        // Note: Can't pre-populate file attachments from URLs
        setAnnouncementAttachments([]);
        setIsEditingAnnouncement(true);
        setIsCreatingAnnouncement(true); // Reuse the same form UI
    };

    function formatPrettyDate(date: Date) {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        const suffix =
            day % 10 === 1 && day !== 11 ? "st" :
                day % 10 === 2 && day !== 12 ? "nd" :
                    day % 10 === 3 && day !== 13 ? "rd" : "th";

        return `${month} ${day}${suffix} ${year}`;
    }

    return (
        <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
                if (!open) {
                    handleCloseDialog();
                }
                setIsDialogOpen(open);
            }}
        >
            <DialogContent
                className={`
        flex flex-col border bg-background transition-all duration-500 p-0 
        w-[90vw] max-w-[90vw] shadow-lg text-base h-[90vh] fixed
        rounded-lg top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        `}
            >
                <div className="flex justify-between items-center p-4 pr-14 rounded-t-lg border-b bg-muted/50 dark:bg-muted/20 flex-shrink-0">
                    <DialogTitle className="text-xl font-bold">
                        {collabDetails?.title}
                    </DialogTitle>

                </div>
                {activeTab === "overview" && <div className='flex justify-end gap-2'>
                    {!isEditMode && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    )}
                    <Button
                        variant={isEditMode ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => {
                            if (isEditMode) {
                                setIsEditMode(false);
                                editForm.reset({
                                    title: collabDetails?.title,
                                    description: collabDetails?.description,
                                    technologyArea: {
                                        sector: collabDetails?.sector || '',
                                        techArea: collabDetails?.technology_area || ''
                                    },
                                    challenge_type: collabDetails?.challenge_type,
                                    contact_name: collabDetails?.contact_name,
                                    contact_role: collabDetails?.contact_role,
                                });
                            } else {
                                setIsEditMode(true);
                            }
                        }}
                        className="mr-8"
                    >
                        {isEditMode ? (
                            <>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </>
                        )}
                    </Button>
                </div>}

                {collabDetails?.status !== 'stopped' && !isCreatingAnnouncement && activeTab === 'announcements' && (
                    <div className="flex justify-end mr-2 gap-2">
                        <Button onClick={() => setIsCreatingAnnouncement(true)}>
                            + New Announcement
                        </Button>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto px-4 pb-4 space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className={`grid w-full grid-cols-2`}>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="announcements">Announcements</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview">
                            {!isEditMode ? (
                                <>
                                    {collabDetails && (
                                        <Card className="mb-0 border-primary/50 bg-primary-foreground/20">
                                            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-lg font-extrabold text-primary flex items-center">
                                                    <Info className="h-5 w-5 mr-2" />
                                                    {collabDetails.title}
                                                </CardTitle>
                                                <CardDescription className="text-sm text-muted-foreground">
                                                    Submitted by {collabDetails.contact_name} — {collabDetails.contact_role}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="p-4 pt-0 text-sm">
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <p><span className="font-semibold">Sector:</span> {collabDetails.sector}</p>
                                                    <p><span className="font-semibold">Technology Area:</span> {collabDetails.technology_area}</p>
                                                    <p><span className="font-semibold">Challenge Type:</span> {collabDetails.challenge_type}</p>
                                                    <p>
                                                        <span className="font-semibold">Reward:</span>{" "}
                                                        {collabDetails.reward_amount
                                                            ? `₹${collabDetails.reward_amount}`
                                                            : `₹${collabDetails.reward_min} - ₹${collabDetails.reward_max}`}
                                                    </p>
                                                    <p><span className="font-semibold">Start Date:</span> {collabDetails.start_date ? new Date(collabDetails.start_date).toLocaleDateString() : 'N/A'}</p>
                                                    <p><span className="font-semibold">End Date:</span> {collabDetails.end_date ? new Date(collabDetails.end_date).toLocaleDateString() : 'N/A'}</p>
                                                </div>

                                                <h1 className="text-lg mb-2">Description:</h1>
                                                <MarkdownViewer content={collabDetails.description} />
                                                {attachments && attachments.length > 0 && (
                                                    <div className="mt-6">
                                                        <h2 className="text-lg font-semibold mb-2">Attachments</h2>
                                                        <div className="space-y-2">
                                                            {attachments.map((fileUrl: string, index: number) => {
                                                                const fileName = fileUrl.split('/').pop();
                                                                return (
                                                                    <div key={index} className="bg-accent/50 hover:bg-accent p-2 rounded-md">
                                                                        <a
                                                                            href={fileUrl}
                                                                            download
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 text-primary hover:text-primary/80"
                                                                        >
                                                                            <FileText className="h-4 w-4" />
                                                                            {fileName}
                                                                        </a>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-sm mt-3 text-muted-foreground">
                                                    Created on {new Date(collabDetails.created_at).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })} {new Date(collabDetails.created_at).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    }).toLowerCase()}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            ) : (
                                // Edit Mode
                                <Card className="mb-0 border-primary/50 bg-primary-foreground/20">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-lg font-extrabold text-primary flex items-center">
                                            <Edit className="h-5 w-5 mr-2" />
                                            Edit Challenge
                                        </CardTitle>
                                        <CardDescription>
                                            Update the Challenge details below
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <Form {...editForm}>
                                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                                <FormField
                                                    control={editForm.control}
                                                    name="title"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Collaboration title" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={editForm.control}
                                                    name="technologyArea"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sector & Technology Area <span className="text-red-500">*</span></FormLabel>
                                                            <FormControl>
                                                                <SectorSearchWithDropdown
                                                                    data={sectors}
                                                                    defaultValue={field.value}
                                                                    onSelect={(item: any) => field.onChange({ "sector": item.sector, "techArea": item.label })}
                                                                    onDataAdded={fetchSectors}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={editForm.control}
                                                    name="challenge_type"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-3">
                                                            <FormLabel>Challenge Type <span className="text-red-500">*</span></FormLabel>
                                                            <FormControl>
                                                                <RadioGroup
                                                                    onValueChange={field.onChange}
                                                                    defaultValue={field.value}
                                                                    value={field.value}
                                                                    className="flex gap-5"
                                                                >
                                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <RadioGroupItem value="corporate" />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal">Corporate Challenges</FormLabel>
                                                                    </FormItem>
                                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <RadioGroupItem value="msme" />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal">MSME Challenges</FormLabel>
                                                                    </FormItem>
                                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <RadioGroupItem value="government" />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal">Government Challenges</FormLabel>
                                                                    </FormItem>
                                                                </RadioGroup>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />


                                                <FormField
                                                    control={editForm.control}
                                                    name="description"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                Description <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <ChallengeMarkdownEditor
                                                                ttForm={editForm}
                                                                defaultDescription={field.value}
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={editForm.control}
                                                        name="contact_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Contact Name <span className="text-red-500">*</span></FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Contact person name" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={editForm.control}
                                                        name="contact_role"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Contact Role <span className="text-red-500">*</span></FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="e.g., Project Manager" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="flex justify-end gap-2 pt-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setIsEditMode(false);
                                                            editForm.reset();
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit" disabled={isSubmitting}>
                                                        {isSubmitting ? (
                                                            <>
                                                                <Save className="h-4 w-4 mr-2 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="h-4 w-4 mr-2" />
                                                                Save Changes
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                        <TabsContent value="announcements">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold mt-3 ml-2">Announcements</h2>

                                </div>

                                {/* Inline Announcement Creation Form */}
                                {isCreatingAnnouncement && (
                                    <Card className="border-primary/50 bg-primary-foreground/20">
                                        <CardHeader className="p-4">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-lg font-bold">
                                                    {isEditingAnnouncement ? "Edit Announcement" : "Create Announcement"}
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsCreatingAnnouncement(false);
                                                        setIsEditingAnnouncement(false);
                                                        setEditingAnnouncementData(null);
                                                        setAnnouncementForm({ title: "", message: "", type: "general" });
                                                        setAnnouncementAttachments([]);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">
                                                    Title <span className="text-red-500">*</span>
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Enter announcement title..."
                                                        className="w-full pr-16"
                                                        value={announcementForm.title}
                                                        maxLength={300}
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
                                                <Label className="text-sm font-medium">
                                                    Message <span className="text-red-500">*</span>
                                                </Label>
                                                <div className="relative">
                                                    <Textarea
                                                        placeholder="Write the announcement message..."
                                                        className="w-full h-28 pb-6"
                                                        value={announcementForm.message}
                                                        maxLength={300}
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
                                                    onValueChange={(value) =>
                                                        setAnnouncementForm((f) => ({ ...f, type: value }))
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
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
                                                <div
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (announcementAttachments.length >= 1) return;
                                                        const newFiles = Array.from(e.dataTransfer.files);
                                                        if (announcementAttachments.length + newFiles.length > 1) {
                                                            toast({
                                                                title: "Limit Exceeded",
                                                                description: "You can upload a maximum of 1 attachment.",
                                                                variant: "destructive",
                                                            });
                                                            return;
                                                        }
                                                        setAnnouncementAttachments((prev) => [...prev, ...newFiles]);
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer flex flex-col items-center justify-center ${announcementAttachments.length >= 1
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : "border-muted/50 bg-muted/30 hover:border-muted/70 hover:bg-muted/50"
                                                        }`}
                                                >
                                                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                                    <Input
                                                        type="file"
                                                        className="hidden"
                                                        id="announcementFileUpload"
                                                        disabled={announcementAttachments.length >= 1}
                                                        onChange={(e) => {
                                                            const newFiles = Array.from(e.target.files || []);
                                                            if (announcementAttachments.length + newFiles.length > 1) {
                                                                toast({
                                                                    title: "Limit Exceeded",
                                                                    description: "Only 1 attachment is allowed.",
                                                                    variant: "destructive",
                                                                });
                                                                return;
                                                            }
                                                            setAnnouncementAttachments((prev) => [...prev, ...newFiles]);
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="announcementFileUpload"
                                                        className="cursor-pointer text-sm text-muted-foreground"
                                                    >
                                                        Drag files here or <span className="underline">browse</span>
                                                    </Label>
                                                </div>

                                                {announcementAttachments.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        {announcementAttachments.map((file, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between border rounded-md p-2 bg-background"
                                                            >
                                                                <span className="text-sm">{file.name}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-xs"
                                                                    onClick={() =>
                                                                        setAnnouncementAttachments((prev) =>
                                                                            prev.filter((_, i) => i !== index)
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {announcementAttachments.length}/1 files uploaded
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsCreatingAnnouncement(false);
                                                        setIsEditingAnnouncement(false);
                                                        setEditingAnnouncementData(null);
                                                        setAnnouncementForm({ title: "", message: "", type: "general" });
                                                        setAnnouncementAttachments([]);
                                                    }}
                                                    className="flex-1"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleSubmitAnnouncement}
                                                    disabled={isSubmittingAnnouncement}
                                                    className="flex-1"
                                                >
                                                    {isSubmittingAnnouncement
                                                        ? (isEditingAnnouncement ? "Updating..." : "Submitting...")
                                                        : (isEditingAnnouncement ? "Update Announcement" : "Submit Announcement")}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Loading Skeleton */}
                                {(isFetchingAnnouncements || isSubmittingAnnouncement) && !isCreatingAnnouncement && (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i}>
                                                <CardHeader className="pb-2">
                                                    <Skeleton className="h-5 w-3/4" />
                                                    <Skeleton className="h-4 w-1/4 mt-2" />
                                                </CardHeader>
                                                <CardContent>
                                                    <Skeleton className="h-16 w-full" />
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Announcement List */}
                                {!isFetchingAnnouncements && !isSubmittingAnnouncement && !isCreatingAnnouncement && (
                                    <>
                                        {announcements.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">
                                                No announcements yet.
                                            </p>
                                        ) : (
                                            announcements.map((announcement) => (
                                                <Card key={announcement.id} className="relative">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <CardTitle className="text-base font-bold">
                                                                    {announcement.title}
                                                                </CardTitle>
                                                                <CardDescription>
                                                                    {formatPrettyDate(new Date(announcement.createdAt))}
                                                                </CardDescription>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {announcement.createdBy && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs px-3 py-1 rounded-full"
                                                                    >
                                                                        {announcement.createdBy}
                                                                    </Badge>
                                                                )}

                                                                {(userRole === "organisation" && announcement.createdBy !== "Admin") && (
                                                                    <AlertDialog>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                                    <MoreVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem
                                                                                    onClick={() => handleEditAnnouncement(announcement)}
                                                                                >
                                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                                    Edit
                                                                                </DropdownMenuItem>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <DropdownMenuItem className="text-red-600">
                                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                                        Delete
                                                                                    </DropdownMenuItem>
                                                                                </AlertDialogTrigger>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This action cannot be undone. This will permanently remove the announcement.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>

                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    className="bg-red-600 hover:bg-red-700"
                                                                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                                                >
                                                                                    Confirm
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm whitespace-pre-wrap">{announcement.message}</p>
                                                        {safeParse(announcement.attachments).length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {safeParse(announcement.attachments).map((url: string, idx: number) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs bg-muted px-2 py-1 rounded-md hover:bg-muted/80 flex items-center gap-1"
                                                                    >
                                                                        <FileText className="h-3 w-3" />
                                                                        Attachment {idx + 1}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            collaboration and remove your data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </Dialog >
    );
};

export default CollaborationView;
