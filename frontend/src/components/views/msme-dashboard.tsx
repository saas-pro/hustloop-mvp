
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LayoutDashboard, FileText, User, Settings, CheckCircle, Clock, Copy, XCircle, Trash2, PlusCircle, Loader2, Upload, CalendarIcon, Target, Handshake, Lock, ChevronDown, Save, Pencil, MoreVertical, UploadCloud } from "lucide-react";
import type { MsmeDashboardTab, Submission, Comment, View } from "@/app/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { EmailUpdateForm } from '@/components/ui/EmailUpdateForm';
import SubmissionDetailsModal from "./submission-details-modal";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { API_BASE_URL } from "@/lib/api";
import PasswordChangeForm from './password-change-form';
import Script from "next/script";
import { format, addDays } from "date-fns";
import SectorSearchWithDropdown from "../ui/SectorSearchWithDropdown";
import Image from "next/image";
import { Label } from "../ui/label";
import ChallengeMarkdownEditor from "../ui/ChallengeMarkdown";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import CollaborationView from "./collaboration-view";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ContributionGraph } from "../ui/contribution-graph";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { Badge } from "../ui/badge";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";
import { LoadingButton } from "../ui/loading-button";
import { VanityUrlInput } from "../ui/vanity-url-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { io, Socket } from 'socket.io-client';
import { useAuth } from "@/providers/AuthContext";



const DEFAULT_COLLABORATION_DESCRIPTION = `[Give a brief overview of the context and purpose of this challenge. What inspired it? Why does it matter?]
## Objective  
[What do you aim to achieve with this challenge? Clearly state the expected outcome or impact.]

## Problem Statement  

### Background  
[Describe the core problem this challenge seeks to solve. Why does it exist? Who is impacted? Include background details, context, and motivations.]

### What We Are Looking For  
[Explain the type of solution you want participants to propose or build.]

### Scope of Requirements  
[Outline any requirements, functionalities, or constraints for the solution.]

- Requirement 1  
- Requirement 2  
- Requirement 3  
`;

type User = {
    name: string;
    email: string;
    userId: string;
}
type AuthProvider = 'local' | 'google';

export interface SectorData {
    id: number | string
    name: string
    children: string[]
}

const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[789]\d{9}$/;

const profileFormSchema = z.object({
    name: z.string().min(1, "Company name is required"),
    sector: z.string().min(1, "Sector is required"),
    affiliated_by: z.string().optional().or(z.literal('')),
    short_description: z.string().min(1, "A short description is required"),
    website_url: z.string().regex(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, "Please enter a valid URL.").optional().or(z.literal('')),
    phone_number: z.string()
        .min(10, { message: "Phone number must be at least 10 digits" })
        .regex(phoneRegex, {
            message: "Please enter a valid Indian phone number (e.g., 9876543210 or +91 9876543210)"
        }),
    x_url: z.string().optional().or(z.literal('')),
    instagram_username: z.string().optional().or(z.literal('')),
    linkedin_url: z.string().optional().or(z.literal('')),
    logo: z.any().optional()
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const collaborationSchema = z.object({
    title: z.string().min(3, { message: "Title is required." }),
    description: z
        .string()
        .min(10, { message: "Description is required." })
        .max(5000, {
            message: "Description must not exceed 5000 characters.",
        }),

    rewardType: z.enum(["fixed", "range"], {
        errorMap: () => ({ message: "Reward type is required." }),
    }),

    rewardAmount: z.number().optional(),
    rewardMin: z.number().optional(),
    rewardMax: z.number().optional(),

    contact: z.object({
        name: z.string().min(2, { message: "Contact name is required." }),
        role: z.string().min(2, { message: "Contact role is required." }),
    }),

    challengeType: z.enum(["corporate", "msme", "government"], {
        errorMap: () => ({ message: "Please select a challenge type." }),
    }),

    technologyArea: z
        .object({
            sector: z.string().min(1, "Sector is required"),
            techArea: z.string().min(1, "Technology area is required"),
        })
        .refine(
            (val) => val.sector && val.techArea,
            { message: "Please select a technology area", path: ["techArea"] }
        ),

    startDate: z.date({
        required_error: "A start date is required.",
    }),
    endDate: z.date({
        required_error: "An end date is required.",
    }),
    attachments: z.array(z.any()).max(5, "Max 5 files allowed").optional(),
})
    .refine((data) => data.endDate > data.startDate, {
        message: "End date must be after the start date.",
        path: ["endDate"],
    })
    .superRefine((data, ctx) => {
        if (data.rewardType === "fixed") {
            if (data.rewardAmount === undefined || isNaN(data.rewardAmount)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Please enter a valid reward amount.",
                    path: ["rewardAmount"],
                });
            } else if (data.rewardAmount <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "Reward amount must be greater than 0.",
                    path: ["rewardAmount"],
                });
            }
        } else if (data.rewardType === "range") {
            if (data.rewardMin === undefined || isNaN(data.rewardMin)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Please enter a valid minimum reward.",
                    path: ["rewardMin"],
                });
            } else if (data.rewardMin <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "Minimum reward must be greater than 0.",
                    path: ["rewardMin"],
                });
            }
            if (data.rewardMax === undefined || isNaN(data.rewardMax)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Please enter a valid maximum reward.",
                    path: ["rewardMax"],
                });
            } else if (data.rewardMax <= 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "Maximum reward must be greater than 0.",
                    path: ["rewardMax"],
                });
            }
            if (
                data.rewardMin !== undefined &&
                data.rewardMax !== undefined &&
                data.rewardMin > data.rewardMax
            ) {
                ctx.addIssue({
                    code: "custom",
                    message: "Maximum reward should be greater than or equal to minimum reward.",
                    path: ["rewardMax"],
                });
            }
        }
    });

type collaborationFormValues = z.infer<typeof collaborationSchema>;

const settingsFormSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(35, "Name must not exceed 35 characters"),
    email: z.string().email("Invalid email address"),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

type UsersCollaborationData = z.infer<typeof collaborationSchema>

const initialSubmissionsData: Submission[] = [];

const rewardOptions = [
    { value: "fixed", label: "Fixed" },
    { value: "range", label: "Range" },
];
interface getUsersCollaborationSchema {
    id: number;
    title: string;
    description: string;

    reward_amount?: number;
    reward_min?: number;
    reward_max?: number;

    challenge_type: "corporate" | "msme" | "government";
    start_date: Date | undefined;
    end_date: Date | undefined;

    sector: string;
    technology_area: string;

    contact_name: string;
    contact_role: string;

    created_at: string;
    user_id: number;
}



const statusBadgeClasses: Record<SolutionStatus, string> = {
    new: "border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-400 dark:text-blue-300",
    under_review: "border-yellow-500 text-yellow-700 bg-yellow-50 dark:border-yellow-400 dark:text-yellow-300",
    duplicate: "border-purple-500 text-purple-700 bg-purple-50 dark:border-purple-400 dark:text-purple-300",
    rejected: "border-red-500 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-300",
    solution_accepted_points: "border-green-600 text-green-800 bg-green-100 dark:border-green-500 dark:text-green-400",
    triaged: "border-orange-500 text-orange-700 bg-orange-50 dark:border-orange-400 dark:text-orange-300",
    need_info: "border-blue-600 text-blue-800 bg-blue-100 dark:border-blue-500 dark:text-blue-400",
    winner: "border-green-600 text-green-800 bg-green-100 dark:border-green-500 dark:text-green-400",
};

const emptyProfile: ProfileFormValues = {
    name: "",
    sector: "",
    short_description: "",
    affiliated_by: "",
    website_url: "",
    phone_number: "",
    x_url: "",
    instagram_username: "",
    linkedin_url: "",
};

export enum SolutionStatus {
    new = "new",
    under_review = "under_review",
    duplicate = "duplicate",
    rejected = "rejected",
    solution_accepted_points = "solution_accepted_points",
    triaged = "triaged",
    need_info = "need_info",
    winner = "winner",
}


export const statusLabels: Record<SolutionStatus, string> = {
    new: "New",
    under_review: "Under Review",
    duplicate: "Duplicate",
    rejected: "Rejected",
    solution_accepted_points: "Solution Accepted + Points",
    triaged: "Triaged",
    need_info: "Need Info",
    winner: "Winner",
};



