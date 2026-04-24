
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "motion/react";
import { io, Socket } from 'socket.io-client';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { any, z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { View, DashboardTab, UserRole, AppUser, BlogPost, EducationProgram, NewsletterSubscriber, Submission, founderRole } from "@/app/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { API_BASE_URL } from "@/lib/api";
import PasswordChangeForm from './password-change-form';
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CommentSection } from "../comment-section";
import { DeleteConfirmationDialog } from '../ui/DeleteConfirmationDialog';
import { useSearchParams } from "next/navigation";
import SubmissionDetailsModal from "./submission-details-modal";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import AdminIncubatorsView from "./admin-incubators-view";
import EventModal from "./event-modal";
import AnimatedList from "@/components/AnimatedList";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip as UserToolTip } from "../ui/tooltip";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SubscriptionDetails } from "../subscription-details/subscription";
import { TestimonialManager } from "./TestimonialManager";
import { TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { title } from "process";
import BlogDashboard from "./blog-dashboard";


const settingsFormSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(35, "Name must not exceed 35 characters"),
    email: z.string().email("Invalid email address"),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const blogPostSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    excerpt: z.string().min(10, "Excerpt must be at least 10 characters"),
    content: z.string().min(50, "Content must be at least 50 characters").max(300, "Content must not exceed 300 characters."),
    image: z.string().url("Please enter a valid image URL"),
    hint: z.string().min(1, "Hint is required"),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

const featureSchema = z.object({
    name: z.string().min(1, "Feature name is required"),
    icon: z.string().min(1, "Icon is required"),
});
const sessionSchema = z.object({
    language: z.string().min(1, "Language is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
});
const programSchema = z.object({
    title: z.string().min(5, "Title is required"),
    description: z.string().min(10, "Description is required").max(5000, "Description must not exceed 5000 characters."),
    sessions: z.array(sessionSchema).min(1, "At least one session is required"),
    features: z.array(featureSchema).min(1, "At least one feature is required"),
});

type ProgramFormValues = z.infer<typeof programSchema>;


type User = { name: string; email: string; userId: string }
type AuthProvider = 'local' | 'google';

interface DashboardViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: User;
    userRole: UserRole;
    founderRole?: founderRole | null;
    authProvider: AuthProvider;
    hasSubscription: boolean;
    setActiveView: (view: View) => void;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    activateTab: string;
    id?: string;
}

interface TechTransferIP {
    id: string;
    ipTitle: string;
    firstName: string;
    lastName: string;
    describetheTech: string;
    summary: string;
    inventorName: string;
    organization: string;
    supportingFile?: string[];
    approvalStatus: string;
    created_by?: number;
}

type GroupedIPs = Record<string, TechTransferIP[]>;

const statusIcons: { [key: string]: React.ReactNode } = {
    'new': <LucideIcons.Clock className="h-4 w-4 text-blue-500" />,
    'under review': <LucideIcons.Clock className="h-4 w-4 text-yellow-500" />,
    'valid': <LucideIcons.CheckCircle className="h-4 w-4 text-green-500" />,
    'duplicate': <LucideIcons.Copy className="h-4 w-4 text-orange-500" />,
    'rejected': <LucideIcons.XCircle className="h-4 w-4 text-red-500" />,
};

interface ChartDataItem {
    year: string;
    activity: number;
}

interface ipDataItem {
    title: string;
    summary: string;
    date: string;
    approvalStatus: string;
}

interface ExistingFile {
    url: string;
    name: string;
}

interface RestoreIP {
    id: string;
    ipTitle: string;
    ip_id: string;
    action_by_user_name?: string;
    organization: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const techTransferSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(20, "First name must not exceed 20 characters"),
    lastName: z.string().min(1, "Last name is required").max(20, "Last name must not exceed 20 characters"),
    ipTitle: z.string().min(1, "IP title is required").max(35, "First name must not exceed 20 characters"),
    summary: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .max(1000, "Description must not exceed 1000 characters"),
    describetheTech: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .max(5000, "Description must not exceed 5000 characters"),
    inventorName: z.string().min(1, "Inventor name is required").max(35, "Inventor Name must not exceed 20 characters"),
    organization: z.string().min(1, "Organization is required").max(100, "Organization Name must not exceed 20 characters"),
    supportingFile: z
        .any()
        .optional()
        .refine(
            (file) => !file || file.size <= MAX_FILE_SIZE,
            "File size must be less than or equal to 10 MB"
        ),
});

type TechTransferFormData = z.infer<typeof techTransferSchema>;