interface MsmeDashboardViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    isLoggedIn: boolean;
    setActiveView: (view: View) => void;
    user: User;
    authProvider: AuthProvider;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function MsmeDashboardView({ isOpen, setUser, setActiveView, onOpenChange, user, authProvider }: MsmeDashboardViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<MsmeDashboardTab>("overview");
    const [confirmText, setConfirmText] = useState("");
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissionsData);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [graphData, setGraphData] = useState<any[]>([]);
    const [dailySubmissions, setDailySubmissions] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [graphType, setGraphType] = useState<'accepted_points' | 'winners'>('accepted_points');
    const [summaryStats, setSummaryStats] = useState<{ total_accepted_points: number, total_winners: number, total_collaborations: number }>({ total_accepted_points: 0, total_winners: 0, total_collaborations: 0 });
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [selectedCollabId, setSelectedCollabId] = useState<number | null>(null);
    const [isCollabEditMode, setIsCollabEditMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isMsmerole, setisMsmeRole] = useState(false)
    const { userRole } = useAuth();
    const isMsmeRole = userRole;
    const [isAdmin, setIsAdmin] = useState(false);
    const [statusUpdates, setStatusUpdates] = useState<Record<string, SolutionStatus>>({});
    const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
    const MAX_FILES = 5;
    const [getUsersCollaborationData, setGetUserCollaborationData] = useState<getUsersCollaborationSchema[]>([]);

    const [isEditingCollaboration, setIsEditingCollaboration] = useState(false);
    const [currentEditingCollaborationId, setCurrentEditingCollaborationId] = useState<number | null>(null);
    const [selectedCollaborationToEdit, setSelectedCollaborationToEdit] = useState<getUsersCollaborationSchema | null>(null);

    const [files, setFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState("");
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

    function timeAgoShort(date: Date) {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        const intervals = [
            { label: "y", seconds: 31536000 },
            { label: "m", seconds: 2592000 },
            { label: "w", seconds: 604800 },
            { label: "d", seconds: 86400 },
            { label: "h", seconds: 3600 },
            { label: "min", seconds: 60 }
        ];

        for (let interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count > 0) {
                return `${count}${interval.label} ago`;
            }
        }

        return "just now";
    }

    const getUsersCollaboration = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-users-collaboration`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            setGetUserCollaborationData(Array.isArray(result.collaborations) ? result.collaborations : []);
            if (result.length > 0) {
                setSubmissionsLength(result.length);
            }
        } catch (error) {
            setGetUserCollaborationData([]);
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not save settings. Please try again later.' });
        }
    }, [setGetUserCollaborationData, toast]);

    const checkProfile = useCallback(async () => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${API_BASE_URL}/api/isProfileSubmitted`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setIsProfileSubmitted(data.status === "submitted");

            if (data.profile && data.profile.is_editable !== undefined) {
                setIsEditable(data.profile.is_editable);
            }
        } catch (err) {
            console.error("Network error:", err);
        }

        await getUsersCollaboration();
    }, [getUsersCollaboration])

    useEffect(() => {
        if (isMsmeRole === "organisation") {
            setisMsmeRole(true)
        }
    }, [isMsmeRole])

    useEffect(() => {
        setIsAdmin(userRole === "admin");
    }, [userRole]);

    useEffect(() => {
        if (isMsmeRole) {
            checkProfile();
        }
    }, [isMsmeRole, checkProfile]);

    // Real-time WebSocket listener for solution status updates
    useEffect(() => {
        if (submissions.length === 0) return;

        const socket: Socket = io(`${API_BASE_URL}`, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socket.connect();

        // Join rooms for all submissions
        submissions.forEach(sub => {
            socket.emit('join_solution', { solutionId: sub.solutionId });
        });

        // Listen for status updates
        socket.on('solution_status_updated', (data: any) => {

            setSubmissions(prevSubmissions =>
                prevSubmissions.map(sub =>
                    sub.solutionId === data.solutionId
                        ? {
                            ...sub,
                            status: data.status,
                            points: data.points,
                            reward_amount: data.reward_amount,
                            updatedAt: data.updated_at
                        }
                        : sub
                )
            );

            const formatStatus = (status: string) =>
                status
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

            toast({
                title: 'Status Updated',
                description: `Solution status changed to: ${formatStatus(data.status)}`,
            });
        });

        return () => {
            submissions.forEach(sub => {
                socket.emit('leave_solution', { solutionId: sub.solutionId });
            });
            socket.off('solution_status_updated');
            socket.disconnect();
        };
    }, [submissions, toast]);

    const [isProfileSubmitted, setIsProfileSubmitted] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false)

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: emptyProfile,
    });

    const fetchProfileData = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/msme-profiles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const formData = data.profile;
                // Populate form with fetched data
                profileForm.reset({
                    name: formData.name || '',
                    sector: formData.sector || '',
                    short_description: formData.short_description || '',
                    affiliated_by: formData.affiliated_by || '',
                    website_url: formData.website_url || '',
                    phone_number: formData.phone_number || '',
                    linkedin_url: formData.linkedin_url || '',
                    x_url: formData.x_url || '',
                    instagram_username: formData.instagram_username || '',
                    logo: null
                });
                if (formData.logo_url) {
                    setLogoPreview(formData.logo_url);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }, [profileForm, setLogoPreview])

    useEffect(() => {
        if (isProfileSubmitted && activeTab === 'settings') {
            fetchProfileData();
        }
    }, [isProfileSubmitted, activeTab, fetchProfileData]);


    // Helper function to check if a field should be disabled in edit mode
    const isFieldDisabled = (fieldName: string) => {
        if (!isEditingCollaboration) return false; // Not in edit mode, all fields editable
        if (isAdmin) return false; // Admin can edit all fields

        // Fields that regular users CAN edit
        const editableFields = ['title', 'technologyArea', 'description', 'challengeType', 'contact.name', 'contact.role'];
        return !editableFields.includes(fieldName);
    };



    const collaborationForm = useForm<collaborationFormValues>({
        resolver: zodResolver(collaborationSchema),
        defaultValues: {
            title: "",
            description: DEFAULT_COLLABORATION_DESCRIPTION,
            rewardType: "fixed",
            rewardAmount: 0,
            rewardMin: undefined,
            rewardMax: undefined,


            contact: {
                name: "",
                role: ""
            },

            challengeType: "corporate",
            technologyArea: {
                sector: "",
                techArea: ""
            },

            startDate: undefined,
            endDate: undefined,
        },
    });


    const settingsForm = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            name: user.name,
            email: user.email,
        },
    });



    const MAX_CHARS = 300;


    async function onProfileSubmit(data: ProfileFormValues) {
        const token = localStorage.getItem('token');
        const profileData = {
            ...data
        };

        const formData = new FormData();
        formData.append("company_name", profileData.name);
        formData.append("sector", profileData.sector);
        formData.append("short_description", profileData.short_description || "");
        formData.append("affiliated_by", profileData.affiliated_by || "");
        formData.append("website_url", profileData.website_url || "");
        formData.append("phone_number", profileData.phone_number || "");
        const linkedinUrl = profileData.linkedin_url ? `https://linkedin.com/company/${profileData.linkedin_url}` : "";
        const xUrl = profileData.x_url ? `https://x.com/${profileData.x_url}` : "";
        const instagramUrl = profileData.instagram_username ? `https://instagram.com/${profileData.instagram_username}` : "";

        formData.append("linkedin_url", linkedinUrl);
        formData.append("x_url", xUrl);
        formData.append("instagram_url", instagramUrl);
        if (profileData.logo instanceof File) {
            formData.append("logo", profileData.logo);
        }
        try {
            setIsProfileSubmitting(true);
            const response = await fetch(`${API_BASE_URL}/api/msme-profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                toast({
                    title: isProfileSubmitted ? "Profile Updated" : "Profile Created",
                    description: isProfileSubmitted
                        ? "Your Organisation profile has been updated successfully."
                        : "Your public Organisation profile has been saved and is now visible.",
                });
                setIsProfileSubmitted(true);
                setIsEditable(false);
                setIsEditingProfile(false); // Exit edit mode
                setOpen(false);
                // Switch to settings tab after successful profile submission
                setActiveTab("settings");
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: "Failed to save profile",
                    description: errorData.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: "Could not save profile. Please try again later.",
            });
        } finally {
            setIsProfileSubmitting(false);
        }
    }



    const handleOpenDialog = async () => {
        const isValid = await profileForm.trigger();

        if (isValid) {
            setOpen(true);
        }
    };




    async function onSettingsSubmit(data: SettingsFormValues) {
        const token = localStorage.getItem('token');

        if (!token) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'Please log in again.'
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const { name } = data;

            const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            const result = await response.json();
            if (response.ok) {
                setUser(prev => prev ? { ...prev, name } : null);

                toast({
                    title: "Settings Saved",
                    description: "Your profile has been updated successfully."
                });
            } else {
                throw new Error(result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update profile'
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleStatusChange = (id: string, newStatus: SolutionStatus) => {
        setStatusUpdates((prev) => ({ ...prev, [id]: newStatus }));
        setSubmissions((prev) =>
            prev.map((item) =>
                item.solutionId === id ? { ...item, status: newStatus } : item
            )
        );
    };

    const handleUpdateStatus = async (id: string) => {
        const newStatus = statusUpdates[id];
        if (!newStatus) return;

        setIsUpdating((prev) => ({ ...prev, [id]: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/solutions/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();

            setSubmissions((prev) =>
                prev.map((sub) =>
                    sub.solutionId === id
                        ? {
                            ...sub,
                            status: newStatus,
                            points: newStatus === "solution_accepted_points" || "winner" ? 50 : 0,

                        }
                        : sub
                )
            );

            toast({
                title: "Status Updated",
                description:
                    newStatus === "solution_accepted_points"
                        ? `Submission triaged with points. Awarded 50 points.`
                        : `Submission status updated to ${statusLabels[newStatus]}.`,
            });

            setStatusUpdates((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

        } finally {
            setIsUpdating((prev) => ({ ...prev, [id]: false }));
        }
    };


    const [SubmissionsLength, setSubmissionsLength] = useState(0);
    const list = Array.isArray(submissions) ? submissions : [];

    const overviewStats = {
        new: list.filter(s => s.status === 'new').length,
        review: list.filter(s => s.status === 'under_review').length,
        solutionAcceptedPoints: list.filter(s => s.status === 'solution_accepted_points').length,
        challengeSubmitted: SubmissionsLength,
    };

    const allowedExtensions = ["pdf", "doc", "docx"];

    const onDrop = useCallback(
        (acceptedFiles: any) => {
            setUploadError("");

            const validFiles = [];
            const allowedExtensions = ["pdf", "doc", "docx"];

            for (const file of acceptedFiles) {
                const ext = file.name.split(".").pop().toLowerCase();

                if (!allowedExtensions.includes(ext)) {
                    setUploadError(`Only PDF, DOC, and DOCX files are allowed: ${file.name}`);
                    continue;
                }

                if (validFiles.length + files.length >= MAX_FILES) {
                    setUploadError(`Maximum ${MAX_FILES} files allowed`);
                    break;
                }

                validFiles.push(file);
            }

            if (validFiles.length === 0) return;

            const updated = [...files, ...validFiles];
            setFiles(updated);
            collaborationForm.setValue("attachments", updated);
        },
        [files, collaborationForm]
    );


    const { getRootProps, getInputProps, isDragActive, open: open1 } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true
    });

    const openFileDialog = () => open1();

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        collaborationForm.setValue("attachments", updated);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTermsDialog, setShowTermsDialog] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [pendingCollaborationData, setPendingCollaborationData] = useState<collaborationFormValues | null>(null);

    // Handler to show terms dialog
    const handleCollaborationFormSubmit = async (data: collaborationFormValues) => {
        setPendingCollaborationData(data);
        setTermsAccepted(false);
        setShowTermsDialog(true);
    };

    // Actual submission after terms acceptance
    async function onCollaborationSubmit(data: collaborationFormValues): Promise<boolean> {
        const token = localStorage.getItem("token");
        if (!token) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Please log in again.",
            });
            return false;
        }

        // Reward logic
        let rewardData: any = {};
        if (data.rewardType === "fixed") {
            rewardData.reward_amount = data.rewardAmount;
        } else {
            rewardData.reward_min = data.rewardMin;
            rewardData.reward_max = data.rewardMax;
        }

        const formData = new FormData();

        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("challenge_type", data.challengeType);
        formData.append("contact_name", data.contact.name);
        formData.append("contact_role", data.contact.role);

        const formatDateForBackend = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        formData.append("startDate", data.startDate ? formatDateForBackend(data.startDate) : "");
        formData.append("endDate", data.endDate ? formatDateForBackend(data.endDate) : "");

        formData.append("sector", data.technologyArea?.sector || "");
        formData.append("technologyArea", data.technologyArea?.techArea || "");

        if (rewardData.reward_amount !== undefined) {
            formData.append("reward_amount", String(rewardData.reward_amount));
        }
        if (rewardData.reward_min !== undefined) {
            formData.append("reward_min", String(rewardData.reward_min));
        }
        if (rewardData.reward_max !== undefined) {
            formData.append("reward_max", String(rewardData.reward_max));
        }

        if (files.length > 0) {
            files.forEach((file) => {
                formData.append("attachments", file);
            });
        }

        let url = `${API_BASE_URL}/api/collaborations`;
        let method = "POST";

        if (isEditingCollaboration && currentEditingCollaborationId) {
            url = `${API_BASE_URL}/api/collaborations/${currentEditingCollaborationId}`;
            method = "PUT";
        }

        try {
            setIsSubmitting(true);

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                toast({
                    title: isEditingCollaboration ? "Challenge Updated" : "Challenge Saved",
                    description: isEditingCollaboration
                        ? "Your Challenge details have been updated."
                        : "Your Challenge details have been saved.",
                });

                getUsersCollaboration();

                collaborationForm.reset({
                    title: "",
                    description: DEFAULT_COLLABORATION_DESCRIPTION,
                    rewardType: "fixed",
                    rewardAmount: 0,
                    rewardMin: undefined,
                    rewardMax: undefined,
                    contact: { name: "", role: "" },
                    challengeType: "corporate",
                    startDate: undefined,
                    endDate: undefined,
                    technologyArea: { sector: "", techArea: "" },
                    attachments: [],
                });

                setFiles([]); // reset file uploader

                setIsEditingCollaboration(false);
                setCurrentEditingCollaborationId(null);
                setSelectedCollaborationToEdit(null);
                return true; // Success
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: `Failed to ${isEditingCollaboration ? "update" : "save"} Challenge`,
                    description: errorData.error || "An unknown error occurred.",
                });
                return false; // Failed
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: `Could not ${isEditingCollaboration ? "update" : "save"
                    } Challenge info. Please try again later.`,
            });
        } finally {
            setIsSubmitting(false);
        }
        return false; // Failed if we reach here
    }




    const [sectors, setSectors] = useState<SectorData[]>([]);

    const fetchSectors = async () => {
        const res = await fetch(`${API_BASE_URL}/api/sectors`);
        const data = await res.json();
        setSectors(data);
    };
    useEffect(() => {
        fetchSectors();
    }, []);

    useEffect(() => {
        if (selectedCollaborationToEdit) {
            collaborationForm.reset({
                title: selectedCollaborationToEdit.title,
                description: selectedCollaborationToEdit.description,
                rewardType: selectedCollaborationToEdit.reward_min != null ? "range" : "fixed",
                rewardAmount: selectedCollaborationToEdit.reward_amount || 0,
                rewardMin: selectedCollaborationToEdit.reward_min ?? undefined,
                rewardMax: selectedCollaborationToEdit.reward_max ?? undefined,
                contact: {
                    name: selectedCollaborationToEdit.contact_name,
                    role: selectedCollaborationToEdit.contact_role,
                },
                challengeType: selectedCollaborationToEdit.challenge_type,
                startDate: selectedCollaborationToEdit.start_date ? new Date(selectedCollaborationToEdit.start_date) : undefined,
                endDate: selectedCollaborationToEdit.end_date ? new Date(selectedCollaborationToEdit.end_date) : undefined,
                technologyArea: {
                    sector: selectedCollaborationToEdit.sector || '',
                    techArea: selectedCollaborationToEdit.technology_area || ''
                }
            });
        }
    }, [selectedCollaborationToEdit, collaborationForm]);

    const getSubmissions = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/solutions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                }
            });

            const result = await response.json();
            setSubmissions(Array.isArray(result.solutions) ? result.solutions : []);
        } catch (error) {
            setSubmissions([]);
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could Not Get User Solutions. Please try again later.' });
        }
    }, [toast])

    useEffect(() => {
        getSubmissions()
    }, [getSubmissions])



    useEffect(() => {
        const checkProfile = async () => {
            const token = localStorage.getItem("token");
            try {
                const response = await fetch(`${API_BASE_URL}/api/isProfileSubmitted`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setIsProfileSubmitted(data.status === "submitted");
                if (data.profile && data.profile.is_editable !== undefined) {
                    setIsEditable(data.profile.is_editable);
                }
            } catch (err) {
                console.error("Network error:", err);
            }

            await getUsersCollaboration();
        };

        checkProfile();
    }, [getUsersCollaboration]);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [collaborationToDeleteId, setCollaborationToDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    async function onDeleteCollaboration() {
        if (!collaborationToDeleteId) return;

        setIsDeleting(true);
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            setIsDeleting(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/collaborations/${collaborationToDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (response.ok) {
                toast({
                    title: "Challenge Deleted",
                    description: "The Challenge has been successfully removed.",
                });

                setGetUserCollaborationData(prev => prev.filter(collab => collab.id !== collaborationToDeleteId));
                setIsDeleteDialogOpen(false);
                setCollaborationToDeleteId(null);
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: "Failed to delete Challenge",
                    description: errorData.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: "Could not delete Challenge. Please try again later.",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Only PNG and JPG images are allowed');
            e.target.value = '';
            return;
        }

        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            setUploadError('File size should be less than 2MB');
            e.target.value = '';
            return;
        }

        profileForm.setValue('logo', file, {
            shouldValidate: true,
            shouldDirty: true
        });


        const reader = new FileReader();
        reader.onload = () => {
            setLogoPreview(reader.result as string);
        };
        reader.onerror = () => {
            console.error('Error reading file');
            setUploadError('Error reading file. Please try again.');
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            profileForm.setValue('logo', file, { shouldValidate: true, shouldDirty: true });
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        profileForm.setValue('logo', null);
        setLogoPreview(null);
    };

    const [datePickerOpen, setDatePickerOpen] = useState(false);

    useEffect(() => {
        const pendingTab = localStorage.getItem("msmeTabPending");
        if (pendingTab) {
            setActiveTab(pendingTab as MsmeDashboardTab);
            localStorage.removeItem("msmeTabPending");
        }
    }, []);

    // Fetch collaboration graph data
    useEffect(() => {
        const fetchGraphData = async () => {
            if (activeTab !== 'overview') return;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/collaborations/myGraph`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    setGraphData(data.solutions || []);
                    setDailySubmissions(data.daily_submissions || []);

                    // Get available years
                    const years = (data.solutions || []).map((item: any) => item.year);
                    setAvailableYears(years);
                }
            } catch (error) {
                console.error('Error fetching graph data:', error);
            }
        };

        fetchGraphData();
    }, [activeTab, selectedYear]);


    return (
        <>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this Challenge? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onDeleteCollaboration}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0">
                    <>
                        <DialogHeader className="p-6">
                            <DialogTitle className="text-3xl font-bold font-headline">Organisation Dashboard</DialogTitle>
                            <DialogDescription>Welcome, {user.name}. Manage your challenges, submissions, and profile.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow flex flex-col min-h-0 p-6 pt-0">
                            <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as MsmeDashboardTab)} className="flex flex-col flex-grow min-h-0">
                                <TabsList className="grid w-full h-fit grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                                    <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
                                    <TabsTrigger value="submissions"><FileText className="mr-2 h-4 w-4" /> Submissions</TabsTrigger>
                                    <TabsTrigger value="engagement"><Handshake className="mr-2 h-4 w-4" /> Engagement</TabsTrigger>
                                    <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> {isProfileSubmitted ? "Challenge" : "Edit Profile"}</TabsTrigger>
                                    <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
                                </TabsList>
                                <div className="flex-grow overflow-y-auto pb-6 w-full" >
                                    <TabsContent value="overview" className="mt-4 space-y-6">
                                        <div className="grid gap-6 md:grid-cols-4">
                                            <Card className="
                                                    bg-card/50 
                                                    backdrop-blur-sm 
                                                    border-border/50 
                                                    cursor-pointer 
                                                    hover:border-primary 
                                                    transition-colors
                                                "
                                                onClick={() => setActiveTab("submissions")} >
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">New Submissions</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{overviewStats.new}</div><p className="text-xs text-muted-foreground">Awaiting review</p></CardContent>
                                            </Card>
                                            <Card className="
                                                    bg-card/50 
                                                    backdrop-blur-sm 
                                                    border-border/50 
                                                    cursor-pointer 
                                                    hover:border-primary 
                                                    transition-colors
                                                " onClick={() => setActiveTab("engagement")}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Incentive Challenges</CardTitle>
                                                    <Target className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {overviewStats.challengeSubmitted === 0 ? "0" : overviewStats.challengeSubmitted}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Challenges submitted</p>
                                                </CardContent>

                                            </Card>
                                            <Card
                                                className="
                                                    bg-card/50 
                                                    backdrop-blur-sm 
                                                    border-border/50 
                                                    cursor-pointer 
                                                    hover:border-primary 
                                                    transition-colors
                                                "
                                                onClick={() => setActiveTab("submissions")}
                                            >
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>

                                                <CardContent>
                                                    <div className="text-2xl font-bold">{overviewStats.review}</div>
                                                    <p className="text-xs text-muted-foreground">Currently being evaluated</p>
                                                </CardContent>
                                            </Card>

                                            <Card className="
                                                    bg-card/50 
                                                    backdrop-blur-sm 
                                                    border-border/50 
                                                    cursor-pointer 
                                                    hover:border-primary 
                                                    transition-colors
                                                "
                                                onClick={() => setActiveTab("submissions")} >
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Accepted Solutions</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{overviewStats.solutionAcceptedPoints}</div><p className="text-xs text-muted-foreground">Marked as valid for challenge</p></CardContent>
                                            </Card>
                                        </div>
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col gap-y-2">
                                                        <CardTitle>Solutions Overview</CardTitle>
                                                        <CardDescription>Accepted solutions over the last 6 months.</CardDescription>
                                                    </div>
                                                    {availableYears.length > 0 && (
                                                        <Select
                                                            value={selectedYear.toString()}
                                                            onValueChange={(value) => setSelectedYear(parseInt(value))}
                                                        >
                                                            <SelectTrigger className="w-[120px]">
                                                                <SelectValue placeholder="Select year" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableYears.map((year) => (
                                                                    <SelectItem key={year} value={year.toString()}>
                                                                        {year}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="flex justify-center py-4">
                                                    <ContributionGraph data={dailySubmissions} year={selectedYear} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="submissions" className="mt-4 space-y-4">
                                        {submissions.length > 0 ? submissions.map((sub, id) => (
                                            <Card
                                                key={id}
                                                onClick={() => setSelectedSubmission(sub)}
                                                className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 cursor-pointer transition-colors"
                                            >
                                                <CardHeader className="pb-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-2 w-full">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className='flex justify-between w-full'>
                                                                    <CardTitle className="tracking-normal text-lg font-medium w-full">
                                                                        {sub.challenge?.title || "Untitled Challenge"}
                                                                    </CardTitle>
                                                                    <div className="flex gap-2">
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                            <span>Comments</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/70 text-xs font-medium">
                                                                                    {sub.comments?.length || 0}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                            <span>Points</span>
                                                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                                                {sub.points ?? 0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <CardDescription className="flex items-center text-sm text-muted-foreground">


                                                                <p className="text-sm text-muted-foreground flex items-center">
                                                                    Submitted {formatPrettyDate(new Date(sub.createdAt))}
                                                                    <span className="w-1 h-1 rounded-full bg-foreground/40 inline-block mx-2"></span>
                                                                </p>
                                                                <Badge
                                                                    className={`px-3 py-1 text-xs font-semibold border rounded-sm 
                                                                    ${statusBadgeClasses[sub.status]}`}
                                                                >
                                                                    {statusLabels[sub.status]}

                                                                </Badge>
                                                                {sub.lastActive && <span className="w-1 h-1 rounded-full bg-foreground/40 inline-block mx-2"></span>}
                                                                {sub.lastActive && (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Last active {timeAgoShort(new Date(sub.lastActive))}
                                                                    </p>
                                                                )}
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                </CardHeader>

                                                <CardFooter className="flex gap-2 items-center">
                                                    {sub.contactName && (
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <span className="font-medium">By {sub.contactName}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 ml-auto">
                                                        {statusUpdates[sub.solutionId] && (
                                                            <Button
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateStatus(sub.solutionId);
                                                                }}
                                                                disabled={isUpdating[sub.solutionId] || sub.challenge?.status === "stopped" || sub.challenge?.status === "expired"}
                                                            >
                                                                {isUpdating[sub.solutionId] ? (
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Save className="mr-2 h-4 w-4" />
                                                                )}
                                                                Update Status
                                                            </Button>
                                                        )}

                                                        {sub.challenge?.allow_status_updates !== false && sub.challenge?.status !== "expired" && sub.challenge?.status !== "stopped" && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        {statusUpdates[sub.status]}
                                                                        <span>{statusLabels[sub.status]}</span>
                                                                        <ChevronDown className="ml-2 h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>

                                                                <DropdownMenuContent>
                                                                    {Object.values(SolutionStatus).map((status) => (
                                                                        <DropdownMenuItem
                                                                            key={status}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleStatusChange(sub.solutionId, status);
                                                                            }}
                                                                        >
                                                                            <span>{statusLabels[status]}</span>
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </CardFooter>
                                            </Card >
                                        )) : (
                                            <Card className="text-center text-muted-foreground py-16">
                                                <CardContent>You have not received any submissions yet.</CardContent>
                                            </Card>
                                        )
                                        }
                                    </TabsContent >
                                    <TabsContent value="engagement" className="mt-4 space-y-4">
                                        {getUsersCollaborationData?.length > 0 ? getUsersCollaborationData.slice().reverse().map((sub) => (
                                            <Card
                                                key={sub.id}
                                                onClick={() => setSelectedCollabId(sub.id)}
                                                className="bg-card/50 backdrop-blur-sm border-border/50 cursor-pointer hover:border-primary"
                                            >
                                                <CardHeader>
                                                    <div className="flex justify-between items-start w-full">
                                                        <div>
                                                            <CardTitle className="text-lg">{sub.title}</CardTitle>
                                                            <CardDescription>Submitted by {sub.contact_name}</CardDescription>
                                                        </div>

                                                        {/* 3 DOT MENU */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-5 w-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>

                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedCollabId(sub.id);
                                                                        setIsCollabEditMode(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="h-4 w-4 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>

                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCollaborationToDeleteId(sub.id);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </CardHeader>

                                                <CardFooter>
                                                    <p className="text-sm text-muted-foreground">
                                                        Submitted on {new Date(sub.created_at).toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })} {new Date(sub.created_at).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        }).toLowerCase()}
                                                    </p>
                                                </CardFooter>
                                            </Card>
                                        )) : (
                                            <Card className="text-center text-muted-foreground py-16">
                                                <CardContent>You have not submit any Challenge.</CardContent>
                                            </Card>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="profile" className="mt-4">
                                        {!isProfileSubmitted && (
                                            <Card className={`${isProfileSubmitted && !isEditable ? "hidden" : "block"} bg-card/50 backdrop-blur-sm border-border/50`}>
                                                <CardHeader>
                                                    <CardTitle>{isProfileSubmitted ? "Edit Organisation Profile" : "Create Organisation Profile"}</CardTitle>
                                                    <CardDescription>
                                                        {isProfileSubmitted
                                                            ? "Update your profile information. Changes will be saved immediately."
                                                            : "This information will be publicly visible to potential collaborators."
                                                        }
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <Form {...profileForm}>
                                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="name"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("name") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Company Name <span className="text-red-600">*</span></FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            {...field}
                                                                                            maxLength={MAX_CHARS}
                                                                                            placeholder="Enter company name"
                                                                                            className="pr-16"
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="affiliated_by"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("affiliated_by") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Affiliated By</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            {...field}
                                                                                            maxLength={MAX_CHARS}
                                                                                            placeholder="Eg: Company / Institution Name"
                                                                                            className="pr-16"
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />


                                                            </div>
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="sector"
                                                                render={({ field }) => {
                                                                    const value = profileForm.watch("sector") || "";
                                                                    return (
                                                                        <FormItem>
                                                                            <FormLabel>Sector <span className="text-red-600">*</span></FormLabel>
                                                                            <FormControl>
                                                                                <div className="relative">
                                                                                    <Input
                                                                                        {...field}
                                                                                        maxLength={MAX_CHARS}
                                                                                        placeholder="e.g., FinTech, Health, AI"
                                                                                        className="pr-16"
                                                                                    />
                                                                                    <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                        {value.length}/{MAX_CHARS}
                                                                                    </span>
                                                                                </div>
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="short_description"
                                                                render={({ field }) => {
                                                                    const value = profileForm.watch("short_description") || "";
                                                                    return (
                                                                        <FormItem>
                                                                            <FormLabel>Short Description <span className="text-red-600">*</span></FormLabel>
                                                                            <FormControl>
                                                                                <div className="relative">
                                                                                    <Textarea
                                                                                        {...field}
                                                                                        maxLength={MAX_CHARS}
                                                                                        placeholder="A brief one-sentence pitch for your company."
                                                                                        className="pr-16"
                                                                                    />
                                                                                    <span className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                                                                                        {value.length}/{MAX_CHARS}
                                                                                    </span>
                                                                                </div>
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />

                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="website_url"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("website_url") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Website URL</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            {...field}
                                                                                            maxLength={MAX_CHARS}
                                                                                            placeholder="https://example.com"
                                                                                            className="pr-20"
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />

                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="phone_number"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Phone Number <span className="text-red-600">*</span></FormLabel>
                                                                            <FormControl>
                                                                                <Input
                                                                                    {...field}
                                                                                    type="tel"
                                                                                    placeholder="9876543210"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="x_url"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>X (Twitter) Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="x.com"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="instagram_username"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Instagram Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="instagram.com"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="linkedin_url"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>LinkedIn Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="linkedin.com/company"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="logo"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Company Logo <span className="text-red-500">*</span></FormLabel>
                                                                        <FormControl>
                                                                            <div
                                                                                onClick={() => fileInputRef.current?.click()}
                                                                                onDragOver={handleDragOver}
                                                                                onDrop={handleDrop}
                                                                                className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                                                                            >
                                                                                {logoPreview ? (
                                                                                    <>
                                                                                        <Image
                                                                                            src={logoPreview}
                                                                                            alt="Logo preview"
                                                                                            layout="fill"
                                                                                            objectFit="contain"
                                                                                            className="rounded-lg"
                                                                                        />
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="destructive"
                                                                                            size="icon"
                                                                                            className="absolute top-2 right-2 z-10"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                removeLogo();
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                                                                        <p className="mb-2 text-sm text-muted-foreground">
                                                                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            PNG, JPG (MAX. 800x400px)
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                                <Input
                                                                                    ref={fileInputRef}
                                                                                    id="dropzone-file"
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    accept="image/*"
                                                                                    onChange={handleFileChange}
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <Dialog open={open} onOpenChange={setOpen}>
                                                                <DialogTrigger asChild>
                                                                    <LoadingButton
                                                                        type="button"
                                                                        onClick={handleOpenDialog}
                                                                        isLoading={isSubmitting}
                                                                        disabled={isProfileSubmitting}
                                                                    >
                                                                        {isProfileSubmitted ? "Update Profile" : "Save Profile"}
                                                                    </LoadingButton>
                                                                </DialogTrigger>

                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Confirm Submission</DialogTitle>
                                                                        <DialogDescription>
                                                                            Are you sure you want to submit your profile?
                                                                            <br />
                                                                            <span className="text-red-500">Please type <strong className="font-headline">{"confirm"}</strong> below to proceed.</span>
                                                                        </DialogDescription>
                                                                    </DialogHeader>

                                                                    <div className="py-4">
                                                                        <Input
                                                                            placeholder='Type "confirm" to proceed'
                                                                            value={confirmText}
                                                                            onChange={(e) => setConfirmText(e.target.value)}

                                                                        />
                                                                    </div>

                                                                    <DialogFooter className="flex justify-end gap-2">
                                                                        <Button variant="outline" onClick={() => setOpen(false)}>
                                                                            Cancel
                                                                        </Button>

                                                                        <Button
                                                                            onClick={() => {
                                                                                profileForm.handleSubmit(onProfileSubmit)();
                                                                            }}
                                                                            disabled={
                                                                                profileForm.formState.isSubmitting ||
                                                                                confirmText.toLowerCase() !== "confirm"
                                                                            }
                                                                        >
                                                                            {profileForm.formState.isSubmitting && (
                                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                            )}
                                                                            Confirm
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </form>
                                                    </Form>
                                                </CardContent>
                                            </Card>
                                        )}


                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50 mt-4 max-w-full">
                                            <CardHeader>
                                                <CardTitle>Incentive Challenges</CardTitle>
                                                <CardDescription>
                                                    {"Tell us about the Challenges you're seeking and the contact person."}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Form {...collaborationForm}>
                                                    <form onSubmit={collaborationForm.handleSubmit(handleCollaborationFormSubmit)} className="space-y-4 w-full">

                                                        <FormField
                                                            control={collaborationForm.control}
                                                            name="title"
                                                            render={({ field }) => {
                                                                const titleValue = collaborationForm.watch("title") || "";
                                                                return (
                                                                    <FormItem>
                                                                        <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative">
                                                                                <Input placeholder="Enter the Challenge title" {...field} disabled={collaborationForm.formState.isSubmitting} />
                                                                                <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                    {titleValue.length}/{MAX_CHARS}
                                                                                </span>
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )
                                                            }
                                                            }
                                                        />

                                                        <FormField
                                                            control={collaborationForm.control}
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
                                                            control={collaborationForm.control}
                                                            name="description"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Description <span className="text-red-500">*</span>
                                                                    </FormLabel>

                                                                    <ChallengeMarkdownEditor
                                                                        ttForm={collaborationForm}
                                                                        defaultDescription={`[Give a brief overview of the context and purpose of this challenge.]
## Objective
[What do you aim to achieve with this challenge? Clearly state the expected outcome or impact.]

## Problem Statement
[The current process of [describe the issue] is outdated and inefficient, affecting [who is impacted] with [specific negative consequence]]

## Background
[Describe the core problem this challenge seeks to solve. Why does it exist? Who is impacted?]

## What We Are Looking For
[Explain the type of solution you want participants to propose or build.]

## Scope of Requirements
1. Requirement 1
2. Requirement 2
3. Requirement 3
`}
                                                                    />

                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />


                                                        <FormField
                                                            control={collaborationForm.control}
                                                            name="rewardType"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Reward <span className="text-red-500">*</span>
                                                                    </FormLabel>

                                                                    <FormControl>
                                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">

                                                                            {/* ✅ CUSTOM DROPDOWN USING POPOVER */}
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="w-full sm:w-[130px] h-10 flex items-center justify-between rounded-md border px-3 text-sm"
                                                                                        disabled={isFieldDisabled('rewardType') || collaborationForm.formState.isSubmitting}
                                                                                    >
                                                                                        {rewardOptions.find((opt) => opt.value === field.value)?.label ??
                                                                                            "Select type"}
                                                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                                                    </button>
                                                                                </PopoverTrigger>

                                                                                <PopoverContent className="p-0 w-[130px]">
                                                                                    <Command>
                                                                                        <CommandList>
                                                                                            <CommandEmpty>No option found.</CommandEmpty>
                                                                                            <CommandGroup>
                                                                                                {rewardOptions.map((opt) => (
                                                                                                    <CommandItem
                                                                                                        key={opt.value}
                                                                                                        value={opt.value}
                                                                                                        onSelect={() => field.onChange(opt.value)}
                                                                                                    >
                                                                                                        <Check
                                                                                                            className={cn(
                                                                                                                "mr-2 h-4 w-4",
                                                                                                                field.value === opt.value ? "opacity-100" : "opacity-0"
                                                                                                            )}
                                                                                                        />
                                                                                                        {opt.label}
                                                                                                    </CommandItem>
                                                                                                ))}
                                                                                            </CommandGroup>
                                                                                        </CommandList>
                                                                                    </Command>
                                                                                </PopoverContent>
                                                                            </Popover>


                                                                            {collaborationForm.watch("rewardType") === "fixed" ? (
                                                                                <FormField
                                                                                    control={collaborationForm.control}
                                                                                    name="rewardAmount"
                                                                                    render={({ field }) => (
                                                                                        <FormItem className="flex-1 md:flex-none">
                                                                                            <FormControl>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    placeholder="Enter amount"
                                                                                                    {...field}
                                                                                                    value={field.value ?? ''}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.valueAsNumber;
                                                                                                        field.onChange(isNaN(val) ? undefined : val);
                                                                                                    }}
                                                                                                    min={0}
                                                                                                    className="no-spin w-full sm:w-48"
                                                                                                    disabled={isFieldDisabled('rewardType') || collaborationForm.formState.isSubmitting}
                                                                                                />
                                                                                            </FormControl>
                                                                                            <FormMessage />
                                                                                        </FormItem>
                                                                                    )}
                                                                                />
                                                                            ) : (
                                                                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <FormField
                                                                                            control={collaborationForm.control}
                                                                                            name="rewardMin"
                                                                                            render={({ field }) => (
                                                                                                <FormItem className="flex-1 md:flex-none">
                                                                                                    <FormControl>
                                                                                                        <Input
                                                                                                            type="number"
                                                                                                            placeholder="Min"
                                                                                                            {...field}
                                                                                                            value={field.value ?? ''}
                                                                                                            onChange={(e) => {
                                                                                                                const val = e.target.valueAsNumber;
                                                                                                                field.onChange(isNaN(val) ? undefined : val);
                                                                                                            }}
                                                                                                            className="no-spin w-full sm:w-24"
                                                                                                            disabled={isFieldDisabled('rewardType')}
                                                                                                        />
                                                                                                    </FormControl>
                                                                                                    <div className="w-full">
                                                                                                        <FormMessage />
                                                                                                    </div>
                                                                                                </FormItem>
                                                                                            )}
                                                                                        />
                                                                                        <span>-</span>
                                                                                        <FormField
                                                                                            control={collaborationForm.control}
                                                                                            name="rewardMax"
                                                                                            render={({ field }) => (
                                                                                                <FormItem className="flex-1 md:flex-none">
                                                                                                    <FormControl>
                                                                                                        <Input
                                                                                                            type="number"
                                                                                                            placeholder="Max"
                                                                                                            {...field}
                                                                                                            value={field.value ?? ''}
                                                                                                            onChange={(e) => {
                                                                                                                const val = e.target.valueAsNumber;
                                                                                                                field.onChange(isNaN(val) ? undefined : val);
                                                                                                            }}
                                                                                                            className="no-spin w-full sm:w-24"
                                                                                                            disabled={isFieldDisabled('rewardType') || collaborationForm.formState.isSubmitting}
                                                                                                        />
                                                                                                    </FormControl>
                                                                                                    <div className="w-full">
                                                                                                        <FormMessage />
                                                                                                    </div>
                                                                                                </FormItem>
                                                                                            )}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </FormControl>
                                                                    {isFieldDisabled('rewardType') && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            These fields are only editable by admin. Contact admin.
                                                                        </p>
                                                                    )}
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={collaborationForm.control}
                                                            name="challengeType"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-3">
                                                                    <FormLabel>Challenge Type <span className="text-red-500">*</span></FormLabel>
                                                                    <FormControl>
                                                                        <RadioGroup
                                                                            onValueChange={field.onChange}
                                                                            defaultValue={field.value}
                                                                            value={field.value}
                                                                            className="flex flex-col sm:flex-row gap-3 sm:gap-5"
                                                                            disabled={collaborationForm.formState.isSubmitting}
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
                                                            control={collaborationForm.control}
                                                            name="startDate"

                                                            render={() => (
                                                                <div className="w-full sm:w-[80%] lg:w-[60%] py-4">
                                                                    <FormItem className="flex flex-col gap-2">
                                                                        <FormLabel>Start / End Date <span className="text-red-500">*</span></FormLabel>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            className="pl-3 text-left font-normal w-full justify-start"
                                                                            onClick={() => setDatePickerOpen((prev) => !prev)}
                                                                            disabled={isFieldDisabled('startDate') || collaborationForm.formState.isSubmitting}
                                                                        >
                                                                            {collaborationForm.watch("startDate") && collaborationForm.watch("endDate") ? (
                                                                                <span className="truncate">
                                                                                    {format(collaborationForm.watch("startDate") as Date, "PP")} →{" "}
                                                                                    {format(collaborationForm.watch("endDate") as Date, "PP")}
                                                                                </span>
                                                                            ) : (
                                                                                <span>Pick date range</span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                                                        </Button>

                                                                        {datePickerOpen && !isFieldDisabled('startDate') && (
                                                                            <div className="mt-2 border rounded-md p-3 shadow-md z-50 w-full sm:w-fit max-w-full overflow-x-auto">
                                                                                <Calendar
                                                                                    mode="range"
                                                                                    numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
                                                                                    selected={{
                                                                                        from: collaborationForm.watch("startDate"),
                                                                                        to: collaborationForm.watch("endDate"),
                                                                                    }}
                                                                                    onSelect={(range: any) => {
                                                                                        collaborationForm.setValue("startDate", range?.from);
                                                                                        collaborationForm.setValue("endDate", range?.to);
                                                                                        if (range?.from && range?.to) setDatePickerOpen(false);
                                                                                    }}


                                                                                    disabled={(date) => {
                                                                                        const today = new Date();
                                                                                        today.setHours(0, 0, 0, 0);
                                                                                        return date < today;
                                                                                    }}
                                                                                />
                                                                                <div className="flex justify-end gap-2 mt-3">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        onClick={() => {
                                                                                            collaborationForm.setValue("startDate", new Date());
                                                                                            collaborationForm.setValue("endDate", new Date());
                                                                                        }}
                                                                                    >
                                                                                        Reset
                                                                                    </Button>

                                                                                    <Button type="button" onClick={() => setDatePickerOpen(false)}>
                                                                                        Confirm
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {isFieldDisabled('startDate') && (
                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                These fields are only editable by admin. Contact admin.
                                                                            </p>
                                                                        )}
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                </div>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={collaborationForm.control}
                                                            name="attachments"
                                                            render={() => (
                                                                <FormItem>
                                                                    <FormLabel>Attachments (Max 5 files)</FormLabel>
                                                                    <FormControl>
                                                                        <div
                                                                            {...getRootProps()}
                                                                            className={cn(
                                                                                "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 hover:bg-muted/30",
                                                                                isDragActive ? "bg-accent/30" : "bg-muted/20",
                                                                                collaborationForm.formState.isSubmitting && "opacity-50 cursor-not-allowed"
                                                                            )}
                                                                            onClick={collaborationForm.formState.isSubmitting ? undefined : openFileDialog}
                                                                        >
                                                                            <input {...getInputProps()} />


                                                                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />

                                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                                Click to upload or Drag & drop PDF, DOC, or DOCX here
                                                                            </p>

                                                                            <p className="text-xs text-muted-foreground">
                                                                                Max 5 files • Allowed: PDF, DOC, DOCX
                                                                            </p>
                                                                        </div>
                                                                    </FormControl>


                                                                    {files.length > 0 && (
                                                                        <div className="mt-4 space-y-2">
                                                                            {files.map((file: any, index) => {
                                                                                const ext = file.name.split(".").pop().toLowerCase();
                                                                                const isPDF = ext === "pdf";
                                                                                const isDOC = ext === "doc";
                                                                                const isDOCX = ext === "docx";

                                                                                return (
                                                                                    <div
                                                                                        key={index}
                                                                                        className="flex justify-between items-center border rounded-lg p-2 bg-muted/40"
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div>
                                                                                                <div className="text-sm font-medium">{file.name}</div>
                                                                                                <div className="text-xs text-muted-foreground">
                                                                                                    {(file.size / 1024).toFixed(1)} KB
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            onClick={() => removeFile(index)}
                                                                                            disabled={collaborationForm.formState.isSubmitting}
                                                                                        >
                                                                                            <X className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}


                                                                    {/* Error */}
                                                                    {uploadError && (
                                                                        <p className="text-xs text-destructive mt-1">{uploadError}</p>
                                                                    )}

                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />


                                                        <Separator className="my-4" />

                                                        {/* Contact Person */}
                                                        <h3 className="text-lg font-medium">Contact Person</h3>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="contact.name"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative">
                                                                                <Input
                                                                                    {...field}
                                                                                    maxLength={300}
                                                                                    placeholder="Enter the Name"
                                                                                    disabled={collaborationForm.formState.isSubmitting}
                                                                                    onChange={(e) => {
                                                                                        field.onChange(e);
                                                                                    }}
                                                                                />
                                                                                <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                    {field.value?.length || 0}/300
                                                                                </span>
                                                                            </div>

                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="contact.role"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Role <span className="text-red-500">*</span></FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative">
                                                                                <Input
                                                                                    {...field}
                                                                                    maxLength={300}
                                                                                    placeholder="Enter the Role"
                                                                                    disabled={collaborationForm.formState.isSubmitting}
                                                                                    onChange={(e) => {
                                                                                        field.onChange(e);
                                                                                    }}
                                                                                />
                                                                                <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                    {field.value?.length || 0}/300
                                                                                </span>
                                                                            </div>

                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="w-full sm:w-auto">
                                                                        <Button
                                                                            type="submit"
                                                                            disabled={!isProfileSubmitted || collaborationForm.formState.isSubmitting}
                                                                            className="w-full sm:w-auto"
                                                                        >
                                                                            {collaborationForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                            {isEditingCollaboration ? "Update Challenge" : "Proceed to Next"}
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {!isProfileSubmitted && (
                                                                    <TooltipContent side="top" align="start">
                                                                        <p>Please submit your Organisation profile first before uploading challenges</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </form>
                                                </Form>
                                            </CardContent>
                                        </Card>

                                        {/* Terms and Conditions Dialog */}
                                        <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
                                            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle>Terms and Conditions</DialogTitle>
                                                    <DialogDescription>
                                                        Please read and accept the terms and conditions before submitting your challenge.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <ScrollArea className="flex-1 pr-4 max-h-[50vh] overflow-y-scroll">
                                                    <div className="space-y-4 text-sm">
                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">1. Challenge Submission</h3>
                                                            <p className="text-muted-foreground">
                                                                By submitting a challenge, you confirm that you have the authority to post this challenge on behalf of your organization. All information provided must be accurate and complete.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">2. Intellectual Property</h3>
                                                            <p className="text-muted-foreground">
                                                                You retain all intellectual property rights to your challenge description and materials. However, by posting, you grant us a license to display and distribute your challenge to potential solvers on our platform.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">3. Reward Commitment</h3>
                                                            <p className="text-muted-foreground">
                                                                The reward amount specified is a binding commitment. You agree to pay the stated reward to the winner(s) upon successful completion of the challenge as per the criteria outlined.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">4. Solution Evaluation</h3>
                                                            <p className="text-muted-foreground">
                                                                You commit to evaluating all submitted solutions fairly and in a timely manner. Feedback should be provided to participants within a reasonable timeframe.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">5. Data Privacy</h3>
                                                            <p className="text-muted-foreground">
                                                                Any personal or sensitive information shared by solution providers must be handled in accordance with applicable data protection laws. You agree not to misuse participant information.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">6. Platform Fees</h3>
                                                            <p className="text-muted-foreground">
                                                                Platform service fees may apply as per our pricing structure. You will be notified of any applicable fees before your challenge goes live.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">7. Challenge Modifications</h3>
                                                            <p className="text-muted-foreground">
                                                                Once a challenge is published and has received submissions, significant modifications to the challenge requirements or rewards may not be permitted without platform approval.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">8. Cancellation Policy</h3>
                                                            <p className="text-muted-foreground">
                                                                Challenges may be cancelled before the submission deadline with valid reasons. However, if solutions have already been submitted, you may be required to provide compensation or feedback.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">9. Liability</h3>
                                                            <p className="text-muted-foreground">
                                                                The platform acts as an intermediary. We are not responsible for disputes between challenge posters and solution providers. You agree to resolve any disputes directly with participants.
                                                            </p>
                                                        </section>

                                                        <section>
                                                            <h3 className="font-semibold text-base mb-2">10. Compliance</h3>
                                                            <p className="text-muted-foreground">
                                                                Your challenge must comply with all applicable laws and regulations. Challenges involving illegal activities, discrimination, or harmful content will be removed immediately.
                                                            </p>
                                                        </section>
                                                    </div>
                                                </ScrollArea>

                                                <div className="flex items-center space-x-2 pt-4 border-t">
                                                    <input
                                                        type="checkbox"
                                                        id="terms-accept"
                                                        checked={termsAccepted}
                                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />
                                                    <label htmlFor="terms-accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        I have read and agree to the terms and conditions
                                                    </label>
                                                </div>

                                                <DialogFooter className="gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowTermsDialog(false);
                                                            setTermsAccepted(false);
                                                            setPendingCollaborationData(null);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={!termsAccepted || isSubmitting}
                                                        onClick={async () => {
                                                            if (pendingCollaborationData && termsAccepted) {
                                                                const success = await onCollaborationSubmit(pendingCollaborationData);
                                                                if (success) {
                                                                    setShowTermsDialog(false);
                                                                    setPendingCollaborationData(null);
                                                                    setTermsAccepted(false);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Accept & Submit
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TabsContent>
                                    <TabsContent value="settings" className="mt-4">

                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader><CardTitle>Account Settings</CardTitle><CardDescription>Manage your account settings.</CardDescription></CardHeader>
                                            <CardContent className="space-y-8">
                                                <Form {...settingsForm}>
                                                    <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                                                        <div>
                                                            <h3 className="text-lg font-medium mb-4">Profile</h3>
                                                            <div className="space-y-4">
                                                                <FormField control={settingsForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                                            </div>
                                                        </div>

                                                        <Button type="submit" disabled={isSubmitting}>Save Changes</Button>
                                                    </form>
                                                </Form>
                                                <EmailUpdateForm currentEmail={settingsForm.watch('email')} />
                                                {authProvider === 'local' && (
                                                    <>
                                                        <Separator />
                                                        <PasswordChangeForm />
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                        {isProfileSubmitted && (
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-4 mt-4">
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1.5">
                                                            <CardTitle>Organisation Profile</CardTitle>
                                                            <CardDescription>
                                                                This information will be publicly visible to potential collaborators.
                                                            </CardDescription>
                                                        </div>
                                                        {!isEditingProfile && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setIsEditingProfile(true)}
                                                            >
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit Profile
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <Form {...profileForm}>
                                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="name"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("name") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Company Name <span className="text-red-600">*</span></FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            {...field}
                                                                                            maxLength={MAX_CHARS}
                                                                                            placeholder="Enter company name"
                                                                                            className="pr-16"
                                                                                            disabled={!isEditingProfile}
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="affiliated_by"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("affiliated_by") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Affiliated By</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            {...field}
                                                                                            maxLength={MAX_CHARS}
                                                                                            placeholder="Eg: Company / Institution Name"
                                                                                            className="pr-16"
                                                                                            disabled={!isEditingProfile}
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />
                                                            </div>


                                                            <FormField
                                                                control={profileForm.control}
                                                                name="sector"
                                                                render={({ field }) => {
                                                                    const value = profileForm.watch("sector") || "";
                                                                    return (
                                                                        <FormItem>
                                                                            <FormLabel>Sector <span className="text-red-600">*</span></FormLabel>
                                                                            <FormControl>
                                                                                <div className="relative">
                                                                                    <Input
                                                                                        {...field}
                                                                                        maxLength={MAX_CHARS}
                                                                                        placeholder="e.g., FinTech, Health, AI"
                                                                                        className="pr-16"
                                                                                        disabled={!isEditingProfile}
                                                                                    />
                                                                                    <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                        {value.length}/{MAX_CHARS}
                                                                                    </span>
                                                                                </div>
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="website_url"
                                                                    render={({ field }) => {
                                                                        const value = profileForm.watch("website_url") || "";
                                                                        return (
                                                                            <FormItem>
                                                                                <FormLabel>Website URL</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <VanityUrlInput
                                                                                            baseUrl="https://"
                                                                                            value={field.value || ""}
                                                                                            onChange={field.onChange}
                                                                                            placeholder="https://example.com"
                                                                                            disabled={!isEditingProfile}
                                                                                        />
                                                                                        <span className="absolute right-2 bottom-2 top-3 text-xs text-muted-foreground">
                                                                                            {value.length}/{MAX_CHARS}
                                                                                        </span>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        );
                                                                    }}
                                                                />
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="phone_number"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Phone Number <span className="text-red-600">*</span></FormLabel>
                                                                            <FormControl>
                                                                                <Input
                                                                                    {...field}
                                                                                    type="tel"
                                                                                    placeholder="9876543210"
                                                                                    disabled={!isEditingProfile}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="x_url"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>X (Twitter) Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="x.com"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                    disabled={!isEditingProfile}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">


                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="instagram_username"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Instagram Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="instagram.com"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                    disabled={!isEditingProfile}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                <FormField
                                                                    control={profileForm.control}
                                                                    name="linkedin_url"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>LinkedIn Username</FormLabel>
                                                                            <FormControl>
                                                                                <VanityUrlInput
                                                                                    baseUrl="linkedin.com/company"
                                                                                    value={field.value || ""}
                                                                                    onChange={field.onChange}
                                                                                    placeholder="username"
                                                                                    disabled={!isEditingProfile}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="logo"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Company Logo <span className="text-red-500">*</span></FormLabel>
                                                                        <FormControl>
                                                                            <div
                                                                                onClick={isEditingProfile ? () => fileInputRef.current?.click() : undefined}
                                                                                onDragOver={isEditingProfile ? handleDragOver : undefined}
                                                                                onDrop={isEditingProfile ? handleDrop : undefined}
                                                                                className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg ${isEditingProfile ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-60'}`}
                                                                            >
                                                                                {logoPreview ? (
                                                                                    <>
                                                                                        <Image
                                                                                            src={logoPreview}
                                                                                            alt="Logo preview"
                                                                                            layout="fill"
                                                                                            objectFit="contain"
                                                                                            className="rounded-lg"
                                                                                        />
                                                                                        {isEditingProfile && (
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="destructive"
                                                                                                size="icon"
                                                                                                className="absolute top-2 right-2 z-10"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    removeLogo();
                                                                                                }}
                                                                                            >
                                                                                                <Trash2 className="h-4 w-4" />
                                                                                            </Button>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                                                                        <p className="mb-2 text-sm text-muted-foreground">
                                                                                            <span className="font-semibold">Click to upload</span> or drag and drop
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            PNG, JPG, or GIF (MAX. 800x400px)
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                                <Input
                                                                                    ref={fileInputRef}
                                                                                    id="dropzone-file"
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    accept=".pdf,.doc,.docx"
                                                                                    onChange={handleFileChange}
                                                                                    disabled={!isEditingProfile}
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            {isEditingProfile && (
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setIsEditingProfile(false);
                                                                            fetchProfileData();
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        type="submit"
                                                                        disabled={isProfileSubmitting}
                                                                    >
                                                                        {isProfileSubmitting && (
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        )}
                                                                        Save Changes
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </form>
                                                    </Form>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </TabsContent>
                                </div >
                            </Tabs >
                        </div >
                    </>
                </DialogContent >
            </Dialog >
            <SubmissionDetailsModal
                submission={selectedSubmission}
                onOpenChange={(isOpen) => !isOpen && setSelectedSubmission(null)}
            />
            {
                selectedCollabId !== null && (
                    <CollaborationView
                        collaborationId={selectedCollabId}
                        initialEditMode={isCollabEditMode}
                        onClose={() => {
                            setSelectedCollabId(null);
                            setIsCollabEditMode(false);
                        }}
                    />
                )
            }
            <Script
                src="https://www.google.com/recaptcha/enterprise.js?render=6LfZ4H8rAAAAAA0NMVH1C-sCiE9-Vz4obaWy9eUI"
                strategy="afterInteractive"
            />
        </>
    );
}

const msmeChartData = [
    { month: "January", solutions: 0 },
    { month: "February", solutions: 0 },
    { month: "March", solutions: 0 },
    { month: "April", solutions: 0 },
    { month: "May", solutions: 0 },
    { month: "June", solutions: 0 },
];

const msmeChartConfig = {
    solutions: {
        label: "Solutions",
        color: "hsl(var(--chart-3))",
    },
};