type RegistrationAignite = {
    id: number;
    full_name: string;
    email_address: string;
    phone_number: string;
    who_you_are: string;
    registered_at: string;
};
type connexRegistrations = {
    id: number;
    full_name: string;
    email_address: string;
    phone_number: string;
    who_you_are: string;
    created_at: string;
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


const iconNames = Object.keys(LucideIcons).filter(k => k !== 'createLucideIcon' && k !== 'icons' && k !== 'default');


const formatPrettyDate = (date: Date) => {
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

const timeAgoShort = (date: Date) => {
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

const AnimatedCard = ({
    sub,
    setSelectedSubmission,
    statusBadgeClasses,
    statusLabels,
    statusUpdates1,
    handleSolutionUpdateStatus,
    isUpdating1,
    handleStatusChange
}: {
    sub: Submission;
    setSelectedSubmission: (sub: Submission) => void;
    statusBadgeClasses: Record<string, string>;
    statusLabels: Record<string, string>;
    statusUpdates1: Record<string, any>;
    handleSolutionUpdateStatus: (id: string) => void;
    isUpdating1: Record<string, boolean>;
    handleStatusChange: (id: string, status: any) => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.3, once: true });

    return (
        <motion.div
            ref={ref}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
        >
            <Card
                onClick={() => setSelectedSubmission(sub)}
                className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 cursor-pointer transition-colors"
            >
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1 w-full">
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
                                                {sub.status === SolutionStatus.solution_accepted_points ||
                                                    sub.status === SolutionStatus.winner
                                                    ? "50"
                                                    : "0"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <CardDescription className="flex items-center text-sm text-muted-foreground">
                                {sub.challenge?.postedBy && (
                                    <div className="flex items-center">
                                        <span className="font-medium">{sub.challenge?.postedBy?.companyName || "Untitled Challenge"}</span>
                                        <span className="w-1 h-1 rounded-full bg-foreground/40 inline-block mx-2"></span>
                                    </div>
                                )}
                                <Badge
                                    className={`px-3 py-1 text-xs font-semibold border rounded-sm 
                                ${statusBadgeClasses[sub.status]}`}
                                >
                                    {statusLabels[sub.status]}

                                </Badge>
                                <span className="w-1 h-1 rounded-full bg-foreground/40 inline-block mx-2"></span>
                                <div className="text-sm text-muted-foreground flex items-center">
                                    Submitted {formatPrettyDate(new Date(sub.createdAt))}
                                    {sub.lastActive ? <span className="w-1 h-1 rounded-full bg-foreground/40 inline-block mx-2"></span> : ''}
                                </div>
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
                        {statusUpdates1[sub.solutionId] && (
                            <Button
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSolutionUpdateStatus(sub.solutionId);
                                }}
                                disabled={isUpdating1[sub.solutionId]}
                            >
                                {isUpdating1[sub.solutionId] ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LucideIcons.Save className="mr-2 h-4 w-4" />
                                )}
                                Update Status
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2"
                                >
                                    {statusUpdates1[sub.status]}
                                    <span>{statusLabels[sub.status]}</span>
                                    <LucideIcons.ChevronDown className="ml-2 h-4 w-4" />
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
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const LockedContent = ({ setActiveView, title }: { setActiveView: (view: View) => void, title: string }) => (
    <Card className="mt-0 bg-card/50 backdrop-blur-sm border-border/50 text-center flex flex-col items-center justify-center p-8 min-h-[400px]">
        <LucideIcons.Lock className="h-12 w-12 text-primary mb-4" />
        <CardTitle>{title} Locked</CardTitle>
        <CardDescription className="max-w-md mx-auto mt-2 mb-6">
            This feature is available for subscribers only. Upgrade your plan to unlock full access.
        </CardDescription>
        <Button onClick={() => setActiveView('pricing')} className="bg-accent hover:bg-accent/90 text-accent-foreground">View Pricing Plans <LucideIcons.ArrowRight className="ml-2 h-4 w-4" /></Button>
    </Card>
);

export default function DashboardView({ isOpen, setUser, founderRole, onOpenChange, user, userRole, authProvider, hasSubscription, setActiveView, activateTab, id }: DashboardViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [adminContentTab, setAdminContentTab] = useState('blog');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailChangeRequested, setEmailChangeRequested] = useState(false);
    const [commentingSubmissionId, setCommentingSubmissionId] = useState<string | null>(null);
    const isMobile = useIsMobile();



    // Admin state
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [togglingPlans, setTogglingPlans] = useState<Record<string, boolean>>({});
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [userToBan, setUserToBan] = useState<AppUser | null>(null);
    const [selectedUserForDetails, setSelectedUserForDetails] = useState<AppUser | null>(null);
    const [userDetailsData, setUserDetailsData] = useState<any>(null);
    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);

    // Dashboard stats state
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [newsletterSubscribers, setNewsletterSubscribers] = useState(0);

    // Active pie chart segment indices for legend hover
    const [activeTechTransferIndex, setActiveTechTransferIndex] = useState<number | undefined>(undefined);
    const [activeCollaborationIndex, setActiveCollaborationIndex] = useState<number | undefined>(undefined);
    const [activeSolutionIndex, setActiveSolutionIndex] = useState<number | undefined>(undefined);
    const [activeUserIndex, setActiveUserIndex] = useState<number | undefined>(undefined);
    const [activeEventIndex, setActiveEventIndex] = useState<number | undefined>(undefined);
    const [activePitchTokenIndex, setActivePitchTokenIndex] = useState<number | undefined>(undefined);

    interface Event {
        id: string;
        title: string;
        description: string;
        image_url: string;
        visible: boolean;
        register_enabled: boolean;
        phone: string;
        duration_info: string;
        created_at: string;
        updated_at: string;
    }
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
    const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
    // Event config state
    const [eventConfig, setEventConfig] = useState<{ event_name: string; is_enabled: boolean } | null>(null);
    const [isTogglingEvent, setIsTogglingEvent] = useState(false);
    const [totalRegistrations, setTotalRegistrations] = useState(0);

    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);

    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

    const [educationPrograms, setEducationPrograms] = useState<EducationProgram[]>([]);
    const [editingProgram, setEditingProgram] = useState<EducationProgram | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{ type: 'blog' | 'program'; id: number } | null>(null);
    const [loadingChange, setLoadingChange] = useState(false)
    const [loadingResend, setLoadingResend] = useState(false)

    // Pitching Details State
    interface PitchingDetail {
        id: string;
        user_id: string;
        solution_id: string;
        solution_title: string;
        company_name: string;
        pitch_date: string;
        pitch_time: string;
        requirements: string;
        submitted: boolean;
        founder_name: string;
        created_at: string;
    }
    const [pitchingDetails, setPitchingDetails] = useState<PitchingDetail[]>([]);
    const [isLoadingPitching, setIsLoadingPitching] = useState(false);
    const [selectedPitchIds, setSelectedPitchIds] = useState<string[]>([]);
    const [pitchPage, setPitchPage] = useState(1);
    const [pitchPerPage, setPitchPerPage] = useState(10);
    const [isDeletingPitch, setIsDeletingPitch] = useState(false);
    const [pitchSearchQuery, setPitchSearchQuery] = useState("");
    const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);
    const [isFounderRoleModified, setIsFounderRoleModified] = useState(false);
    const [selectedFounderRole, setSelectedFounderRole] = useState<string>('');

    const searchParams = useSearchParams()

    const settingsForm = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: { name: user.name, email: user.email },
        values: { name: user.name, email: user.email },
    });

    useEffect(() => {
        settingsForm.reset({ name: user.name, email: user.email });
    }, [user, settingsForm]);

    const blogForm = useForm<BlogPostFormValues>({
        resolver: zodResolver(blogPostSchema),
        defaultValues: { title: "", excerpt: "", content: "", image: "https://placehold.co/600x400.png", hint: "" },
    });
    const programForm = useForm<ProgramFormValues>({
        resolver: zodResolver(programSchema),
        defaultValues: { title: "", description: "", sessions: [], features: [] },
    });

    const ttForm = useForm<TechTransferFormData>({
        resolver: zodResolver(techTransferSchema),
        defaultValues: {
            describetheTech: "",
            summary: ""
        }
    }
    )

    const { fields: sessionFields, append: appendSession, remove: removeSession } = useFieldArray({ control: programForm.control, name: "sessions" });
    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({ control: programForm.control, name: "features" });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;
    const [registrations, setRegistrations] = useState<RegistrationAignite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFormUsers, setIsLoadingFormUsers] = useState(false)
    const [perPage] = useState(10);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [statusUpdates1, setStatusUpdates1] = useState<Record<string, SolutionStatus>>({});
    const [isUpdating1, setIsUpdating1] = useState<Record<string, boolean>>({});

    const fetchUsers = useCallback(async (page: number, perPage: number) => {
        setIsLoadingUsers(true);
        const token = localStorage.getItem('token');

        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'No token found. Please log in again.' });
            setIsLoadingUsers(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users?page=${page}&per_page=${perPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                toast({ variant: 'destructive', title: 'Network Error', description: `Failed to fetch users: ${response.status} ${response.statusText}` });
            }

            const data = await response.json();

            setUsers(data.items || []);
            setTotalPages(data.pages || 1);
            setCurrentPage(page);

        } catch (error) {

            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to the server or retrieve data.' });
        } finally {
            setIsLoadingUsers(false);
        }
    }, [toast]);

    const fetchDashboardStats = useCallback(async () => {
        setIsLoadingStats(true);
        const token = localStorage.getItem('token');

        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'No token found. Please log in again.' });
            setIsLoadingStats(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                toast({ variant: 'destructive', title: 'Network Error', description: `Failed to fetch dashboard stats: ${response.status}` });
                setIsLoadingStats(false);
                return;
            }

            const data = await response.json();

            setDashboardStats(data);

            // Extract newsletter subscribers count
            if (data.success && data.newsletter) {
                setNewsletterSubscribers(data.newsletter.total || 0);
            }

        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not fetch dashboard statistics.' });
        } finally {
            setIsLoadingStats(false);
        }
    }, [toast]);

    const fetchEventConfig = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/event-config/aignite`);
            if (response.ok) {
                const data = await response.json();
                setEventConfig(data);
            }
        } catch (error) {
            console.error('Error fetching event config:', error);
        }
    }, []);

    const handleToggleEvent = async () => {
        setIsTogglingEvent(true);
        const token = localStorage.getItem('token');

        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error' });
            setIsTogglingEvent(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/event-config/aignite/toggle`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEventConfig(data.event_config);
                toast({
                    title: 'Success',
                    description: data.message
                });
                fetchDashboardStats();
            } else {
                toast({ variant: 'destructive', title: 'Failed to toggle event' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error' });
        } finally {
            setIsTogglingEvent(false);
        }
    };


    const fetchEvents = useCallback(async () => {
        setIsLoadingEvents(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setIsLoadingEvents(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/events`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not fetch events.' });
        } finally {
            setIsLoadingEvents(false);
        }
    }, [toast]);

    const handleToggleEventField = async (eventId: string, field: 'visible' | 'register_enabled', currentValue: boolean) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [field]: !currentValue })
            });

            if (response.ok) {
                setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, [field]: !currentValue } : ev));
                toast({ title: 'Success', description: `Event ${field === 'visible' ? 'visibility' : 'registration'} updated.` });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update event.' });
            }
        } catch (error) {
            console.error(`Error updating event ${field}:`, error);
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not update event.' });
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setEvents(prev => prev.filter(ev => ev.id !== eventId));
                toast({ title: 'Success', description: 'Event deleted successfully.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete event.' });
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not delete event.' });
        }
    };




    const handlePageChange = (page: number) => {
        fetchUsers(page, itemsPerPage);
    };





    const fetchSubscribers = useCallback(async () => {
        setIsLoadingSubscribers(true);
        const token = localStorage.getItem('token');
        if (!token) { toast({ variant: 'destructive', title: 'Authentication Error' }); setIsLoadingSubscribers(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/api/subscribers`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                setSubscribers(Array.isArray(data) ? data : data.items || data.subscribers || []);
            } else toast({ variant: 'destructive', title: 'Failed to fetch subscribers' });
        } catch (error) { toast({ variant: 'destructive', title: 'Network Error' }); } finally { setIsLoadingSubscribers(false); }
    }, [toast]);

    const [selectedSubscribers, setSelectedSubscribers] = useState<number[]>([]);

    const handleDeleteSubscribers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/subscribers/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: selectedSubscribers }),
            });

            if (!response.ok) throw new Error('Failed to delete subscribers');
            const result = await response.json();

            toast({ title: "Success", description: result.message || 'Selected subscribers deleted successfully' });

            setSubscribers((prev: any) =>
                prev.filter((s: any) => !selectedSubscribers.includes(s.id))
            );
            setSelectedSubscribers([]);
        } catch (err) {
            toast({ title: "Failed to delete selected subscribers", variant: "destructive" });
        }
    };

    const fetchUserDetails = async (userId: string) => {
        setIsLoadingUserDetails(true);
        const token = localStorage.getItem('token');

        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'No token found. Please log in again.' });
            setIsLoadingUserDetails(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const data = await response.json();
            setUserDetailsData(data.user_details);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch user details.' });
            setUserDetailsData(null);
        } finally {
            setIsLoadingUserDetails(false);
        }
    };


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
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            setSubmissions(result.solutions);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could Not Get User Solutions. Please try again later.' });
        }
    }, [toast])

    useEffect(() => {
        getSubmissions()
    }, [getSubmissions])

    useEffect(() => {
        if (submissions.length === 0) return;

        const socket: Socket = io(`${API_BASE_URL}`, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socket.connect();

        submissions.forEach(sub => {
            socket.emit('join_solution', { solutionId: sub.solutionId });
        });

        socket.on('solution_status_updated', (data: any) => {
            setSubmissions(prevSubmissions =>
                prevSubmissions.map(sub =>
                    sub.solutionId === data.solutionId
                        ? {
                            ...sub,
                            status: data.status,
                            points: data.points,
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


    const handleResetSubscribers = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/subscribers/reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast({ title: 'Success', description: 'Subscriber list has been reset.' });
                setSubscribers([]);
            } else {
                toast({ variant: 'destructive', title: 'Failed to reset subscribers' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error' });
        }
    };

    const handleExportCSV = () => {
        if (subscribers.length === 0) {
            toast({ title: 'No Subscribers', description: 'There is no data to export.' });
            return;
        }
        const headers = ['id', 'email', 'subscribed_at'];
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + subscribers.map(s => headers.map(h => (s as any)[h]).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "subscribers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === registrations.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(registrations.map((r) => r.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        setIsDeleting(true);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API_BASE_URL}/api/delete-multiple-aignite`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ ids: selectedIds }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Registrations deleted",
                    description: `${data.deleted_count || selectedIds.length} registration(s) deleted successfully.`,

                });
                setSelectedIds([]);
                fetchRegistrations(0);
            } else {
                toast({
                    title: "Deletion failed",
                    description: data.message || "Unable to delete selected registrations.",
                    variant: "destructive",

                });
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Server error",
                description: "An error occurred while deleting registrations.",
                variant: "destructive",

            });
        } finally {
            setIsDeleting(false);
        }
    };


    const fetchBlogPosts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blog-posts`);
            if (response.ok) setBlogPosts(await response.json());
        } catch (error) { console.error("Failed to fetch blog posts"); }
    }, []);

    const fetchEducationPrograms = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/education-programs`);
            if (response.ok) setEducationPrograms(await response.json());
        } catch (error) { console.error("Failed to fetch education programs"); }
    }, []);
    const [techTransferIps, setTechTransferIps] = useState<TechTransferIP[]>([]);
    const [isLoadingIps, setIsLoadingIps] = useState(false);

    const fetchIps = useCallback(async () => {
        setIsLoadingIps(true);
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error' });
            setIsLoadingIps(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/getIps`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTechTransferIps(data.ips || []);
                return data.ips
            } else {
                toast({
                    variant: 'destructive',
                    description: data.message || 'Something went wrong.',
                    title: 'Failed to fetch IPs'
                });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error' });
        } finally {
            setIsLoadingIps(false);
        }
    }, [toast]);

    const fetchRegistrations = useCallback(async (page: number) => {
        setIsLoadingFormUsers(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/get-aignite?page=${page}&per_page=${perPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json()

            setRegistrations(data.items);
            setTotalPages(data.pages || 1);
            setTotalRegistrations(data.total);
            setCurrentPage(data.page);

            if (!res.ok) {
                toast({
                    variant: 'destructive',
                    description: data.message || 'Something went wrong.',
                    title: 'Failed to fetch Registered Users'
                });
            }

        } catch (err) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to the server or retrieve data.' });
        } finally {
            setIsLoadingFormUsers(false);
        }
    }, [perPage, toast]);

    const [connexRegistrations, setConnexRegistrations] = useState<connexRegistrations[]>([]);

    // const fetchConnex = useCallback(async (page: number) => {
    //     setIsLoadingFormUsers(true);
    //     const token = localStorage.getItem('token');
    //     try {
    //         const res = await fetch(`${API_BASE_URL}/api/get-connex?page=${page}&per_page=${perPage}`, {
    //             headers: { 'Authorization': `Bearer ${token}` }
    //         });
    //         const data = await res.json()

    //         setConnexRegistrations(data.items);
    //         setTotalPages(data.pages || 1);
    //         setTotalRegistrations(data.total);
    //         setCurrentPage(data.page);

    //         if (!res.ok) {
    //             toast({
    //                 variant: 'destructive',
    //                 description: data.message || 'Something went wrong.',
    //                 title: 'Failed to fetch Registered Users'
    //             });
    //         }

    //     } catch (err) {
    //         toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to the server or retrieve data.' });
    //     } finally {
    //         setIsLoadingFormUsers(false);
    //     }
    // }, [perPage, toast]);


    const onPageChange = (page: number) => {
        fetchRegistrations(page)
    };

    const registrationColumns = [
        "Full Name",
        "Email Address",
        "Phone Number",
        "Who You Are",
        "Registered At",
    ];

    const handleExportAigniteCSV = async () => {
        try {
            // Fetch all registrations from backend
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/get-aignite?all=true`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                toast({
                    title: "Export failed",
                    description: "Could not fetch registrations for CSV.",
                    variant: "destructive",
                });
                return;
            }

            const data = await res.json();
            const allRegistrations = data.items;

            if (allRegistrations.length === 0) {
                toast({
                    title: "No data",
                    description: "No registrations to export.",
                    variant: "destructive",
                });
                return;
            }

            // CSV headers
            const headers = ["Full Name", "Email Address", "Phone Number", "WhoYouAre", "Registered At"];

            // Map registrations into rows
            const rows = allRegistrations.map((reg: any) => [
                reg.full_name,
                reg.email_address,
                reg.phone_number,
                reg.who_you_are,
                new Date(reg.registered_at).toLocaleString(),
            ]);

            // Convert to CSV
            const csvContent = [headers, ...rows]
                .map((row) => row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(","))
                .join("\n");

            // Trigger download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `aignite_registrations_all.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast({
                title: "Export failed",
                description: "An error occurred while exporting CSV.",
                variant: "destructive",
            });
        }
    };
    const token = localStorage.getItem("token")
    useEffect(() => {
        const fetchDraft = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/techtransfer/loadDraft`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 404) {
                    setHasDraft(false);
                    return;
                }
                const data = await res.json();
                setHasDraft(true);

            } catch (error) {
                console.error("Error loading draft:", error);
                toast({
                    title: "Error",
                    description: "Internal Server Error",
                    variant: "destructive",
                });
            }
        };

        if (activeTab === "engagements") {
            fetchDraft();
        }
    }, [activeTab, userRole, token, toast]);


    const fetchPitchingDetails = useCallback(async () => {
        setIsLoadingPitching(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/pitching/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPitchingDetails(data.message || data);
            } else {
                toast({ variant: 'destructive', title: 'Failed to fetch pitching details' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error' });
        } finally {
            setIsLoadingPitching(false);
        }
    }, [toast]);


    useEffect(() => {
        if (userRole === 'admin') {
            if (activeTab === 'overview') {
                fetchDashboardStats();
                // Fetch all registrations for pie chart
                const token = localStorage.getItem('token');
                if (token) {
                    fetch(`${API_BASE_URL}/api/get-aignite?all=true`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                        .then(res => res.json())
                        .then(data => setRegistrations(data.items || []))
                        .catch(err => console.error('Error fetching registrations:', err));
                }
            }
            if (activeTab === 'users') fetchUsers(1, 10);
            if (activeTab === 'registration') fetchRegistrations(1);
            // if (activeTab === 'connex') fetchConnex(1);
            if (activeTab === 'blog') fetchBlogPosts();
            if (activeTab === 'sessions') fetchEducationPrograms();
            if (activeTab === 'ip/technologies') fetchIps();
            if (activeTab === 'subscribers') fetchSubscribers();
            if (activeTab === 'pitch-details') fetchPitchingDetails();
            if (activeTab === 'events') fetchEvents();
        }
    }, [activeTab, userRole, fetchUsers, fetchPitchingDetails, fetchBlogPosts, fetchEvents, fetchEducationPrograms, fetchSubscribers, fetchIps, fetchRegistrations, fetchDashboardStats]);


    const togglePitchSelect = (id: string) => {
        setSelectedPitchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAllPitch = () => {
        if (selectedPitchIds.length === paginatedPitchingDetails.length) {
            setSelectedPitchIds([]);
        } else {
            setSelectedPitchIds(paginatedPitchingDetails.map(p => p.id));
        }
    };

    const handleDeletePitching = async () => {
        if (selectedPitchIds.length === 0) return;
        setIsDeletingPitch(true);
        const token = localStorage.getItem('token');

        try {
            // Delete sequentially or parallel
            await Promise.all(selectedPitchIds.map(id =>
                fetch(`${API_BASE_URL}/api/pitching/delete/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ));

            toast({ title: "Success", description: "Selected pitching details deleted." });
            setSelectedPitchIds([]);
            fetchPitchingDetails();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete some items." });
        } finally {
            setIsDeletingPitch(false);
        }
    };

    // Pagination logic for Pitching Details
    const totalPitchPages = Math.ceil(pitchingDetails.length / pitchPerPage);
    const paginatedPitchingDetails = pitchingDetails.slice(
        (pitchPage - 1) * pitchPerPage,
        pitchPage * pitchPerPage
    );



    const handleApiResponse = async (response: Response, successMessage: string, errorMessage: string) => {
        if (response.ok) {
            toast({ title: 'Success', description: successMessage });
            await fetchUsers(1, 10);
        } else {
            const data = await response.json();
            toast({ variant: 'destructive', title: errorMessage, description: data.error });
        }
    };

    const handleDeleteUser = async (userId: string) => handleApiResponse(await fetch(`${API_BASE_URL}/api/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }), 'User deleted successfully.', 'Deletion Failed');
    const handleToggleBanUser = async (userId: string) => handleApiResponse(await fetch(`${API_BASE_URL}/api/users/${userId}/toggle-ban`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }), 'User status updated.', 'Update Failed');

    const handleTogglePlan = async (userId: string, planName: string, currentStatus: boolean) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }

        const key = `${userId}-${planName}`;
        setTogglingPlans((prev: Record<string, boolean>) => ({ ...prev, [key]: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/activate-free-plan`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: userId,
                    plan_name: planName,
                    is_active: !currentStatus
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast({
                    title: "Success",
                    description: `Plan ${planName} ${!currentStatus ? 'activated' : 'revoked'} for user.`
                });

                setUsers(prevUsers => prevUsers.map(u => {
                    if (u.uid === userId) {
                        const updatedPlans = !currentStatus
                            ? [...(u.active_plans || []), planName]
                            : (u.active_plans || []).filter(p => p !== planName);
                        return { ...u, active_plans: updatedPlans };
                    }
                    return u;
                }));
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: data.message || "Failed to update plan."
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An error occurred while toggling the plan."
            });
        } finally {
            setTogglingPlans((prev: Record<string, boolean>) => ({ ...prev, [key]: false }));
        }
    };



    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post);
        blogForm.reset(post);
        setAdminContentTab('blogCreate');
    };

    const handleEditProgram = (program: EducationProgram) => {
        setEditingProgram(program);
        programForm.reset(program);
        setAdminContentTab('sessionCreate');
    };

    const cancelEdit = () => {
        setEditingPost(null);
        setEditingProgram(null);
        blogForm.reset({ title: "", excerpt: "", content: "", image: "https://placehold.co/600x400.png", hint: "" });
        programForm.reset({ title: "", description: "", sessions: [], features: [] });
    }

    const onBlogSubmit = async (data: BlogPostFormValues) => {
        const url = editingPost
            ? `${API_BASE_URL}/api/blog-posts/${editingPost.id}`
            : `${API_BASE_URL}/api/blog-posts`;
        const method = editingPost ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            toast({ title: `Blog Post ${editingPost ? 'Updated' : 'Created'}` });
            blogForm.reset();
            setEditingPost(null);
            await fetchBlogPosts();
            localStorage.setItem('blogs-updated', Date.now().toString());
            setAdminContentTab('blogView');
        } else {
            toast({ variant: 'destructive', title: `Failed to ${editingPost ? 'update' : 'create'} post` });
        }
    };

    const onProgramSubmit = async (data: ProgramFormValues) => {
        const url = editingProgram
            ? `${API_BASE_URL}/api/education-programs/${editingProgram.id}`
            : `${API_BASE_URL}/api/education-programs`;
        const method = editingProgram ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            toast({ title: `Education Program ${editingProgram ? 'Updated' : 'Created'}` });
            programForm.reset();
            setEditingProgram(null);
            await fetchEducationPrograms();
            setAdminContentTab('sessionView');
        } else {
            toast({ variant: 'destructive', title: `Failed to ${editingProgram ? 'update' : 'create'} program` });
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;

        const { type, id } = itemToDelete;
        const url = type === 'blog' ? `${API_BASE_URL}/api/blog-posts/${id}` : `${API_BASE_URL}/api/education-programs/${id}`;

        const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (response.ok) {
            toast({ title: 'Success', description: `${type === 'blog' ? 'Blog post' : 'Program'} deleted successfully.` });
            if (type === 'blog') fetchBlogPosts();
            else fetchEducationPrograms();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete ${type}.` });
        }
        setItemToDelete(null);
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

        try {
            // ⚠️ Separate email from other profile fields
            const { name, email } = data;

            // 1. If user changed email, start the email-change flow
            if (email && email !== user?.email) {
                await handleChangeEmail(email);
                // Do NOT update localStorage here – wait until verification
            }

            if (name) {
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
                    toast({ title: "Settings Saved", description: result.message });

                    localStorage.setItem('user', JSON.stringify({
                        ...user,
                        ...result.user
                    }));
                    setUser((prev) => ({ ...prev, ...result.user }));
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Update Failed',
                        description: result.error || 'An unknown error occurred.'
                    });
                }
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Network Error',
                description: 'Could not save settings. Please try again later.'
            });
        }
    }

    async function handleChangeEmail(email: string) {
        try {
            setLoadingChange(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/request-email-change`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ new_email: email }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast({
                    title: "Success",
                    description: `Verification email sent to ${email}. Please confirm to complete the change.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: data.message || data.error || "Failed to send verification email.",
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setLoadingChange(false);
        }
    }

    async function handleResendEmail(email: string) {
        try {
            setLoadingResend(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/request-email-change`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ new_email: email }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast({
                    title: "Success",
                    description: `Resent verification email to ${email}.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: data.message || data.error || "Failed to resend verification email.",
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setLoadingResend(false);
        }
    }

    const deleteSubmission = async (
        id: string | number,
        setMySubmissions: React.Dispatch<React.SetStateAction<any[]>>
    ) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/techtransfer/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete submission");
            }
            setMySubmissions((prev) => prev.filter((s) => s.id !== id));
            // fetchIps() // Function not defined - relying on state update instead
            toast({ title: "success", description: "Submission deleted successfully" });
        } catch (error: any) {
            toast({ title: "error", description: "Failed to delete submission" });
        } finally {
            fetchIps()
        }
    };

    const [isTechTransfer, setIsTechTransfer] = useState(false)
    const [isipOverview, setisipOverview] = useState(false)

    useEffect(() => {
        const founder_role = founderRole;
        if (founder_role === "List a technology for licensing") {
            setIsTechTransfer(true);
            setisipOverview(true)
        } else {
            setIsTechTransfer(false)
            setisipOverview(false)
        }
    }, [founderRole]);
    // const adminTabs = ["overview", "users", "ip/technologies", "testimonials", "registration", "engagement", "blog", "sessions", "subscribers", "plans", "pitch-details", "events", "settings"];
    const adminTabs = [
        // Group 1
        "overview",
        "users",
        "incubators",
        "testimonials",
        "divider1",  // First divider after first group
        // Group 2

        "engagement",
        "ip/technologies",
        "pitch-details",
        "divider2",  // Second divider after first group

        // Group 4
        "subscribers",
        "plans",
        "divider3",  // Third divider after second group

        // Group 5
        "registration",
        "events",

        "divider4",  // Fourth divider after fifth group
        "blog",
        "sessions",

        "divider5",
        "settings", // Third divider after third group
    ];
    const pendingApprovalCount = users.filter(u => u.status === 'pending').length;

    const [techtransferData, setTechtransferData] = useState<{
        ipTitle: string;
        firstName: string;
        lastName: string;
        description: string;
        inventorName: string;
        organization: string;
        supportingFile: File | null;
    }>({
        ipTitle: "",
        firstName: "",
        lastName: "",
        description: "",
        inventorName: "",
        organization: "",
        supportingFile: null,
    });
    const techTransferFile = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        techTransferFile.current!.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setTechtransferData({
                ...techtransferData,
                supportingFile: e.target.files[0],
            });
        }
    };

    const handleTechTransferSubmit = async (
        data: TechTransferFormData
    ) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value) {
                if (key === "supportingFile" && value instanceof File) {
                    formData.append(key, value);
                } else if (typeof value === "string") {
                    formData.append(key, value);
                }
            }
        });
        formData.append("contactEmail", user.email);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/techtransfer`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });


            if (res.ok) {
                toast({
                    title: "Submission successful",
                    description: "Your IP has been submitted for review.",
                });

                ttForm.reset();
                if (techTransferFile.current) techTransferFile.current.value = "";
            } else {
                toast({
                    title: "Submission failed",
                    description: "Please try again later.",
                    variant: "destructive",
                });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            toast({
                title: "Error occurred",
                description: message,
                variant: "destructive",
            });
        }
    };
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setTechtransferData({
            ...techtransferData,
            [name]: value,
        });
    };

    const [mySubmissions, setMySubmissions] = useState<TechTransferIP[]>([]);

    const [loading, setLoading] = useState(false);
    const [emptyToastShown, setEmptyToastShown] = useState(false);

    useEffect(() => {
        const fetchMySubmissions = async () => {
            setLoading(true);
            setEmptyToastShown(false);
            try {

                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE_URL}/api/techtransfer/my-ips`, {
                    headers: {
                        Authorization: `Bearer ${token || ""}`,
                    },
                });

                const data = await res.json();

                if (res.ok) {
                    setMySubmissions(data.ips);

                } else {
                    setMySubmissions([]);
                    toast({
                        title: "Failed to load submissions",
                        description: data.error || "Please try again later.",
                        variant: "destructive",
                    });
                }
            } catch (err: any) {
                setMySubmissions([]);
                toast({
                    title: "Error occurred",
                    description: err.message || "Unable to fetch submissions.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        if (activeTab === "submission") {
            fetchMySubmissions();
        }
    }, [activeTab, toast]);

    const handleStatusChange = (id: string, newStatus: SolutionStatus) => {
        setStatusUpdates1((prev) => ({ ...prev, [id]: newStatus }));
        setSubmissions((prev) =>
            prev.map((item) =>
                item.solutionId === id ? { ...item, status: newStatus } : item
            )
        );
    };

    const handleSolutionUpdateStatus = async (id: string) => {
        const newStatus = statusUpdates1[id];
        if (!newStatus) return;

        setIsUpdating1((prev) => ({ ...prev, [id]: true }));

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

            setStatusUpdates1((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

        } finally {
            setIsUpdating1((prev) => ({ ...prev, [id]: false }));
        }
    };


    const useGroupedIps = (techTransferIps: TechTransferIP[]) => {
        const [groupedIps, setGroupedIps] = useState<Record<string, TechTransferIP[]>>({});
        const [statusUpdates, setStatusUpdates] = useState<Record<string, "approved" | "rejected" | "needInfo">>({});
        const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

        useEffect(() => {
            if (techTransferIps.length > 0) {
                const groups = techTransferIps.reduce((acc, ip) => {
                    const orgName = ip.organization;
                    if (!acc[orgName]) {
                        acc[orgName] = [];
                    }
                    const updatedIp = {
                        ...ip,
                        approvalStatus: statusUpdates[ip.id] || ip.approvalStatus,
                    };

                    acc[orgName].push(updatedIp);
                    return acc;
                }, {} as Record<string, TechTransferIP[]>);

                setGroupedIps(groups);
            } else {
                setGroupedIps({});
            }
        }, [techTransferIps, statusUpdates]);

        // Real-time socket listener for IP status updates
        useEffect(() => {
            if (techTransferIps.length === 0) return;

            const socket: Socket = io(`${API_BASE_URL}`, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });

            techTransferIps.forEach(ip => {
                socket.emit('join', `ip_${ip.id}`);
            });

            socket.on('ip_status_updated', (data: { id: string; approvalStatus: string; ipTitle: string }) => {
                setTechTransferIps(prev =>
                    prev.map(ip =>
                        ip.id === data.id
                            ? { ...ip, approvalStatus: data.approvalStatus as TechTransferIP['approvalStatus'] }
                            : ip
                    )
                );
            });

            return () => {
                techTransferIps.forEach(ip => socket.emit('leave', `ip_${ip.id}`));
                socket.off('ip_status_updated');
                socket.disconnect();
            };
        }, [techTransferIps.length]); // eslint-disable-line react-hooks/exhaustive-deps

        const handleActionClick = (ipId: string, newStatus: "approved" | "rejected" | "needInfo") => {
            setStatusUpdates((prev) => ({
                ...prev,
                [ipId]: newStatus,
            }));
        };

        const handleUpdateStatus = async (ipId: string) => {
            const newStatus = statusUpdates[ipId];

            if (!newStatus) return;

            setIsUpdating((prev) => ({ ...prev, [ipId]: true }));

            try {
                const token = localStorage.getItem('token')

                const response = await fetch(`${API_BASE_URL}/api/techtransfer/${ipId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!response.ok) {

                    toast({ title: "error", description: "Failed to get TechTransferIps" });
                }
                if (response.ok) {

                    setTechTransferIps(prev => prev.map(ip => ip.id === ipId ? { ...ip, approvalStatus: newStatus } : ip));
                    toast({ title: "Success", description: "IP status updated successfully." });

                }
                setStatusUpdates((prev) => {
                    const newUpdates = { ...prev };
                    delete newUpdates[ipId];
                    return newUpdates;
                });

            } catch (error) {

                toast({ title: "error", description: "Failed to update status" });

                setStatusUpdates((prev) => {
                    const newUpdates = { ...prev };
                    delete newUpdates[ipId];
                    return newUpdates;
                });
            } finally {
                setIsUpdating((prev) => {
                    const newUpdating = { ...prev };
                    delete newUpdating[ipId];
                    return newUpdating;
                });
            }
        };

        return { groupedIps, setGroupedIps, statusUpdates, handleActionClick, handleUpdateStatus, isUpdating };
    };
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [ipData, setIpData] = useState<ipDataItem[]>([]);
    const [summary, setSummary] = useState("");
    const maxChars = 1000;
    const summaryValue = ttForm.watch("summary") || "";


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (isipOverview) {
            fetch(`${API_BASE_URL}/api/techtransfer/myGraph`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.error) {
                        toast({ title: "Error", description: data.error, variant: "destructive" })
                        return
                    }
                    const formattedData = data.ips.map((item: any) => ({
                        year: item.year.toString(),
                        activity: item.total_submissions,
                    }));

                    const formatedIpsDetails = data.ips_details.map((item: any) => ({
                        title: item.title,
                        summary: item.summary,
                        date: item.date,
                        approvalStatus: item.approval_status
                    }))

                    setIpData(formatedIpsDetails)

                    const START_YEAR = 2023;
                    const TOTAL_YEARS = 5;

                    const baseData = Array.from({ length: TOTAL_YEARS }, (_, i) => {
                        const year = (START_YEAR + i).toString();
                        return {
                            year: year,
                            activity: 0
                        };
                    });

                    const finalChartData = baseData.map((baseItem: ChartDataItem) => {
                        const match = formattedData.find((item: ChartDataItem) => item.year === baseItem.year);

                        if (match) {
                            return {
                                ...baseItem,
                                activity: match.activity
                            };
                        }
                        return baseItem;
                    });
                    setChartData(finalChartData);
                });
        }

    }, [toast, isipOverview]);


    const [expandedAccordion, setExpandedAccordion] = useState<string | undefined>(undefined);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const tabFromUrl = searchParams.get('id') as DashboardTab | null;
        if (tabFromUrl && (userRole == "admin")) {
            setActiveTab('ip/technologies');
        }
    }, [searchParams, userRole]);
    const { groupedIps, setGroupedIps, statusUpdates, handleActionClick, handleUpdateStatus, isUpdating } = useGroupedIps(techTransferIps)

    useEffect(() => {
        if (activateTab === 'ip/technologies') {
            const role = userRole
            if (role === "admin") {
                fetchIps()
                    .then((ips: any) => {
                        if (!Array.isArray(ips)) {
                            toast({ title: "error", description: "Ips not found", variant: "destructive" });
                        }
                        const grouped: Record<string, any[]> = {};
                        ips.forEach((ip: any) => {
                            const orgName = ip.organization?.trim() || 'Unknown Organization';
                            if (!grouped[orgName]) grouped[orgName] = [];
                            grouped[orgName].push(ip);
                        });
                        setGroupedIps(grouped);
                        if (id) {
                            const orgName = Object.keys(grouped).find((org) =>
                                grouped[org].some((ip) => ip.id === id)
                            );
                            if (!orgName) {
                                toast({
                                    title: "IP Not Found",
                                    description: `No IP record found matching ID: ${id}`,
                                    variant: "destructive",
                                });
                            }
                            if (orgName) {
                                const accordionValue = `org-${orgName}`;
                                setExpandedAccordion(accordionValue);
                                setTimeout(() => {
                                    const el = document.getElementById(id);
                                    if (el) {
                                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                                        setHighlightedId(id);
                                    }

                                }, 600);
                            }
                        }
                    })
                    .catch((err) => toast({ title: "error", description: "Failed to fetch Ips", variant: "destructive" }));
            }
        }
    }, [activateTab, id, fetchIps, toast, setGroupedIps, userRole]);

    const [hasDraft, setHasDraft] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [existingFile, setExistingFile] = useState<ExistingFile | null>(null);


    const handleLoadDraft = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/techtransfer/getDraft`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            const fileUrl = data.supportingFile;
            const fileName = fileUrl ? fileUrl.split("/").pop().split("?")[0] : null;
            if (res.ok) {
                ttForm.setValue("ipTitle", data.ipTitle);
                ttForm.setValue("describetheTech", data.describetheTech);
                ttForm.setValue("summary", data.summary);
                ttForm.setValue("inventorName", data.inventorName);
                ttForm.setValue("organization", data.organization);
                ttForm.setValue("firstName", data.firstName);
                ttForm.setValue("lastName", data.lastName);
                ttForm.setValue("supportingFile", data.supportingFile);
                if (fileUrl && fileName) setExistingFile({ url: fileUrl, name: fileName });
                setHasDraft(false)
            } else {
                toast({ title: "error", description: "No draft found", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Error loading draft", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };


    const handleSaveDraft = async () => {
        setLoading(true);
        const formData = new FormData();

        formData.append("ipTitle", ttForm.getValues("ipTitle"));
        formData.append("describetheTech", ttForm.getValues("describetheTech"));
        formData.append("summary", ttForm.getValues("summary"));
        formData.append("inventorName", ttForm.getValues("inventorName"));
        formData.append("organization", ttForm.getValues("organization"));
        formData.append("firstName", ttForm.getValues("firstName"));
        formData.append("lastName", ttForm.getValues("lastName"));
        formData.append("contactEmail", user.email);
        const file = ttForm.getValues("supportingFile");
        if (file) {
            formData.append("supportingFile", file);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/techtransfer/saveDraft`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            ttForm.reset()
            if (res.ok) {
                toast({ title: "Saved Successfully", description: "Draft saved successfully!" });
                setHasDraft(true);
            } else {
                toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "Error", description: "Error saving draft", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const [activeSubTab, setActiveSubTab] = useState("ip/technologies");
    const [restoreIps, setRestoreIps] = useState<RestoreIP[]>([]);
    const [isLoadingRestoreIps, setIsLoadingRestoreIps] = useState(false);

    const fetchRestoreIps = useCallback(async () => {
        try {
            setIsLoadingRestoreIps(true);
            const res = await fetch(`${API_BASE_URL}/api/techtransfer/restore`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const restoreIp = await res.json();
            if (Array.isArray(restoreIp)) {
                setRestoreIps(restoreIp);
            } else {
                setRestoreIps([]);
            }
            if (!res.ok) toast({
                title: "Fetch failed",
                description: "Failed to fetch restore IPs",
                variant: "destructive",
            });
        } catch (err) {
            toast({
                title: "Failed",
                description: "Failed to load deleted IP submissions.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingRestoreIps(false);
        }
    }, [toast, token]
    )


    const handleRestore = async (restoreId: any) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/techtransfer/restore/${restoreId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.ok) {
                toast({
                    title: "Restored successfully!",
                    description: "The IP record has been restored and moved back to active submissions.",
                });
                setRestoreIps((prev) => prev.filter((ip: any) => ip.restore_id !== restoreId));
                fetchRestoreIps()
            } else {
                toast({
                    title: "Restore failed",
                    description: "There was an issue restoring this IP. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Error restoring IP:", err);
            toast({
                title: "Server error",
                description: "Failed to connect to the server.",
                variant: "destructive",
            });
        }
    };

    const handleFounderRoleChange = (value: string) => {
        setSelectedFounderRole(value);
        setIsFounderRoleModified(true);
    };

    const handleRoleUpdate = async (newRole: string) => {
        if (!selectedUserForDetails) return;

        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }

        try {
            setIsUpdatingRole(true);

            // If updating founder role, make sure we have a selected founder role
            const founderRoleToUpdate = newRole === 'founder' ? selectedFounderRole : null;

            const response = await fetch(`${API_BASE_URL}/api/users/${selectedUserForDetails.uid}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: newRole,
                    founder_role: founderRoleToUpdate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user role');
            }

            // Update the local state
            const updatedData = {
                ...userDetailsData,
                role: newRole,
                ...(newRole === 'founder' && { founder_role: selectedFounderRole })
            };
            setUserDetailsData(updatedData);

            // Also update the users list
            setUsers(users.map(user =>
                user.uid === selectedUserForDetails.uid
                    ? {
                        ...user,
                        role: newRole as UserRole,
                        founder_role: newRole === 'founder' ? (selectedFounderRole as founderRole) : user.founder_role
                    }
                    : user
            ));

            // Reset the modified state
            setIsFounderRoleModified(false);

            toast({
                title: "Success",
                description: `User role updated to ${newRole}${newRole === 'founder' ? ` (${selectedFounderRole})` : ''}`
            });
        } catch (error) {
            console.error('Error updating user role:', error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to update user role"
            });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    useEffect(() => {
        if (userDetailsData?.founder_role) {
            setSelectedFounderRole(userDetailsData.founder_role);
        } else {
            setSelectedFounderRole('');
        }
        setIsFounderRoleModified(false);
    }, [userDetailsData]);
    const [userToReset, setUserToReset] = useState<string | null>(null);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    // Update the handleResetRole function
    const handleResetRole = (userId: string) => {
        setUserToReset(userId);
        setIsResetDialogOpen(true);
    };
    const confirmResetRole = async () => {
        if (!userToReset) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/reset-role/${userToReset}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to reset role');
            }
            setUsers(users.map((user: any) =>
                user.uid === userToReset
                    ? { ...user, role: null, founder_role: null }
                    : user
            ));
            toast({
                title: "Success",
                description: "User role has been reset successfully",
                variant: "default",
            });

        } catch (error) {
            console.error('Error resetting role:', error);
            toast({
                title: "Error",
                description: "Failed to reset user role",
                variant: "destructive",
            });
        } finally {
            setIsResetDialogOpen(false);
            setUserToReset(null);
        }
    };

    useEffect(() => {
        if (activeSubTab === "restoreips") {
            fetchRestoreIps();
        }
    }, [activeSubTab, fetchRestoreIps]);

    useEffect(() => {
        if (activeSubTab === "ip/technologies" && userRole === "admin") {
            fetchIps()
        }
    }, [activeSubTab, fetchIps, userRole])

    useEffect(() => {
        if (userRole === "admin") {
            fetchEventConfig();
        }
    }, [userRole, fetchEventConfig]);

    useEffect(() => {
        const pendingTab = localStorage.getItem("pendingTab");
        if (pendingTab) {
            setActiveTab(pendingTab as DashboardTab);
            localStorage.removeItem("pendingTab");
        }
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className={cn("sm:max-w-6xl flex flex-col rounded-lg p-0", isMobile ? "h-[90vh]" : "h-[90vh]")}>
                {!isMobile && (
                    <DialogHeader className="p-6 shrink-0">
                        <DialogTitle className="text-3xl font-bold font-headline capitalize">
                            {userRole} Dashboard
                        </DialogTitle>
                        <DialogDescription>
                            Welcome back, {user.name}! Here&apos;s an overview of your startup journey.
                        </DialogDescription>
                    </DialogHeader>
                )}
                <div className="flex-grow flex min-h-0 overflow-hidden min-w-0">
                    <SidebarProvider defaultOpen={isSidebarMinimized}>
                        <Tabs value={activeTab} className="flex flex-grow min-h-0 min-w-0">
                            {/* Vertical Collapsible Sidebar */}
                            <Sidebar collapsible="icon" className="border-r border-border">
                                <SidebarHeader className="h-14 flex items-start relative right-0 justify-start border-b border-border/50">
                                    <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-accent-foreground" />
                                </SidebarHeader>
                                <SidebarContent className="p-2 overflow-y-auto group-data-[state=expanded]:overflow-y-auto group-data-[state=collapsed]:overflow-hidden scrollbar-hide">
                                    <SidebarGroup>
                                        <SidebarGroupContent>
                                            <SidebarMenu>
                                                {adminTabs.map((tab, index) => {
                                                    if (tab.startsWith('divider')) {
                                                        return <div key={tab} className="h-px w-full bg-border/50 my-1" />;
                                                    }
                                                    const iconMap: Record<DashboardTab | string, keyof typeof LucideIcons> = {
                                                        overview: "LayoutDashboard",
                                                        users: "Users",
                                                        "ip/technologies": "FileSignature",
                                                        registration: "Zap",
                                                        engagement: "Handshake",
                                                        plans: "Crown",
                                                        "pitch-details": "Presentation",
                                                        settings: "Settings",
                                                        msmes: "Briefcase",
                                                        incubators: "Lightbulb",
                                                        mentors: "Users",
                                                        submission: "FileText",
                                                        blog: "BookOpen",
                                                        sessions: "GraduationCap",
                                                        subscribers: "Mail",
                                                        events: "Calendar",
                                                        testimonials: "FileText",
                                                    };

                                                    const iconName = iconMap[tab as DashboardTab] || "HelpCircle";
                                                    const Icon = (LucideIcons[iconName] || LucideIcons.HelpCircle) as React.ComponentType<LucideProps>;

                                                    return (
                                                        <SidebarMenuItem key={tab} className="relative right-2">
                                                            <SidebarMenuButton
                                                                isActive={activeTab === tab}
                                                                onClick={() => {
                                                                    if (tab === 'blog') { window.open('/blogger', '_blank'); return; }
                                                                    setActiveTab(tab as DashboardTab);
                                                                }}
                                                                tooltip={tab}
                                                                className={`capitalize transition-all ${activeTab === tab
                                                                    ? "bg-primary text-primary-foreground shadow-sm group-data-[state=collapsed]:rounded-l-2xl group-data-[state=collapsed]:rounded-r-none group-data-[state=collapsed]:ml-1"
                                                                    : ""
                                                                    }`}
                                                            >
                                                                <Icon className="h-5 w-5" />
                                                                <span>{tab}</span>
                                                            </SidebarMenuButton>
                                                        </SidebarMenuItem>
                                                    );
                                                })}
                                            </SidebarMenu>
                                        </SidebarGroupContent>
                                    </SidebarGroup>
                                </SidebarContent>
                                <SidebarFooter className="p-4 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="
                                            h-8 w-8
                                            rounded-full bg-accent
                                            flex items-center justify-center
                                            text-accent-foreground font-bold
                                            relative
                                            group-data-[state=collapsed]:h-4
                                            group-data-[state=collapsed]:w-4
                                            group-data-[state=collapsed]:p-4
                                            group-data-[state=collapsed]:right-2
                                        "
                                        >
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col min-w-0 group-data-[state=collapsed]:hidden">
                                            <span className="text-sm font-medium truncate">{user.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                        </div>
                                    </div>
                                </SidebarFooter>
                            </Sidebar>

                            {/* Main Content Area */}
                            <SidebarInset className="flex-grow flex flex-col min-w-0 min-h-0 bg-background/50">
                                {/* Mobile Header with Trigger */}
                                <div className="md:hidden flex items-center h-14 border-b border-border bg-muted/30 px-4 py-12 rounded-lg">
                                    <SidebarTrigger className="h-9 w-9" />
                                    <span className="ml-4 font-bold capitalize">{activeTab}</span>
                                </div>
                                <div className={cn("flex-grow overflow-y-auto scrollbar-hide pb-6 w-full min-w-0", isMobile ? "px-4 pt-4" : "px-6")} >
                                    <TabsContent value="plans" className="mt-0 outline-none">
                                        <PlansManagementView />
                                    </TabsContent>
                                    <TabsContent value="incubators" className="mt-0 outline-none">
                                        <AdminIncubatorsView />
                                    </TabsContent>
                                    <TabsContent value="overview" className="mt-0 space-y-6">
                                        {userRole === 'admin' && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
                                                    {/* Users Pie Chart */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Users</CardTitle>
                                                            <CardDescription>Role breakdown</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : dashboardStats?.users ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={dashboardStats.users.total === 0 ? [{ name: 'No data', value: 1 }] : Object.entries(dashboardStats.users.by_role).filter(([_, count]) => (count as number) > 0).map(([role, count]) => ({
                                                                                        name: role.replace(/_/g, ' '),
                                                                                        value: count as number
                                                                                    }))}
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activeUserIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}
                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {dashboardStats.users.total === 0 ? (
                                                                                        <Cell fill="#e5e7eb" />
                                                                                    ) : (
                                                                                        Object.keys(dashboardStats.users.by_role).map((role, index) => {
                                                                                            const colors: Record<string, string> = {
                                                                                                'founder': '#8b5cf6',
                                                                                                'msme': '#ec4899',
                                                                                                'mentor': '#14b8a6',
                                                                                                'incubator': '#f97316',
                                                                                                'admin': '#6366f1'
                                                                                            };
                                                                                            return <Cell key={`cell-${index}`} fill={colors[role] || '#6366f1'} />;
                                                                                        })
                                                                                    )}
                                                                                </Pie>
                                                                                {dashboardStats.users.total > 0 && (
                                                                                    <Tooltip
                                                                                        contentStyle={{
                                                                                            borderRadius: 12,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 pointer-events-none">
                                                                            <p className="text-3xl font-bold">{dashboardStats.users.total}</p>
                                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">Total Users</p>
                                                                        </div>
                                                                    </div>
                                                                    {dashboardStats.users.total > 0 && (
                                                                        <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                                                            {Object.entries(dashboardStats.users.by_role).map(([role, count], index) => (
                                                                                <div
                                                                                    key={role}
                                                                                    className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100"
                                                                                    style={{ opacity: activeUserIndex === undefined || activeUserIndex === index ? 1 : 0.6 }}
                                                                                    onMouseEnter={() => setActiveUserIndex(index)}
                                                                                    onMouseLeave={() => setActiveUserIndex(undefined)}
                                                                                >
                                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                                        backgroundColor: {
                                                                                            'founder': '#8b5cf6',
                                                                                            'msme': '#ec4899',
                                                                                            'mentor': '#14b8a6',
                                                                                            'incubator': '#f97316',
                                                                                            'admin': '#6366f1'
                                                                                        }[role] || '#6366f1'
                                                                                    }} />
                                                                                    <span className="text-sm capitalize">{role.replace(/_/g, ' ')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Challenge Pie Chart */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Challenge</CardTitle>
                                                            <CardDescription>Status breakdown</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : dashboardStats?.collaborations ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={dashboardStats.collaborations.total === 0 ? [{ name: 'No data', value: 1 }] : Object.entries(dashboardStats.collaborations.by_status).filter(([_, count]) => (count as number) > 0).map(([status, count]) => ({
                                                                                        name: status.replace(/_/g, ' '),
                                                                                        value: count as number
                                                                                    }))}
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activeCollaborationIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}
                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {dashboardStats.collaborations.total === 0 ? (
                                                                                        <Cell fill="#e5e7eb" />
                                                                                    ) : (
                                                                                        Object.keys(dashboardStats.collaborations.by_status).map((status, index) => {
                                                                                            const colors: Record<string, string> = {
                                                                                                'active': '#10b981',
                                                                                                'completed': '#6366f1',
                                                                                                'stopped': '#f59e0b',
                                                                                                'expired': '#ef4444'
                                                                                            };
                                                                                            return <Cell key={`cell-${index}`} fill={colors[status] || '#6366f1'} />;
                                                                                        })
                                                                                    )}
                                                                                </Pie>
                                                                                {dashboardStats.collaborations.total > 0 && (
                                                                                    <Tooltip
                                                                                        contentStyle={{
                                                                                            borderRadius: 12,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 pointer-events-none">
                                                                            <p className="text-3xl font-bold">{dashboardStats.collaborations.total}</p>
                                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">Total Challenges</p>
                                                                        </div>
                                                                    </div>
                                                                    {dashboardStats.collaborations.total > 0 && (
                                                                        <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                                                            {Object.entries(dashboardStats.collaborations.by_status).map(([status, count], index) => (
                                                                                <div
                                                                                    key={status}
                                                                                    className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100"
                                                                                    style={{ opacity: activeCollaborationIndex === undefined || activeCollaborationIndex === index ? 1 : 0.6 }}
                                                                                    onMouseEnter={() => setActiveCollaborationIndex(index)}
                                                                                    onMouseLeave={() => setActiveCollaborationIndex(undefined)}
                                                                                >
                                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                                        backgroundColor: {
                                                                                            'active': '#10b981',
                                                                                            'completed': '#6366f1',
                                                                                            'stopped': '#f59e0b',
                                                                                            'expired': '#ef4444'
                                                                                        }[status] || '#6366f1'
                                                                                    }} />
                                                                                    <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Solutions Pie Chart */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Solutions</CardTitle>
                                                            <CardDescription>Status breakdown</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : dashboardStats?.solutions ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={dashboardStats.solutions.total === 0 ? [{ name: 'No data', value: 1 }] : Object.entries(dashboardStats.solutions.by_status).map(([status, count]) => ({
                                                                                        name: status.replace(/_/g, ' '),
                                                                                        value: count as number
                                                                                    }))}
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activeSolutionIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}
                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {dashboardStats.solutions.total === 0 ? (
                                                                                        <Cell fill="#e5e7eb" />
                                                                                    ) : (
                                                                                        Object.keys(dashboardStats.solutions.by_status).map((status, index) => {
                                                                                            const colors: Record<string, string> = {
                                                                                                'new': '#3b82f6',
                                                                                                'under_review': '#f59e0b',
                                                                                                'duplicate': '#a855f7',
                                                                                                'rejected': '#ef4444',
                                                                                                'solution_accepted_points': '#10b981',
                                                                                                'triaged': '#f97316',
                                                                                                'need_info': '#06b6d4',
                                                                                                'winner': '#eab308'
                                                                                            };
                                                                                            return <Cell key={`cell-${index}`} fill={colors[status] || '#6366f1'} />;
                                                                                        })
                                                                                    )}
                                                                                </Pie>
                                                                                {dashboardStats.solutions.total > 0 && (
                                                                                    <Tooltip contentStyle={{
                                                                                        borderRadius: 12,
                                                                                    }} />
                                                                                )}
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 pointer-events-none">
                                                                            <p className="text-3xl font-bold">{dashboardStats.solutions.total}</p>
                                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">Total Submissions</p>
                                                                        </div>
                                                                    </div>
                                                                    {dashboardStats.solutions.total > 0 && (
                                                                        <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                                                            {Object.entries(dashboardStats.solutions.by_status).map(([status, count], index) => (
                                                                                <div
                                                                                    key={status}
                                                                                    className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100"
                                                                                    style={{ opacity: activeSolutionIndex === undefined || activeSolutionIndex === index ? 1 : 0.6 }}
                                                                                    onMouseEnter={() => setActiveSolutionIndex(index)}
                                                                                    onMouseLeave={() => setActiveSolutionIndex(undefined)}
                                                                                >
                                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                                        backgroundColor: {
                                                                                            'new': '#3b82f6',
                                                                                            'under_review': '#f59e0b',
                                                                                            'duplicate': '#a855f7',
                                                                                            'rejected': '#ef4444',
                                                                                            'solution_accepted_points': '#10b981',
                                                                                            'triaged': '#f97316',
                                                                                            'need_info': '#06b6d4',
                                                                                            'winner': '#eab308'
                                                                                        }[status] || '#6366f1'
                                                                                    }} />
                                                                                    <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Tech Transfer IPs Pie Chart */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Tech Transfer IPs</CardTitle>
                                                            <CardDescription>Status breakdown</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : dashboardStats?.tech_transfer ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={dashboardStats.tech_transfer.total === 0 ? [{ name: 'No data', value: 1 }] : Object.entries(dashboardStats.tech_transfer.by_status).map(([status, count]) => ({
                                                                                        name: status.replace(/_/g, ' '),
                                                                                        value: count as number
                                                                                    }))}
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activeTechTransferIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}

                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {dashboardStats.tech_transfer.total === 0 ? (
                                                                                        <Cell fill="#e5e7eb" />
                                                                                    ) : (
                                                                                        Object.keys(dashboardStats.tech_transfer.by_status).map((status, index) => {
                                                                                            const colors: Record<string, string> = {
                                                                                                'pending': '#f59e0b',
                                                                                                'approved': '#10b981',
                                                                                                'rejected': '#ef4444',
                                                                                                'need_info': '#3b82f6',
                                                                                                'monitized': '#8b5cf6'
                                                                                            };
                                                                                            return <Cell key={`cell-${index}`} fill={colors[status] || '#6366f1'} />;
                                                                                        })
                                                                                    )}
                                                                                </Pie>
                                                                                {dashboardStats.tech_transfer.total > 0 && (
                                                                                    <Tooltip
                                                                                        contentStyle={{
                                                                                            borderRadius: 12,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 pointer-events-none">
                                                                            <p className="text-3xl font-bold">{dashboardStats.tech_transfer.total}</p>
                                                                            <p className="text-xs text-muted-foreground whitespace-nowrap">Total Submissions</p>
                                                                        </div>
                                                                    </div>
                                                                    {dashboardStats.tech_transfer.total > 0 && (
                                                                        <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                                                            {Object.entries(dashboardStats.tech_transfer.by_status).map(([status, count], index) => (
                                                                                <div
                                                                                    key={status}
                                                                                    className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100"
                                                                                    style={{ opacity: activeTechTransferIndex === undefined || activeTechTransferIndex === index ? 1 : 0.6 }}
                                                                                    onMouseEnter={() => setActiveTechTransferIndex(index)}
                                                                                    onMouseLeave={() => setActiveTechTransferIndex(undefined)}
                                                                                >
                                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                                        backgroundColor: {
                                                                                            'pending': '#f59e0b',
                                                                                            'approved': '#10b981',
                                                                                            'rejected': '#ef4444',
                                                                                            'need_info': '#3b82f6',
                                                                                            'monitized': '#8b5cf6'
                                                                                        }[status] || '#6366f1'
                                                                                    }} />
                                                                                    <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Newsletter Subscribers Card */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Newsletter Subscribers</CardTitle>
                                                            <CardDescription>Total waitlist subscribers</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {newsletterSubscribers > 0 ? (
                                                                <div className="relative">
                                                                    <ResponsiveContainer width="100%" height={280}>
                                                                        <PieChart>
                                                                            <Pie
                                                                                data={[{ name: 'Subscribers', value: newsletterSubscribers }]}
                                                                                dataKey="value"
                                                                                nameKey="name"
                                                                                cx="50%"
                                                                                cy="45%"
                                                                                innerRadius={90}
                                                                                outerRadius={120}
                                                                                fill="#8b5cf6"
                                                                                paddingAngle={0}
                                                                                isAnimationActive={true}
                                                                                animationBegin={0}
                                                                                animationDuration={400}
                                                                                animationEasing="ease-in-out"
                                                                            >
                                                                                <Cell fill="#8b5cf6" />
                                                                            </Pie>
                                                                            <Tooltip
                                                                                contentStyle={{
                                                                                    borderRadius: 12,
                                                                                }}
                                                                            />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                    <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -z-10 pointer-events-none">
                                                                        <p className="text-4xl font-bold">{newsletterSubscribers}</p>
                                                                        <p className="text-sm text-muted-foreground">Subscribers</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                                                    <p>No subscribers yet</p>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Event Configuration Card */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <CardTitle>Event Registrations</CardTitle>
                                                                    <CardDescription>Aignite registration breakdown</CardDescription>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : registrations && registrations.length > 0 ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={Object.entries(
                                                                                        registrations.reduce((acc: Record<string, number>, reg) => {
                                                                                            const type = reg.who_you_are || 'Other';
                                                                                            acc[type] = (acc[type] || 0) + 1;
                                                                                            return acc;
                                                                                        }, {})
                                                                                    ).map(([name, value]) => ({ name, value }))}
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activeEventIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}
                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {Object.keys(
                                                                                        registrations.reduce((acc: Record<string, number>, reg) => {
                                                                                            const type = reg.who_you_are || 'Other';
                                                                                            acc[type] = (acc[type] || 0) + 1;
                                                                                            return acc;
                                                                                        }, {})
                                                                                    ).map((type, index) => {
                                                                                        const colors: Record<string, string> = {
                                                                                            'Marketing Teams': '#8b5cf6',
                                                                                            'Founders': '#ec4899',
                                                                                            'CEO': '#14b8a6',
                                                                                            'Manager': '#f97316',
                                                                                            'Other': '#6366f1'
                                                                                        };
                                                                                        return <Cell key={`cell-${index}`} fill={colors[type] || '#6366f1'} />;
                                                                                    })}
                                                                                </Pie>
                                                                                <Tooltip
                                                                                    contentStyle={{
                                                                                        borderRadius: 12,
                                                                                    }}
                                                                                />
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                            <p className="text-4xl font-bold">{registrations.length}</p>
                                                                            <p className="text-sm text-muted-foreground">Total</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                                        {Object.entries(
                                                                            registrations.reduce((acc: Record<string, number>, reg) => {
                                                                                const type = reg.who_you_are || 'Other';
                                                                                acc[type] = (acc[type] || 0) + 1;
                                                                                return acc;
                                                                            }, {})
                                                                        ).map(([type, count], index) => {
                                                                            const colors: Record<string, string> = {
                                                                                'Marketing Teams': '#8b5cf6',
                                                                                'Founders': '#ec4899',
                                                                                'CEO': '#14b8a6',
                                                                                'Manager': '#f97316',
                                                                                'Other': '#6366f1'
                                                                            };
                                                                            return (
                                                                                <div
                                                                                    key={type}
                                                                                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                                                    onMouseEnter={() => setActiveEventIndex(index)}
                                                                                    onMouseLeave={() => setActiveEventIndex(undefined)}
                                                                                >
                                                                                    <div className="w-3 h-3 rounded-full" style={{
                                                                                        backgroundColor: colors[type] || '#6366f1'
                                                                                    }} />
                                                                                    <span className="text-sm">{type}: {count}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                                                    <LucideIcons.Users className="h-12 w-12 mb-2 opacity-50" />
                                                                    <p>No registrations yet</p>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
                                                    {/* Pitching Tokens Card */}
                                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                        <CardHeader>
                                                            <CardTitle>Pitching Tokens</CardTitle>
                                                            <CardDescription>Tokens usage and pitching submissions</CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {isLoadingStats ? (
                                                                <div className="flex justify-center items-center h-[300px]">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : dashboardStats?.stats ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <ResponsiveContainer width="100%" height={280}>
                                                                            <PieChart>
                                                                                <Pie
                                                                                    data={
                                                                                        (dashboardStats.stats.tokens_used > 0 || dashboardStats.stats.tokens_unused > 0 || dashboardStats.stats.unique_submissions > 0)
                                                                                            ? [
                                                                                                { name: 'Used', value: dashboardStats.stats.tokens_used },
                                                                                                { name: 'Unused', value: dashboardStats.stats.tokens_unused },
                                                                                                { name: 'Submitted', value: dashboardStats.stats.unique_submissions },
                                                                                            ].filter(d => d.value > 0)
                                                                                            : [{ name: 'No Data', value: 1 }]
                                                                                    }
                                                                                    dataKey="value"
                                                                                    nameKey="name"
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={90}
                                                                                    outerRadius={120}
                                                                                    paddingAngle={2}
                                                                                    activeIndex={activePitchTokenIndex}
                                                                                    activeShape={{
                                                                                        outerRadius: 125,
                                                                                        strokeWidth: 1,
                                                                                        cursor: 'pointer'
                                                                                    } as any}
                                                                                    inactiveShape={{
                                                                                        opacity: 0.6
                                                                                    } as any}
                                                                                    isAnimationActive={true}
                                                                                    animationBegin={0}
                                                                                    animationDuration={400}
                                                                                    animationEasing="ease-in-out"
                                                                                >
                                                                                    {(dashboardStats.stats.tokens_used > 0 || dashboardStats.stats.tokens_unused > 0 || dashboardStats.stats.unique_submissions > 0)
                                                                                        ? [
                                                                                            dashboardStats.stats.tokens_used > 0 && <Cell key="used" fill="#10b981" />,
                                                                                            dashboardStats.stats.tokens_unused > 0 && <Cell key="unused" fill="#6366f1" />,
                                                                                            dashboardStats.stats.unique_submissions > 0 && <Cell key="submitted" fill="#f97316" />
                                                                                        ].filter(Boolean)
                                                                                        : <Cell key="no-data" fill="#e5e7eb" />
                                                                                    }
                                                                                </Pie>
                                                                                <Tooltip
                                                                                    contentStyle={{
                                                                                        borderRadius: 12,
                                                                                    }}
                                                                                    formatter={(value, name) => [
                                                                                        name === 'No Data' ? 0 : value,
                                                                                        name
                                                                                    ]}
                                                                                />
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -z-10">
                                                                            <p className="text-4xl font-bold">{dashboardStats.stats.tokens_sent}</p>
                                                                            <p className="text-sm text-muted-foreground">Total Tokens</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4 flex flex-wrap gap-4 justify-center">
                                                                        <div
                                                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                                            onMouseEnter={() => setActivePitchTokenIndex(0)}
                                                                            onMouseLeave={() => setActivePitchTokenIndex(undefined)}
                                                                        >
                                                                            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                                                                            <span className="text-sm">Used: {dashboardStats.stats.tokens_used}</span>
                                                                        </div>
                                                                        <div
                                                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                                            onMouseEnter={() => setActivePitchTokenIndex(1)}
                                                                            onMouseLeave={() => setActivePitchTokenIndex(undefined)}
                                                                        >
                                                                            <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                                                                            <span className="text-sm">Unused: {dashboardStats.stats.tokens_unused}</span>
                                                                        </div>
                                                                        <div
                                                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                                                                            onMouseEnter={() => setActivePitchTokenIndex(2)}
                                                                            onMouseLeave={() => setActivePitchTokenIndex(undefined)}
                                                                        >
                                                                            <div className="w-3 h-3 rounded-full bg-[#f97316]" />
                                                                            <span className="text-sm">Submitted: {dashboardStats.stats.unique_submissions}</span>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                                                    <LucideIcons.Ticket className="h-12 w-12 mb-2 opacity-50" />
                                                                    <p>No token data available</p>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="testimonials" className="space-y-4">
                                        <TestimonialManager />
                                    </TabsContent>
                                    <TabsContent value="organisation" className="mt-0">
                                        {hasSubscription || userRole === 'admin' ? (
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                <CardHeader>
                                                    <CardTitle>Organisation Collaborations</CardTitle>
                                                    <CardDescription>
                                                        Your ongoing and potential collaborations with MSMEs.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>You have no active collaboration proposals.</p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <LockedContent setActiveView={setActiveView} title="MSMEs" />
                                        )}
                                    </TabsContent>
                                    <TabsContent value="incubators" className="mt-0">
                                        {hasSubscription || userRole === 'admin' ? (
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50 mt-4">
                                                <CardHeader>
                                                    <CardTitle>Incubator Applications</CardTitle>
                                                    <CardDescription>Status of your applications to incubators.</CardDescription>
                                                </CardHeader>
                                                <CardContent><p>You have not applied to any incubators yet.</p></CardContent>
                                            </Card>
                                        ) :
                                            <LockedContent setActiveView={setActiveView} title="Incubators" />
                                        }
                                    </TabsContent>
                                    <TabsContent value="mentors" className="mt-0">
                                        <div className="text-center py-16 text-muted-foreground">
                                            <p>You have not had any mentor sessions yet.</p>
                                            <Button variant="link" onClick={() => setActiveView('mentors')}>Book a session</Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="submission" className="mt-0">
                                        {userRole === 'admin' || (
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                <CardHeader>
                                                    <CardTitle>My Submissions</CardTitle>
                                                    <CardDescription>Your submissions for corporate challenges.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    {loading ? (
                                                        <p>Loading...</p>
                                                    ) : mySubmissions.length === 0 ? (
                                                        <p>You have no active submissions.</p>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {mySubmissions.map((submission) => (
                                                                <div
                                                                    key={submission.id}
                                                                    onClick={(e) => { e.stopPropagation(); setCommentingSubmissionId(submission.id) }}
                                                                    className="p-4 border rounded-lg flex justify-between items-center transition-all cursor-pointer hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-ring"
                                                                    tabIndex={0}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            e.preventDefault()
                                                                            setCommentingSubmissionId(submission.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <p className="font-semibold">{submission.ipTitle}</p>
                                                                        <p className="text-sm text-muted-foreground">Status: {submission.approvalStatus}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="engagement" className="mt-0">
                                        {submissions.length > 0 ? (
                                            <div className="max-h-[600px] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                                {submissions.map((sub) => (
                                                    <AnimatedCard
                                                        key={sub.solutionId}
                                                        sub={sub}
                                                        setSelectedSubmission={setSelectedSubmission}
                                                        statusBadgeClasses={statusBadgeClasses}
                                                        statusLabels={statusLabels}
                                                        statusUpdates1={statusUpdates1}
                                                        handleSolutionUpdateStatus={handleSolutionUpdateStatus}
                                                        isUpdating1={isUpdating1}
                                                        handleStatusChange={handleStatusChange}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <Card className="text-center text-muted-foreground py-16">
                                                <CardContent>You have not received any submissions yet.</CardContent>
                                            </Card>
                                        )}
                                    </TabsContent>

                                    {userRole === "admin" && (
                                        <>
                                            <TabsContent value="users" className="mt-0 min-w-0 w-full max-w-full">
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden min-w-0">
                                                    <CardHeader>
                                                        <CardTitle>User Management</CardTitle>
                                                        <CardDescription>Approve, ban, or delete user accounts.</CardDescription>

                                                    </CardHeader>
                                                    <CardContent className="p-0 sm:p-6 w-full max-w-full">
                                                        {isLoadingUsers ? (
                                                            <div className="w-full">
                                                                <div className="overflow-x-auto overflow-y-hidden pb-2">
                                                                    <Table className="w-full min-w-[800px]">
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>User</TableHead>
                                                                                <TableHead>Role</TableHead>
                                                                                <TableHead>Plans</TableHead>
                                                                                <TableHead>Status</TableHead>
                                                                                <TableHead>Reset</TableHead>
                                                                                <TableHead>Details</TableHead>
                                                                                <TableHead>Actions</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {Array.from({ length: 10 }).map((_, i) => (
                                                                                <TableRow key={i}>
                                                                                    <TableCell>
                                                                                        <div className="space-y-2 break-all whitespace-normal">
                                                                                            <div className="h-4 w-32 max-w-[80%] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                                                            <div className="h-3 w-48 max-w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                                                                    <TableCell><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                                                                    <TableCell><div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                                                                    <TableCell><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                                                                    <TableCell><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></TableCell>
                                                                                    <TableCell>
                                                                                        <div className="flex gap-2">
                                                                                            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                                                            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-full">
                                                                    <div className="overflow-x-auto overflow-y-hidden pb-2">
                                                                        <Table className="w-full min-w-[800px]">
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead>User</TableHead>
                                                                                    <TableHead>Role</TableHead>
                                                                                    <TableHead>Plans</TableHead>
                                                                                    <TableHead>Status</TableHead>
                                                                                    <TableHead>Reset</TableHead>
                                                                                    <TableHead>Details</TableHead>
                                                                                    <TableHead>Actions</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {users.map(u => (
                                                                                    <TableRow key={u.uid}>
                                                                                        <TableCell>
                                                                                            <div>
                                                                                                <div className="font-medium break-all whitespace-normal">{u.name}</div>
                                                                                                <div className="text-sm text-muted-foreground break-all whitespace-normal">{u.email}</div>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="capitalize">{u.role}</TableCell>
                                                                                        <TableCell>
                                                                                            <div className="flex flex-col gap-2">
                                                                                                {u.role === 'founder' && u.founder_role === "Solve Organisation's challenge" && (
                                                                                                    <div className="flex items-center space-x-2">
                                                                                                        <Switch
                                                                                                            id={`premium-${u.uid}`}
                                                                                                            checked={u.active_plans?.includes('Premium')}
                                                                                                            onCheckedChange={() => handleTogglePlan(u.uid, 'Premium', u.active_plans?.includes('Premium') || false)}
                                                                                                            disabled={togglingPlans[`${u.uid}-Premium`]}
                                                                                                        />
                                                                                                        <label htmlFor={`premium-${u.uid}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1">
                                                                                                            Premium
                                                                                                            {togglingPlans[`${u.uid}-Premium`] && <LucideIcons.Loader2 className="h-3 w-3 animate-spin" />}
                                                                                                        </label>
                                                                                                    </div>
                                                                                                )}
                                                                                                {u.role === 'founder' && u.founder_role === "Submit an innovative idea" && (
                                                                                                    <div className="flex items-center space-x-2">
                                                                                                        <Switch
                                                                                                            id={`standard-${u.uid}`}
                                                                                                            checked={u.active_plans?.includes('Standard')}
                                                                                                            onCheckedChange={() => handleTogglePlan(u.uid, 'Standard', u.active_plans?.includes('Standard') || false)}
                                                                                                            disabled={togglingPlans[`${u.uid}-Standard`]}
                                                                                                        />
                                                                                                        <label htmlFor={`standard-${u.uid}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1">
                                                                                                            Standard
                                                                                                            {togglingPlans[`${u.uid}-Standard`] && <LucideIcons.Loader2 className="h-3 w-3 animate-spin" />}
                                                                                                        </label>
                                                                                                    </div>
                                                                                                )}
                                                                                                {u.role !== 'founder' && (
                                                                                                    <span className="text-xs text-muted-foreground italic">No founder role</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </TableCell>

                                                                                        <TableCell>
                                                                                            <div>
                                                                                                {u.status === 'banned' ? (
                                                                                                    <Badge variant="destructive">Banned</Badge>
                                                                                                ) : u.status === 'active' ? (
                                                                                                    <Badge variant="default">Active</Badge>
                                                                                                ) : (
                                                                                                    <Badge variant="secondary">Pending</Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={() => handleResetRole(u.uid)}
                                                                                                title="Reset Role"
                                                                                            >
                                                                                                <LucideIcons.RotateCcw className="h-4 w-4" />
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-9 w-9"
                                                                                                onClick={() => {
                                                                                                    setSelectedUserForDetails(u);
                                                                                                    fetchUserDetails(u.uid);
                                                                                                }}
                                                                                            >
                                                                                                <LucideIcons.Info className="h-5 w-5" />
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                        <TableCell>

                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                {u.status === 'pending' && (
                                                                                                    <Button
                                                                                                        size="sm"
                                                                                                        onClick={() => { /* Handle approve logic */ }}
                                                                                                        className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground min-w-[90px]"
                                                                                                    >
                                                                                                        <LucideIcons.CheckCircle className="mr-2 h-4 w-4" />
                                                                                                        Approve
                                                                                                    </Button>
                                                                                                )}

                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant={u.status === 'banned' ? "outline" : "secondary"}
                                                                                                    onClick={() => setUserToBan(u)}
                                                                                                    className="flex-1 min-w-[70px]"
                                                                                                >
                                                                                                    <LucideIcons.Ban className="mr-2 h-4 w-4" />
                                                                                                </Button>

                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="destructive"
                                                                                                    onClick={() => setUserToDelete(u)}
                                                                                                    className="flex-1 min-w-[70px]"
                                                                                                >
                                                                                                    <LucideIcons.Trash2 className="mr-2 h-4 w-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>

                                                                    {/* Optimized Pagination Controls */}
                                                                    {totalPages > 1 && (
                                                                        <div className="flex justify-center my-6">
                                                                            <Pagination>
                                                                                <PaginationContent>
                                                                                    <PaginationItem>
                                                                                        <PaginationPrevious
                                                                                            href="#"
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                if (currentPage > 1) handlePageChange(currentPage - 1);
                                                                                            }}
                                                                                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                                        />
                                                                                    </PaginationItem>

                                                                                    {/* Show first page */}
                                                                                    <PaginationItem>
                                                                                        <PaginationLink
                                                                                            href="#"
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                handlePageChange(1);
                                                                                            }}
                                                                                            isActive={currentPage === 1}
                                                                                            className="cursor-pointer"
                                                                                        >
                                                                                            1
                                                                                        </PaginationLink>
                                                                                    </PaginationItem>

                                                                                    {/* Show ellipsis if needed */}
                                                                                    {currentPage > 3 && (
                                                                                        <PaginationItem>
                                                                                            <PaginationEllipsis />
                                                                                        </PaginationItem>
                                                                                    )}

                                                                                    {/* Show pages around current page */}
                                                                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                                                        .filter(page => {
                                                                                            // Show pages within 1 of current page, excluding first and last
                                                                                            return page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1;
                                                                                        })
                                                                                        .map(page => (
                                                                                            <PaginationItem key={page}>
                                                                                                <PaginationLink
                                                                                                    href="#"
                                                                                                    onClick={(e) => {
                                                                                                        e.preventDefault();
                                                                                                        handlePageChange(page);
                                                                                                    }}
                                                                                                    isActive={currentPage === page}
                                                                                                    className="cursor-pointer"
                                                                                                >
                                                                                                    {page}
                                                                                                </PaginationLink>
                                                                                            </PaginationItem>
                                                                                        ))}

                                                                                    {/* Show ellipsis if needed */}
                                                                                    {currentPage < totalPages - 2 && (
                                                                                        <PaginationItem>
                                                                                            <PaginationEllipsis />
                                                                                        </PaginationItem>
                                                                                    )}

                                                                                    {/* Show last page */}
                                                                                    {totalPages > 1 && (
                                                                                        <PaginationItem>
                                                                                            <PaginationLink
                                                                                                href="#"
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    handlePageChange(totalPages);
                                                                                                }}
                                                                                                isActive={currentPage === totalPages}
                                                                                                className="cursor-pointer"
                                                                                            >
                                                                                                {totalPages}
                                                                                            </PaginationLink>
                                                                                        </PaginationItem>
                                                                                    )}

                                                                                    <PaginationItem>
                                                                                        <PaginationNext
                                                                                            href="#"
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                if (currentPage < totalPages) handlePageChange(currentPage + 1);
                                                                                            }}
                                                                                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                                        />
                                                                                    </PaginationItem>
                                                                                </PaginationContent>
                                                                            </Pagination>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>

                                                        )}
                                                    </CardContent>
                                                    <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirm Role Reset</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to reset this user&rsquo;s role? They will need to select a new role on next login.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={confirmResetRole} className="bg-red-600 hover:bg-red-700">
                                                                    Reset Role
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </Card>
                                            </TabsContent>
                                            <TabsContent value="ip/technologies" className="mt-0">
                                                <Tabs defaultValue="ip/technologies" className="w-full " value={activeSubTab}
                                                    onValueChange={setActiveSubTab}
                                                >
                                                    <TabsContent value="ip/technologies" className="mt-0">
                                                        {isLoadingIps ? (
                                                            <div className="space-y-4">
                                                                {[1, 2, 3].map((i) => (
                                                                    <div key={i} className="border rounded-md p-4 space-y-3 animate-pulse">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="space-y-2 flex-1">
                                                                                <div className="h-6 bg-muted rounded w-2/3"></div>
                                                                                <div className="h-4 bg-muted rounded w-1/3"></div>
                                                                            </div>
                                                                            <div className="h-6 w-20 bg-muted rounded"></div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="h-4 bg-muted rounded w-full"></div>
                                                                            <div className="h-4 bg-muted rounded w-5/6"></div>
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <div className="h-9 w-24 bg-muted rounded"></div>
                                                                            <div className="h-9 w-32 bg-muted rounded"></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : techTransferIps.length === 0 ? (
                                                            <p className="text-center text-muted-foreground py-8">
                                                                No IP submissions found.
                                                            </p>
                                                        ) : (
                                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                                <CardHeader>
                                                                    <CardTitle>Ip/Technologies</CardTitle>
                                                                    <CardDescription className="font-thin">Approve, Reject, or delete IP&apos;s.</CardDescription>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <Accordion type="single" collapsible className="w-full" value={expandedAccordion}
                                                                        onValueChange={setExpandedAccordion}>
                                                                        {Object.keys(groupedIps).slice().reverse().map((organizationName) => (
                                                                            <AccordionItem value={`org-${organizationName}`} key={organizationName} className="border-b">
                                                                                <AccordionTrigger className="flex items-center justify-between gap-4 p-4 hover:no-underline data-[state=open]:bg-muted/50 rounded-md transition-colors">
                                                                                    <p className="font-medium truncate">
                                                                                        {organizationName}
                                                                                        <span className="text-sm text-muted-foreground ml-2">
                                                                                            ({groupedIps[organizationName].length} submissions)
                                                                                        </span>
                                                                                    </p>
                                                                                </AccordionTrigger>
                                                                                <AccordionContent className="p-4">
                                                                                    <div className="space-y-4">
                                                                                        {groupedIps[organizationName].slice().reverse().map((ip) => (
                                                                                            <div
                                                                                                key={ip.id}
                                                                                                id={ip.id}
                                                                                                onClick={(e) => setCommentingSubmissionId(ip.id)}
                                                                                                className={`border font-headline rounded-md p-4 space-y-2 transition-all cursor-pointer hover:bg-accent/20 hover:text-accent-foreground focus:outline-none focus:ring-2 
                                                                        ${highlightedId === ip.id ? "highlight" : ""}
                                                                        focus:ring-ring`}
                                                                                                tabIndex={0}
                                                                                                onKeyDown={(e) => {
                                                                                                    if (e.key === "Enter" || e.key === " ") {
                                                                                                        e.preventDefault();
                                                                                                        setCommentingSubmissionId(ip.id);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                                                    <div className="flex justify-between w-full items-center">
                                                                                                        <div className="flex gap-2">
                                                                                                            <p className="font-semibold text-lg text-foreground">{ip.ipTitle}</p>
                                                                                                            <Badge
                                                                                                                className={`px-3 py-1 text-xs font-semibold border rounded-sm capitalize
                                                                                                        ${ip.approvalStatus === "approved"
                                                                                                                        ? "border-green-500 text-green-700 bg-green-50 dark:border-green-400 dark:text-green-300"
                                                                                                                        : ip.approvalStatus === "rejected"
                                                                                                                            ? "border-red-500 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-300"
                                                                                                                            : ip.approvalStatus === "needInfo"
                                                                                                                                ? "border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-400 dark:text-blue-300"
                                                                                                                                : "border-gray-400 text-gray-700 bg-gray-50 dark:border-gray-500 dark:text-gray-300"
                                                                                                                    }`}
                                                                                                            >
                                                                                                                {ip.approvalStatus}
                                                                                                            </Badge>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <DropdownMenu>
                                                                                                                <DropdownMenuTrigger asChild>
                                                                                                                    <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="icon"
                                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                                    >
                                                                                                                        <LucideIcons.MoreVertical className="h-5 w-5" />
                                                                                                                    </Button>
                                                                                                                </DropdownMenuTrigger>
                                                                                                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                                                                    <DropdownMenuItem
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation()
                                                                                                                            setDeleteTargetId(ip.id)
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <LucideIcons.Trash2 className="mr-2 h-4 w-4" />
                                                                                                                        Delete
                                                                                                                    </DropdownMenuItem>
                                                                                                                </DropdownMenuContent>
                                                                                                            </DropdownMenu>
                                                                                                        </div>

                                                                                                    </div>

                                                                                                </div>
                                                                                                <div className="text-sm text-muted-foreground space-y-1" >
                                                                                                    <p>
                                                                                                        <strong className="font-headline">Inventor:</strong> {ip.firstName} {ip.lastName}
                                                                                                    </p>
                                                                                                    <div className="max-h-24 overflow-y-auto pr-2">
                                                                                                        <p className="line-clamp-3">
                                                                                                            <strong className="font-headline">Summary: </strong>
                                                                                                            {ip.summary}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="pt-4 flex justify-between items-center">
                                                                                                    <div className="flex items-center gap-2 ml-auto">
                                                                                                        {statusUpdates[ip.id] && (
                                                                                                            <Button
                                                                                                                size="sm"
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    handleUpdateStatus(ip.id);
                                                                                                                }}
                                                                                                                disabled={isUpdating[ip.id]}
                                                                                                            >
                                                                                                                {isUpdating[ip.id] ? (
                                                                                                                    <LucideIcons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                                                                ) : (
                                                                                                                    <LucideIcons.Save className="mr-2 h-4 w-4" />
                                                                                                                )}
                                                                                                                Update Status
                                                                                                            </Button>
                                                                                                        )}

                                                                                                        <DropdownMenu>
                                                                                                            <DropdownMenuTrigger asChild>
                                                                                                                <Button
                                                                                                                    variant="outline"
                                                                                                                    size="sm"
                                                                                                                    onClick={(e) => e.stopPropagation()} // ✅ stop click bubbling when opening dropdown
                                                                                                                >
                                                                                                                    Actions
                                                                                                                    <LucideIcons.ChevronDown className="ml-2 h-4 w-4" />
                                                                                                                </Button>
                                                                                                            </DropdownMenuTrigger>

                                                                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}> {/* ✅ Stop bubbling inside dropdown */}
                                                                                                                <>
                                                                                                                    <DropdownMenuItem
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation(); // ✅ Prevent triggering parent div click
                                                                                                                            handleActionClick(ip.id, "approved");
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <LucideIcons.CheckCircle className="mr-2 h-4 w-4" />
                                                                                                                        <span>Approve</span>
                                                                                                                    </DropdownMenuItem>

                                                                                                                    <DropdownMenuItem
                                                                                                                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            handleActionClick(ip.id, "rejected");
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <LucideIcons.XCircle className="mr-2 h-4 w-4" />
                                                                                                                        <span>Reject</span>
                                                                                                                    </DropdownMenuItem>

                                                                                                                    <DropdownMenuItem
                                                                                                                        className="focus:bg-muted"
                                                                                                                        onClick={(e) => {
                                                                                                                            e.stopPropagation();
                                                                                                                            handleActionClick(ip.id, "needInfo");
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <LucideIcons.XCircle className="mr-2 h-4 w-4" />
                                                                                                                        <span>Need Info</span>
                                                                                                                    </DropdownMenuItem>
                                                                                                                </>
                                                                                                            </DropdownMenuContent>
                                                                                                        </DropdownMenu>

                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </AccordionContent>
                                                                            </AccordionItem>
                                                                        ))}
                                                                    </Accordion>

                                                                </CardContent>
                                                            </Card>

                                                        )}
                                                        <DeleteConfirmationDialog
                                                            open={!!deleteTargetId}
                                                            onOpenChange={(open) => {
                                                                if (!open) setDeleteTargetId(null)
                                                            }}
                                                            submissionId={deleteTargetId || ""}
                                                            onDelete={(id) => {
                                                                deleteSubmission(String(id), setMySubmissions)
                                                                setDeleteTargetId(null)
                                                            }}
                                                        />
                                                        <div className="absolute bottom-4 right-4">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="px-12 py-6 rounded-full text-sm font-medium flex items-center gap-2 shadow-md"
                                                                onClick={() => setActiveSubTab("restoreips")}
                                                            >
                                                                <LucideIcons.RotateCcw className="h-4 w-4" />
                                                                Restore IPs
                                                            </Button>
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="restoreips" className="mt-0">
                                                        {isLoadingRestoreIps ? (
                                                            <div className="flex justify-center items-center h-48">
                                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                            </div>
                                                        ) : restoreIps.length === 0 ? (
                                                            <p className="text-center text-muted-foreground py-8">
                                                                No deleted or restorable IPs found.
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-4 pb-20"> {/* Add bottom padding so button doesn’t overlap content */}
                                                                {restoreIps?.map((ip: any, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="border rounded-md p-4 space-y-2 hover:bg-muted/30 transition-all"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <p className="font-semibold">{ip.ipTitle}</p>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button size="sm" variant="outline">
                                                                                        <LucideIcons.RotateCcw className="mr-2 h-4 w-4" />
                                                                                        Restore
                                                                                    </Button>
                                                                                </AlertDialogTrigger>

                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Restore this IP submission?</AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            This action will restore <strong>{ip.ipTitle}</strong> back to the main IP list.
                                                                                            Are you sure you want to continue?
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>

                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                        <AlertDialogAction
                                                                                            onClick={() => handleRestore(ip.id)}
                                                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                                                        >
                                                                                            Yes, Restore
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>

                                                                        <p className="text-sm text-muted-foreground">
                                                                            <strong>Inventor:</strong> {ip.inventorName}
                                                                        </p>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            <strong>Summary:</strong> {ip.summary}
                                                                        </p>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            <strong>Organization:</strong> {ip.organization}
                                                                        </p>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            <strong>Deleted by:</strong> {ip.action_by_user_name}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* 🔙 Back button fixed to bottom-right */}
                                                        <div className="absolute bottom-4 right-4">
                                                            <Button
                                                                size="sm"
                                                                className="px-12 py-6"
                                                                onClick={() => setActiveSubTab("ip/technologies")}
                                                            >
                                                                <LucideIcons.ArrowLeft className="mr-2 h-4 w-4" />
                                                                Back
                                                            </Button>
                                                        </div>
                                                    </TabsContent>


                                                </Tabs>
                                            </TabsContent>

                                            <TabsContent value="subscribers" className="mt-0">
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                    <CardHeader>
                                                        <CardTitle>Newsletter Subscribers</CardTitle>
                                                        <CardDescription>List of all users subscribed to the newsletter.</CardDescription>

                                                        <div className="flex justify-end gap-2 pt-2">
                                                            <Button variant="outline" onClick={handleExportCSV}>
                                                                <LucideIcons.Download className="mr-2 h-4 w-4" /> Export CSV
                                                            </Button>

                                                            {selectedSubscribers.length > 0 && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive">
                                                                            <LucideIcons.Trash className="mr-2 h-4 w-4" /> Delete Selected ({selectedSubscribers.length})
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This action cannot be undone. It will permanently delete the selected subscriber(s).
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDeleteSubscribers}>
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent>
                                                        {isLoadingSubscribers ? (
                                                            <div className="flex justify-center items-center h-48">
                                                                <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                            </div>
                                                        ) : subscribers.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-4">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedSubscribers.length === subscribers.length}
                                                                                onChange={(e) =>
                                                                                    setSelectedSubscribers(
                                                                                        e.target.checked ? subscribers.map((s) => s.id) : []
                                                                                    )
                                                                                }
                                                                            />
                                                                        </TableHead>
                                                                        <TableHead>Email</TableHead>
                                                                        <TableHead>Subscribed Date</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {subscribers.map((sub) => (
                                                                        <TableRow key={sub.id}>
                                                                            <TableCell>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedSubscribers.includes(sub.id)}
                                                                                    onChange={(e) =>
                                                                                        setSelectedSubscribers((prev: any) =>
                                                                                            e.target.checked
                                                                                                ? [...prev, sub.id]
                                                                                                : prev.filter((id: any) => id !== sub.id)
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="font-medium">{sub.email}</TableCell>
                                                                            <TableCell>
                                                                                {new Date(sub.subscribed_at).toLocaleDateString()}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-8">
                                                                There are no newsletter subscribers yet.
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="registration" className="mt-0">
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50 ">
                                                    <CardHeader>
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <CardTitle>Event Registrations</CardTitle>
                                                                <CardDescription className="mt-2">
                                                                    Total Registrations: {isLoading ? (
                                                                        <div className="flex justify-center items-center h-48">
                                                                            <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                        </div>
                                                                    ) : totalRegistrations}
                                                                </CardDescription>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <Button
                                                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                                                    size="sm"
                                                                    onClick={handleExportAigniteCSV}
                                                                >
                                                                    <LucideIcons.Download className="mr-2 h-4 w-4" />
                                                                    Export CSV
                                                                </Button>

                                                                {selectedIds.length > 0 && (
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                className="flex items-center"
                                                                                disabled={isDeleting}
                                                                            >
                                                                                <LucideIcons.Trash className="mr-2 h-4 w-4" />
                                                                                {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
                                                                            </Button>
                                                                        </AlertDialogTrigger>

                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This will permanently delete {selectedIds.length} registration(s).
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={handleDeleteSelected}>
                                                                                    Confirm Delete
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className="w-[95vw] lg:w-full">
                                                        <div>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    selectedIds.length === registrations?.length &&
                                                                                    registrations.length > 0
                                                                                }
                                                                                onChange={selectAll}
                                                                            />
                                                                        </TableHead>
                                                                        {registrationColumns.map((col) => (
                                                                            <TableHead key={col}>{col}</TableHead>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHeader>

                                                                <TableBody>
                                                                    {registrations?.length > 0 ? (
                                                                        registrations.map((reg) => (
                                                                            <TableRow key={reg.id}>
                                                                                <TableCell>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.includes(reg.id)}
                                                                                        onChange={() => toggleSelect(reg.id)}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell>{reg.full_name}</TableCell>
                                                                                <TableCell>{reg.email_address}</TableCell>
                                                                                <TableCell>{reg.phone_number}</TableCell>
                                                                                <TableCell>{reg.who_you_are}</TableCell>
                                                                                <TableCell>
                                                                                    {new Date(reg.registered_at).toLocaleString()}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))
                                                                    ) : (
                                                                        <TableRow>
                                                                            <TableCell colSpan={registrationColumns.length + 1} className="text-center py-12 text-lg text-muted-foreground">
                                                                                No registrations found for this page.
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}

                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center mt-6">
                                                                <Pagination>
                                                                    <PaginationContent>
                                                                        <PaginationItem>
                                                                            <PaginationPrevious
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (currentPage > 1) onPageChange(currentPage - 1);
                                                                                }}
                                                                                className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                            />
                                                                        </PaginationItem>

                                                                        {Array.from({ length: totalPages }, (_, i) => {
                                                                            const pageNumber = i + 1;

                                                                            if (
                                                                                pageNumber === 1 ||
                                                                                pageNumber === totalPages ||
                                                                                Math.abs(pageNumber - currentPage) <= 1
                                                                            ) {
                                                                                return (
                                                                                    <PaginationItem key={pageNumber}>
                                                                                        <PaginationLink
                                                                                            onClick={(e) => {
                                                                                                e.preventDefault();
                                                                                                onPageChange(pageNumber);
                                                                                            }}
                                                                                            isActive={currentPage === pageNumber}
                                                                                            className="cursor-pointer"
                                                                                        >
                                                                                            {pageNumber}
                                                                                        </PaginationLink>
                                                                                    </PaginationItem>
                                                                                );
                                                                            } else if (
                                                                                pageNumber === currentPage - 2 ||
                                                                                pageNumber === currentPage + 2
                                                                            ) {
                                                                                return <span key={pageNumber} className="px-2">...</span>;
                                                                            }

                                                                            return null;
                                                                        })}

                                                                        <PaginationItem>
                                                                            <PaginationNext
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (currentPage < totalPages) onPageChange(currentPage + 1);
                                                                                }}
                                                                                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                            />
                                                                        </PaginationItem>
                                                                    </PaginationContent>
                                                                </Pagination>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                            {/* <TabsContent value="connex" className="mt-0">
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <CardTitle>Connex Registrations</CardTitle>
                                                        <CardDescription className="mt-2">
                                                            Total Registrations: {isLoading ? (
                                                                <div className="flex justify-center items-center h-48">
                                                                    <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                                </div>
                                                            ) : totalRegistrations}
                                                        </CardDescription>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                                                            size="sm"
                                                            onClick={handleExportAigniteCSV}
                                                        >
                                                            <LucideIcons.Download className="mr-2 h-4 w-4" />
                                                            Export CSV
                                                        </Button>

                                                        {selectedIds.length > 0 && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="flex items-center"
                                                                        disabled={isDeleting}
                                                                    >
                                                                        <LucideIcons.Trash className="mr-2 h-4 w-4" />
                                                                        {isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
                                                                    </Button>
                                                                </AlertDialogTrigger>

                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will permanently delete {selectedIds.length} registration(s).
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleDeleteSelected}>
                                                                            Confirm Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent>
                                                <div className="overflow-x-auto rounded-lg border border-border/50">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            selectedIds.length === connexRegistrations?.length &&
                                                                            connexRegistrations.length > 0
                                                                        }
                                                                        onChange={selectAll}
                                                                    />
                                                                </TableHead>
                                                                {registrationColumns.map((col) => (
                                                                    <TableHead key={col}>{col}</TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>

                                                        <TableBody>
                                                            {connexRegistrations?.length > 0 ? (
                                                                connexRegistrations.map((reg) => (
                                                                    <TableRow key={reg.id}>
                                                                        <TableCell>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedIds.includes(reg.id)}
                                                                                onChange={() => toggleSelect(reg.id)}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>{reg.full_name}</TableCell>
                                                                        <TableCell>{reg.email_address}</TableCell>
                                                                        <TableCell>{reg.phone_number}</TableCell>
                                                                        <TableCell>{reg.who_you_are}</TableCell>
                                                                        <TableCell>
                                                                            {reg.created_at}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={registrationColumns.length + 1} className="text-center py-12 text-lg text-muted-foreground">
                                                                        No registrations found for this page.
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}

                                                        </TableBody>
                                                    </Table>
                                                </div>
                                                {totalPages > 1 && (
                                                    <div className="flex justify-center mt-6">
                                                        <Pagination>
                                                            <PaginationContent>
                                                                <PaginationItem>
                                                                    <PaginationPrevious
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            if (currentPage > 1) onPageChange(currentPage - 1);
                                                                        }}
                                                                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                    />
                                                                </PaginationItem>

                                                                {Array.from({ length: totalPages }, (_, i) => {
                                                                    const pageNumber = i + 1;

                                                                    if (
                                                                        pageNumber === 1 ||
                                                                        pageNumber === totalPages ||
                                                                        Math.abs(pageNumber - currentPage) <= 1
                                                                    ) {
                                                                        return (
                                                                            <PaginationItem key={pageNumber}>
                                                                                <PaginationLink
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        onPageChange(pageNumber);
                                                                                    }}
                                                                                    isActive={currentPage === pageNumber}
                                                                                    className="cursor-pointer"
                                                                                >
                                                                                    {pageNumber}
                                                                                </PaginationLink>
                                                                            </PaginationItem>
                                                                        );
                                                                    } else if (
                                                                        pageNumber === currentPage - 2 ||
                                                                        pageNumber === currentPage + 2
                                                                    ) {
                                                                        return <span key={pageNumber} className="px-2">...</span>;
                                                                    }

                                                                    return null;
                                                                })}

                                                                <PaginationItem>
                                                                    <PaginationNext
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            if (currentPage < totalPages) onPageChange(currentPage + 1);
                                                                        }}
                                                                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                                    />
                                                                </PaginationItem>
                                                            </PaginationContent>
                                                        </Pagination>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
*/}
                                            <TabsContent value="pitch-details" className="space-y-4">
                                                <Card>
                                                    <CardHeader className="flex flex-row items-center justify-between">
                                                        <div>
                                                            <CardTitle>Pitching Details</CardTitle>
                                                            <CardDescription>Manage pitching submissions and details.</CardDescription>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {selectedPitchIds.length > 0 && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive" size="sm">
                                                                            <LucideIcons.Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete Selected ({selectedPitchIds.length})
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This action cannot be undone. This will permanently delete the selected pitching details.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDeletePitching} disabled={isDeletingPitch}>
                                                                                {isDeletingPitch ? "Deleting..." : "Delete"}
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="w-[95vw] lg:w-full">
                                                        {/* Search Input */}
                                                        <div className="mb-4">
                                                            <div className="relative">
                                                                <LucideIcons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    placeholder="Search by solution title or company name..."
                                                                    value={pitchSearchQuery}
                                                                    onChange={(e) => setPitchSearchQuery(e.target.value)}
                                                                    className="pl-10"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="rounded-md border">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-[50px]">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={(() => {
                                                                                    const filtered = pitchingDetails.filter(p =>
                                                                                        p.solution_title.toLowerCase().includes(pitchSearchQuery.toLowerCase()) ||
                                                                                        p.company_name.toLowerCase().includes(pitchSearchQuery.toLowerCase())
                                                                                    );
                                                                                    return filtered.length > 0 && selectedPitchIds.length === filtered.length;
                                                                                })()}
                                                                                onChange={() => {
                                                                                    const filtered = pitchingDetails.filter(p =>
                                                                                        p.solution_title.toLowerCase().includes(pitchSearchQuery.toLowerCase()) ||
                                                                                        p.company_name.toLowerCase().includes(pitchSearchQuery.toLowerCase())
                                                                                    );
                                                                                    if (selectedPitchIds.length === filtered.length) {
                                                                                        setSelectedPitchIds([]);
                                                                                    } else {
                                                                                        setSelectedPitchIds(filtered.map(p => p.id));
                                                                                    }
                                                                                }}
                                                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                            />
                                                                        </TableHead>
                                                                        <TableHead>Founder Name</TableHead>
                                                                        <TableHead>Solution Title</TableHead>
                                                                        <TableHead>Company</TableHead>
                                                                        <TableHead>Requirements</TableHead>
                                                                        <TableHead>Pitch Date</TableHead>
                                                                        <TableHead>Pitch Time</TableHead>
                                                                        <TableHead className="text-right">Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {isLoadingPitching ? (
                                                                        Array.from({ length: 5 }).map((_, i) => (
                                                                            <TableRow key={i}>
                                                                                <TableCell><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                                                                                <TableCell><div className="h-4 w-8 bg-gray-200 rounded animate-pulse ml-auto" /></TableCell>
                                                                            </TableRow>
                                                                        ))
                                                                    ) : (() => {
                                                                        const filtered = pitchingDetails.filter(p =>
                                                                            p.solution_title.toLowerCase().includes(pitchSearchQuery.toLowerCase()) ||
                                                                            p.company_name.toLowerCase().includes(pitchSearchQuery.toLowerCase())
                                                                        );
                                                                        return filtered.length === 0;
                                                                    })() ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                                                No pitching details found.
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        pitchingDetails
                                                                            .filter(p =>
                                                                                p.solution_title.toLowerCase().includes(pitchSearchQuery.toLowerCase()) ||
                                                                                p.company_name.toLowerCase().includes(pitchSearchQuery.toLowerCase())
                                                                            )
                                                                            .map((pitch) => (
                                                                                <TableRow key={pitch.id}>
                                                                                    <TableCell>
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={selectedPitchIds.includes(pitch.id)}
                                                                                            onChange={() => togglePitchSelect(pitch.id)}
                                                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium">{pitch.founder_name}</TableCell>
                                                                                    <TableCell>{pitch.solution_title}</TableCell>
                                                                                    <TableCell>{pitch.company_name}</TableCell>
                                                                                    <TableCell className="max-w-xs">
                                                                                        <div className="line-clamp-2 text-sm text-muted-foreground">
                                                                                            {pitch.requirements || 'N/A'}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {(() => {
                                                                                            const date = new Date(pitch.pitch_date);
                                                                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                                                            return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
                                                                                        })()}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {(() => {
                                                                                            const [hours, minutes] = pitch.pitch_time.split(':');
                                                                                            const hour = parseInt(hours);
                                                                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                                                                            const displayHour = hour % 12 || 12;
                                                                                            return `${displayHour}:${minutes} ${ampm}`;
                                                                                        })()}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <AlertDialog>
                                                                                            <AlertDialogTrigger asChild>
                                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90">
                                                                                                    <LucideIcons.Trash2 className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </AlertDialogTrigger>
                                                                                            <AlertDialogContent>
                                                                                                <AlertDialogHeader>
                                                                                                    <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                                                                                    <AlertDialogDescription>
                                                                                                        This will permanently delete the pitching details for {pitch.solution_title}.
                                                                                                    </AlertDialogDescription>
                                                                                                </AlertDialogHeader>
                                                                                                <AlertDialogFooter>
                                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                                    <AlertDialogAction
                                                                                                        onClick={async () => {
                                                                                                            setIsDeletingPitch(true);
                                                                                                            const token = localStorage.getItem('token');
                                                                                                            try {
                                                                                                                await fetch(`${API_BASE_URL}/api/pitching/delete/${pitch.id}`, {
                                                                                                                    method: 'DELETE',
                                                                                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                                                                                });
                                                                                                                toast({ title: "Deleted", description: "Pitching detail deleted." });
                                                                                                                fetchPitchingDetails();
                                                                                                            } catch (e) {
                                                                                                                toast({ variant: 'destructive', title: "Error", description: "Failed to delete." });
                                                                                                            } finally {
                                                                                                                setIsDeletingPitch(false);
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        Delete
                                                                                                    </AlertDialogAction>
                                                                                                </AlertDialogFooter>
                                                                                            </AlertDialogContent>
                                                                                        </AlertDialog>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                            <TabsContent value="blog" className="mt-0 space-y-6">
                                                <BlogDashboard token={localStorage.getItem('token') || ''} />
                                            </TabsContent>
                                            <TabsContent value="sessions" className="mt-0 space-y-6">
                                                <Tabs value={adminContentTab} onValueChange={setAdminContentTab} className="w-full">
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="sessionCreate" onClick={cancelEdit}>{editingProgram ? 'Edit Program' : 'Create New'}</TabsTrigger>
                                                        <TabsTrigger value="sessionView">View All</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="sessionCreate" className="mt-4">
                                                        <Card><CardHeader><CardTitle>{editingProgram ? 'Edit Education Program' : 'Create New Education Program'}</CardTitle></CardHeader><CardContent><Form {...programForm}><form onSubmit={programForm.handleSubmit(onProgramSubmit)} className="space-y-6"><FormField control={programForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={programForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} /><Separator /><div><h3 className="text-lg font-medium mb-2">Sessions</h3>{sessionFields.map((field, index) => (<div key={field.id} className="grid grid-cols-4 gap-2 items-end mb-2 p-2 border rounded-lg"><FormField control={programForm.control} name={`sessions.${index}.language`} render={({ field }) => (<FormItem><FormLabel>Language</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={programForm.control} name={`sessions.${index}.date`} render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={programForm.control} name={`sessions.${index}.time`} render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="button" variant="ghost" onClick={() => removeSession(index)}><LucideIcons.Trash2 className="h-4 w-4" /></Button></div>))}<Button type="button" variant="outline" size="sm" onClick={() => appendSession({ language: 'English', date: '', time: '' })}><LucideIcons.PlusCircle className="mr-2 h-4 w-4" />Add Session</Button></div><Separator /><div><h3 className="text-lg font-medium mb-2">Features</h3>{featureFields.map((field, index) => (<div key={field.id} className="grid grid-cols-3 gap-2 items-end mb-2 p-2 border rounded-lg"><FormField control={programForm.control} name={`features.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Feature Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={programForm.control} name={`features.${index}.icon`} render={({ field }) => (<FormItem><FormLabel>Icon</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select icon" /></SelectTrigger></FormControl><SelectContent><ScrollArea className="h-72">{iconNames.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}</ScrollArea></SelectContent></Select><FormMessage /></FormItem>)} /><Button type="button" variant="ghost" onClick={() => removeFeature(index)}><LucideIcons.Trash2 className="h-4 w-4" /></Button></div>))}<Button type="button" variant="outline" size="sm" onClick={() => appendFeature({ name: '', icon: 'Check' })}><LucideIcons.PlusCircle className="mr-2 h-4 w-4" />Add Feature</Button></div><div className="flex gap-2"><Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">{editingProgram ? 'Update Program' : 'Publish Program'}</Button>{editingProgram && <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>}</div></form></Form></CardContent></Card>
                                                    </TabsContent>
                                                    <TabsContent value="sessionView" className="mt-4">
                                                        <Card><CardHeader><CardTitle>Existing Education Programs</CardTitle></CardHeader><CardContent className="space-y-4">
                                                            {educationPrograms.map((program) => (
                                                                <div key={program.id} className="flex items-center justify-between p-2 border rounded-md">
                                                                    <p className="font-medium">{program.title}</p>
                                                                    <div className="flex gap-2">
                                                                        <Button variant="outline" size="sm" onClick={() => handleEditProgram(program)}><LucideIcons.Edit className="mr-2 h-4 w-4" />Edit</Button>
                                                                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete({ type: 'program', id: program.id })}><LucideIcons.Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {educationPrograms.length === 0 && <p className="text-center text-muted-foreground py-4">No education programs found.</p>}
                                                        </CardContent></Card>
                                                    </TabsContent>
                                                </Tabs>
                                            </TabsContent>
                                        </>

                                    )}
                                    <TabsContent value="events" className="m-0 space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h1 className="text-3xl font-bold font-headline">Event Management</h1>
                                                <p className="text-muted-foreground">Manage dynamic events shown on the home page.</p>
                                            </div>
                                            <Button onClick={() => {
                                                setEventModalMode('create');
                                                setSelectedEventId(undefined);
                                                setEventModalOpen(true);
                                            }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                                <LucideIcons.Plus className="mr-2 h-4 w-4" />
                                                Create Event
                                            </Button>
                                        </div>

                                        <div className="rounded-md border w-[95vw] lg:w-full">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Event</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Registration</TableHead>
                                                        <TableHead>Created</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isLoadingEvents ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="h-24 text-center">
                                                                <LucideIcons.Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : events.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                                No events found.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        events.map((event) => (
                                                            <TableRow key={event.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-16 relative rounded-md overflow-hidden bg-muted">
                                                                            {event.image_url ? (
                                                                                <Image src={event.image_url} width={128} height={128} alt={event.title} className="object-cover w-full h-full" />
                                                                            ) : (
                                                                                <LucideIcons.Image className="h-5 w-5 m-auto mt-2.5 text-muted-foreground" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium">{event.title}</div>
                                                                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{event.description}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            checked={event.visible}
                                                                            onCheckedChange={() => handleToggleEventField(event.id, 'visible', event.visible)}
                                                                        />
                                                                        <span className="text-sm">{event.visible ? 'Visible' : 'Hidden'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            checked={event.register_enabled}
                                                                            onCheckedChange={() => handleToggleEventField(event.id, 'register_enabled', event.register_enabled)}
                                                                        />
                                                                        <span className="text-sm">{event.register_enabled ? 'Enabled' : 'Disabled'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {new Date(event.created_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button variant="outline" size="sm" onClick={() => {
                                                                            setEventModalMode('edit');
                                                                            setSelectedEventId(event.id);
                                                                            setEventModalOpen(true);
                                                                        }}>
                                                                            Edit
                                                                        </Button>
                                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEvent(event.id)}>
                                                                            <LucideIcons.Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="settings" className="mt-0">
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader>
                                                <CardTitle>Account Settings</CardTitle>
                                                <CardDescription>Manage your account and payment information.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-8">
                                                <Form {...settingsForm}>
                                                    <form
                                                        onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}
                                                        className="space-y-4"
                                                    >
                                                        <div>
                                                            <h3 className="text-lg font-medium mb-4">Profile</h3>
                                                            <div className="space-y-4">
                                                                {/* Name Field */}
                                                                <FormField
                                                                    control={settingsForm.control}
                                                                    name="name"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Full Name</FormLabel>
                                                                            <FormControl>
                                                                                <Input placeholder="Your full name" {...field} />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                {/* Email Field */}
                                                                <FormField
                                                                    control={settingsForm.control}
                                                                    name="email"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Email</FormLabel>
                                                                            <div className="relative">
                                                                                <FormControl>
                                                                                    <Input
                                                                                        type="email"
                                                                                        placeholder="your@email.com"
                                                                                        {...field}
                                                                                        readOnly={!isEditingEmail}
                                                                                        className="pr-28" // make space for buttons
                                                                                    />
                                                                                </FormControl>

                                                                                {/* Buttons inside input */}
                                                                                <div className="absolute inset-y-0 right-3 flex items-center gap-1">
                                                                                    {emailChangeRequested ? (
                                                                                        // Step 3: After Change request → Resend
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="text-xs flex items-center gap-1"
                                                                                            disabled={loadingResend}
                                                                                            onClick={() => handleResendEmail(field.value)}
                                                                                        >
                                                                                            {loadingResend ? (
                                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                                            ) : (
                                                                                                "Resend"
                                                                                            )}
                                                                                        </Button>
                                                                                    ) : !isEditingEmail ? (
                                                                                        // Step 1: Default → Edit
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="link"
                                                                                            className="p-0 h-auto text-sm"
                                                                                            onClick={() => {
                                                                                                setIsEditingEmail(true);
                                                                                                setEmailChangeRequested(false); // reset state
                                                                                            }}
                                                                                        >
                                                                                            Edit
                                                                                        </Button>
                                                                                    ) : (
                                                                                        // Step 2: While editing → Change
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="default"
                                                                                            size="sm"
                                                                                            className="text-xs flex items-center gap-1"
                                                                                            disabled={loadingChange}
                                                                                            onClick={async () => {
                                                                                                await handleChangeEmail(field.value);
                                                                                                setEmailChangeRequested(true);  // ✅ Resend will show
                                                                                                setIsEditingEmail(false);       // input locks, but still shows Resend
                                                                                            }}
                                                                                        >
                                                                                            {loadingChange ? (
                                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                                            ) : (
                                                                                                "Change"
                                                                                            )}
                                                                                        </Button>
                                                                                    )}
                                                                                </div>

                                                                            </div>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>

                                                        <Button
                                                            type="submit"
                                                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                                                        >
                                                            Save Changes
                                                        </Button>
                                                    </form>
                                                </Form>

                                                {(authProvider === 'local') && (
                                                    <>
                                                        <Separator />
                                                        <PasswordChangeForm />
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </div>
                            </SidebarInset>
                        </Tabs>
                    </SidebarProvider>
                </div>
                {
                    commentingSubmissionId !== null && (
                        <CommentSection
                            submissionId={commentingSubmissionId}
                            onClose={() => setCommentingSubmissionId(null)}
                        />
                    )
                }
                <SubmissionDetailsModal
                    submission={selectedSubmission}
                    onOpenChange={(isOpen) => !isOpen && setSelectedSubmission(null)}
                />
                <EventModal
                    isOpen={isEventModalOpen}
                    onOpenChange={setEventModalOpen}
                    eventId={selectedEventId}
                    mode={eventModalMode}
                    onUpdated={fetchEvents}
                />
                <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the user account and remove their data from our servers.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (userToDelete) { handleDeleteUser(userToDelete.uid); setUserToDelete(null); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                <AlertDialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will {userToBan?.status === 'banned' ? "unban" : "ban"} the user, {userToBan?.status === 'banned' ? "allowing" : "preventing"} them from logging in. Do you want to continue?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (userToBan) { handleToggleBanUser(userToBan.uid); setUserToBan(null); } }}>{userToBan?.status === 'banned' ? "Unban User" : "Ban User"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the {itemToDelete?.type}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={!!selectedUserForDetails} onOpenChange={(open) => !open && setSelectedUserForDetails(null)}>
                    <DialogContent className="w-[80vw] max-w-[80vw]  max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>
                                Detailed information about {selectedUserForDetails?.name}
                            </DialogDescription>
                        </DialogHeader>

                        {isLoadingUserDetails ? (
                            <div className="flex justify-center items-center h-48">
                                <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : userDetailsData ? (
                            <div className="space-y-6 overflow-y-auto pr-2">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Account Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Name</p>
                                            <p className="font-medium">{userDetailsData.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p className="font-medium break-words">{userDetailsData.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Role</p>
                                            <Badge className="lowercase">{userDetailsData.role}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <Badge variant={
                                                userDetailsData.status === 'banned' ? 'destructive' :
                                                    userDetailsData.status === 'active' ? 'default' : 'secondary'
                                            } className="lowercase">
                                                {userDetailsData.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Auth Provider</p>
                                            <p className="font-medium capitalize">{userDetailsData.auth_provider || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Founder Role</p>
                                            {
                                                userDetailsData.founder_role === "Solve Organisation's challenge" ? (
                                                    <p className="font-medium">{"Solve Organisation's challenge"}</p>
                                                ) : (
                                                    <p className="font-medium">{userDetailsData.founder_role || 'N/A'}</p>
                                                )
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Created At</p>
                                            <p className="font-medium">
                                                {userDetailsData.created_at ? new Date(userDetailsData.created_at).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Last Login</p>
                                            <p className="font-medium">
                                                {userDetailsData.last_login ? new Date(userDetailsData.last_login).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {userDetailsData.founder_role && <div className="my-10">
                                    <Separator />
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold mb-3">Subscription</h3>
                                        <SubscriptionDetails user={userDetailsData} founder_role={userDetailsData.founder_role} />
                                    </div>
                                </div>}

                                {/* <div className="mx-2">
                                    <p className="text-sm text-muted-foreground">Role</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={userDetailsData.role}
                                                onValueChange={(value) => {
                                                    if (value === 'founder' && !selectedFounderRole) {
                                                        setSelectedFounderRole("Solve Organisation's challenge");
                                                    }
                                                    handleRoleUpdate(value);
                                                }}
                                                disabled={isUpdatingRole}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="founder">Founder</SelectItem>
                                                    <SelectItem value="mentor">Mentor</SelectItem>
                                                    <SelectItem value="incubator">Incubator</SelectItem>
                                                    <SelectItem value="organisation">Organization</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {isUpdatingRole && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                        </div>

                                        {userDetailsData.role === 'founder' && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">Founder Role</p>
                                                <div className="flex items-start gap-2">
                                                    <Select
                                                        value={selectedFounderRole}
                                                        onValueChange={handleFounderRoleChange}
                                                        disabled={isUpdatingRole}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select founder role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Solve Organisation's challenge">
                                                                <div className="flex items-center gap-2">
                                                                    {"Solve Organisation's challenge"}
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="List a technology for licensing">
                                                                <div className="flex items-center gap-2">
                                                                    List a technology for licensing
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Submit an innovative idea">
                                                                <div className="flex items-center gap-2">
                                                                    Submit an innovative idea
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        onClick={() => handleRoleUpdate('founder')}
                                                        disabled={!isFounderRoleModified || isUpdatingRole}
                                                        size="sm"
                                                        className="whitespace-nowrap"
                                                    >
                                                        {isUpdatingRole ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : null}
                                                        Update
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div> */}

                                <Separator />

                                {/* Payment Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                                    {userDetailsData.payment_methods && userDetailsData.payment_methods.length > 0 ? (
                                        <div className="space-y-6">
                                            {userDetailsData.payment_methods
                                                .sort((a: any, b: any) => {
                                                    const order = { 'primary': 1, 'secondary': 2, 'others': 3 };
                                                    return (order[a.payment_category as keyof typeof order] || 99) - (order[b.payment_category as keyof typeof order] || 99);
                                                })
                                                .map((payment: any) => (
                                                    <div key={payment.id} className="border rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Badge variant="outline" className="uppercase font-semibold">
                                                                {payment.payment_category}
                                                            </Badge>
                                                            <Badge className="uppercase">
                                                                {payment.payment_method}
                                                            </Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {payment.paypal_email && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">PayPal Email</p>
                                                                    <p className="font-medium">{payment.paypal_email}</p>
                                                                </div>
                                                            )}
                                                            {payment.account_holder && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">Account Holder</p>
                                                                    <p className="font-medium">{payment.account_holder}</p>
                                                                </div>
                                                            )}
                                                            {payment.account_number && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">Account Number</p>
                                                                    <p className="font-medium">{payment.account_number}</p>
                                                                </div>
                                                            )}
                                                            {payment.ifsc_code && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">IFSC Code</p>
                                                                    <p className="font-medium">{payment.ifsc_code}</p>
                                                                </div>
                                                            )}
                                                            {payment.upi_id && (
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">UPI ID</p>
                                                                    <p className="font-medium">{payment.upi_id}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">No payment methods configured</p>
                                    )}
                                </div>

                                <Separator />

                                {/* Activity Statistics */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Activity Statistics</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Challenge Submissions</p>
                                            <p className="text-2xl font-bold">{userDetailsData.activity.submission_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Challenge Solutions</p>
                                            <p className="text-2xl font-bold">{userDetailsData.activity.solution_count}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* MSME Profile Information (if applicable) */}
                                {userDetailsData.msme_profile && (
                                    <>
                                        <Separator />
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-lg font-semibold">Organisation Profile</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Profile Edit Access:</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={userDetailsData.msme_profile.is_editable || false}
                                                            onChange={async (e) => {
                                                                const newValue = e.target.checked;
                                                                try {
                                                                    const token = localStorage.getItem('token');
                                                                    const response = await fetch(`${API_BASE_URL}/api/admin/msme-profile/${userDetailsData.uid}/toggle-editable`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({ is_editable: newValue })
                                                                    });

                                                                    if (response.ok) {
                                                                        setUserDetailsData({
                                                                            ...userDetailsData,
                                                                            msme_profile: {
                                                                                ...userDetailsData.msme_profile,
                                                                                is_editable: newValue
                                                                            }
                                                                        });
                                                                        toast({
                                                                            title: "Success",
                                                                            description: `Profile editing ${newValue ? 'enabled' : 'disabled'} for this MSME user.`
                                                                        });
                                                                    } else {
                                                                        throw new Error('Failed to update');
                                                                    }
                                                                } catch (error) {
                                                                    toast({
                                                                        variant: 'destructive',
                                                                        title: "Error",
                                                                        description: "Failed to update profile edit access."
                                                                    });
                                                                }
                                                            }}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Company Name</p>
                                                    <p className="font-medium">{userDetailsData.msme_profile.company_name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Affiliated By</p>
                                                    <p className="font-medium">{userDetailsData.msme_profile.affiliated_by || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Phone</p>
                                                    <p className="font-medium">{userDetailsData.msme_profile.phone_number || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Website</p>
                                                    {userDetailsData.msme_profile.website_url ? (
                                                        <a
                                                            href={
                                                                userDetailsData.msme_profile.website_url.startsWith('http://') ||
                                                                    userDetailsData.msme_profile.website_url.startsWith('https://')
                                                                    ? userDetailsData.msme_profile.website_url
                                                                    : `https://${userDetailsData.msme_profile.website_url}`
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-primary hover:underline"
                                                        >
                                                            {userDetailsData.msme_profile.website_url}
                                                        </a>
                                                    ) : (
                                                        <p className="font-medium">N/A</p>
                                                    )}
                                                </div>
                                                {userDetailsData.msme_profile.description && (
                                                    <div className="col-span-2">
                                                        <p className="text-sm text-muted-foreground">Description</p>
                                                        <p className="font-medium line-clamp-3">{userDetailsData.msme_profile.description}</p>
                                                    </div>
                                                )}
                                                {(userDetailsData.msme_profile.linkedin_url || userDetailsData.msme_profile.x_url || userDetailsData.msme_profile.instagram_url) && (
                                                    <div className="col-span-2">
                                                        <p className="text-sm text-muted-foreground mb-2">Social Media</p>
                                                        <div className="flex gap-2">
                                                            {userDetailsData.msme_profile.linkedin_url && (
                                                                <a href={userDetailsData.msme_profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                                    LinkedIn
                                                                </a>
                                                            )}
                                                            {userDetailsData.msme_profile.x_url && (
                                                                <a href={userDetailsData.msme_profile.x_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                                    X (Twitter)
                                                                </a>
                                                            )}
                                                            {userDetailsData.msme_profile.instagram_url && (
                                                                <a href={userDetailsData.msme_profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                                    Instagram
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Failed to load user details</p>
                        )}
                    </DialogContent>
                </Dialog>

            </DialogContent >
        </Dialog >
    );
}

const PlansManagementView = () => {
    const { toast } = useToast();
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null);

    const fetchPlans = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/plans`);
            if (response.ok) {
                const data = await response.json();
                setPlans(data.plans || data);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch plans' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to server' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const handleUpdatePlan = async (planId: number, data: any) => {
        setUpdatingPlanId(planId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                toast({ title: 'Success', description: 'Plan updated successfully' });
                fetchPlans();
            } else {
                const errorData = await response.json();
                toast({ variant: 'destructive', title: 'Update Failed', description: errorData.error || 'Failed to update plan' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not update plan' });
        } finally {
            setUpdatingPlanId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LucideIcons.Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-1">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight">Plan Management</h2>
                <p className="text-muted-foreground">Manage all plan details including pricing, features, and promotional content.</p>
            </div>

            <div className="grid gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description || "No description provided"}</CardDescription>
                                </div>
                                <Badge variant={plan.is_active ? "default" : "secondary"}>
                                    {plan.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form className="grid grid-cols-1 gap-6" onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);

                                // Parse features from textarea (one per line)
                                const featuresText = formData.get('features') as string;
                                const features = featuresText
                                    .split('\n')
                                    .map(f => f.trim())
                                    .filter(f => f.length > 0);

                                const updates = {
                                    price_in_paise: Math.round(parseFloat(formData.get('price_in_inr') as string) * 100),
                                    tax_percentage: parseInt(formData.get('tax_percentage') as string),
                                    duration_days: parseInt(formData.get('duration_days') as string),
                                    description: formData.get('description') as string,
                                    features: features,
                                    name: formData.get('name') as string,
                                    tag: formData.get('tag') as string || null,
                                    originally: formData.get('originally') as string || null,
                                    offer: formData.get('offer') as string || null,
                                };

                                handleUpdatePlan(plan.id, updates);
                            }}>
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Plan Name</label>
                                            <Input
                                                name="name"
                                                type="text"
                                                defaultValue={plan.name}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tag (Optional)</label>
                                            <Input
                                                name="tag"
                                                type="text"
                                                defaultValue={plan.tag || ""}
                                                placeholder="e.g., Popular, Best Value"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Input
                                                name="description"
                                                type="text"
                                                defaultValue={plan.description || ""}
                                                placeholder="Brief description of the plan"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Pricing Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Pricing & Duration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Base Price (INR)</label>
                                            <Input
                                                name="price_in_inr"
                                                type="number"
                                                defaultValue={plan.price_in_paise / 100}
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">GST Percentage (%)</label>
                                            <Input
                                                name="tax_percentage"
                                                type="number"
                                                defaultValue={plan.tax_percentage || 18}
                                                required
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Duration (Days)</label>
                                            <Input
                                                name="duration_days"
                                                type="number"
                                                defaultValue={plan.duration_days}
                                                required
                                                min="1"
                                            />
                                        </div>
                                    </div>

                                    {/* Promotional Pricing */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Original Price (Optional)</label>
                                            <Input
                                                name="originally"
                                                type="text"
                                                defaultValue={plan.originally || ""}
                                                placeholder="e.g., ₹3999"
                                            />
                                            <p className="text-xs text-muted-foreground">Display strikethrough price for promotions</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Offer Label (Optional)</label>
                                            <Input
                                                name="offer"
                                                type="text"
                                                defaultValue={plan.offer || ""}
                                                placeholder="e.g., 25% OFF"
                                            />
                                            <p className="text-xs text-muted-foreground">Display promotional badge</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Features Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Features</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Plan Features (one per line)</label>
                                        <textarea
                                            name="features"
                                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            defaultValue={Array.isArray(plan.features) ? plan.features.join('\n') : ''}
                                            placeholder="Enter each feature on a new line"
                                        />
                                        <p className="text-xs text-muted-foreground">Each line will be displayed as a separate feature bullet point</p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={updatingPlanId === plan.id} className="w-full md:w-auto">
                                        {updatingPlanId === plan.id ? (
                                            <>
                                                <LucideIcons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

const staticChartData = [
    { year: 2025, activity: 0 }, { year: 2026, activity: 0 }, { year: 2027, activity: 0 },
    { year: 2028, activity: 0 }, { year: 2029, activity: 0 }, { year: 2030, activity: 0 },
];

const chartConfig = {
    activity: { label: "Activity", color: "hsl(var(--chart-1))" },
};
