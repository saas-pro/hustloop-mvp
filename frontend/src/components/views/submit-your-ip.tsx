
import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { View, DashboardTab, UserRole, AppUser, BlogPost, EducationProgram, NewsletterSubscriber } from "@/app/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL } from "@/lib/api";
import PasswordChangeForm from './password-change-form';
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useAuth } from "@/providers/AuthContext";


const settingsFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const blogPostSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    excerpt: z.string().min(10, "Excerpt must be at least 10 characters"),
    content: z.string().min(50, "Content must be at least 50 characters"),
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
    description: z.string().min(10, "Description is required").max(5000, "Description must not exceed 5000 characters"),
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
    authProvider: AuthProvider;
    hasSubscription: boolean;
    setActiveView: (view: View) => void;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface TechTransferIP {
    id: number;
    ipTitle: string;
    firstName: string;
    lastName: string;
    description: string;
    inventorName: string;
    organization: string;
    supportingFile?: string;
    approvalStatus: string;
    created_by?: number;
}


const iconNames = Object.keys(LucideIcons).filter(k => k !== 'createLucideIcon' && k !== 'icons' && k !== 'default');


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

export default function SubmitIPDashboard({ isOpen, setUser, onOpenChange, user, userRole, authProvider, hasSubscription, setActiveView }: DashboardViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<DashboardTab>("engagements");
    const [adminContentTab, setAdminContentTab] = useState('blog');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailChangeRequested, setEmailChangeRequested] = useState(false);



    // Admin state
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [userToBan, setUserToBan] = useState<AppUser | null>(null);


    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);

    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

    const [educationPrograms, setEducationPrograms] = useState<EducationProgram[]>([]);
    const [editingProgram, setEditingProgram] = useState<EducationProgram | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{ type: 'blog' | 'program'; id: number } | null>(null);
    const [loadingChange, setLoadingChange] = useState(false)
    const [loadingResend, setLoadingResend] = useState(false)

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
    const { fields: sessionFields, append: appendSession, remove: removeSession } = useFieldArray({ control: programForm.control, name: "sessions" });
    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({ control: programForm.control, name: "features" });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10; // Set your desired items per page
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

    // Dependency array ensures the fetch runs when these values change

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
            if (response.ok) {
                const data = await response.json();

                setTechTransferIps(data.ips || []);
            } else {
                toast({ variant: 'destructive', title: 'Failed to fetch IPs' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error' });
        } finally {
            setIsLoadingIps(false);
        }
    }, [toast]);

    useEffect(() => {
        if (userRole === 'admin') {
            if (activeTab === 'users') fetchUsers(1, 10);
            if (activeTab === 'blog') fetchBlogPosts();
            if (activeTab === 'sessions') fetchEducationPrograms();
            if (activeTab === 'ip/technologies') fetchIps();
            if (activeTab === 'subscribers') fetchSubscribers();
        }
    }, [activeTab, userRole, fetchUsers, fetchBlogPosts, fetchEducationPrograms, fetchSubscribers, fetchIps]);

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

            // 2. Update other profile info (name, etc.)
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
                    // Update only non-email fields locally
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


    const [isTechTransfer, setIsTechTransfer] = useState(false)
    const { founderRole } = useAuth();
    useEffect(() => {
        if (founderRole === "List a technology for licensing") {
            setIsTechTransfer(true);
        } else {
            setIsTechTransfer(false)
        }
    }, [founderRole]);
    const adminTabs = ["overview", "users", "subscribers", "ip/technologies", "blog", "sessions", "settings"];
    const founderTabs = ["overview", "organisation", "incubators", "mentors", "submission", "settings"];
    const availableTabs = userRole === 'admin' ? adminTabs : founderTabs;
    const techTransferTabs = ["overview", "submission", "engagements", "mentors", "settings"];
    const filteredTabs = isTechTransfer ? techTransferTabs : availableTabs
    const tabsToRender = filteredTabs.filter(tab => tab !== "overview");
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
        techTransferFile.current!.click(); // Trigger hidden input
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
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(techtransferData).forEach(([key, value]) => {
            if (value) {
                // handle File separately
                if (key === "supportingFile" && value instanceof File) {
                    data.append(key, value);
                } else if (typeof value === "string") {
                    data.append(key, value);
                }
            }
        });
        data.append("contactEmail", user.email);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/techtransfer`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`, // attach token
                },
                body: data, // FormData for file uploads
            });

            if (res.ok) {
                toast({
                    title: "Submission successful",
                    description: "Your IP has been submitted for review.",
                });

                // Reset form after success
                setTechtransferData({
                    ipTitle: "",
                    firstName: "",
                    lastName: "",
                    description: "",
                    inventorName: "",
                    organization: "",
                    supportingFile: null,
                });
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
            setEmptyToastShown(false); // reset
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

                    // Apply local status update if it exists
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

        // This function handles the local state change
        const handleActionClick = (ipId: number, newStatus: "approved" | "rejected" | "needInfo") => {
            setStatusUpdates((prev) => ({
                ...prev,
                [ipId]: newStatus,
            }));
        };

        const handleUpdateStatus = async (ipId: number) => {
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

        return { groupedIps, statusUpdates, handleActionClick, handleUpdateStatus, isUpdating };
    };

    const { groupedIps, statusUpdates, handleActionClick, handleUpdateStatus, isUpdating } = useGroupedIps(techTransferIps)
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0">
                {/* Header stays fixed */}
                <DialogHeader className="p-6 shrink-0">
                    <DialogTitle className="text-3xl font-bold font-headline capitalize">
                        {userRole} Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        Welcome back, {user.name}! Here&apos;s an overview of your startup journey.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col min-h-0 p-4 pt-0">
                    <Tabs value={activeTab}
                        className="flex flex-col flex-grow min-h-0">
                        <TabsList
                            className={`
                                grid 
                                grid-cols-3        /* 📱 mobile → 2 per row */
                                sm:grid-cols-3     /* tablet → 3 per row */
                                md:grid-cols-4     /* medium → 4 per row */
                                ${isTechTransfer ? "lg:grid-cols-4" : (userRole === 'admin' ? "lg:grid-cols-6" : "lg:grid-cols-5")}
                                gap-2 h-fit
                                items-stretch       
                                bg-muted/50 rounded-lg p-1
                                mb-4 sm:mb-6 lg:mb-10 z-10`}
                        >

                            {tabsToRender.map((tab) => {
                                const Icon = (
                                    LucideIcons[
                                    tab === "organisation"
                                        ? "Briefcase"
                                        : tab === "incubators"
                                            ? "Lightbulb"
                                            : tab === "ip/technologies"
                                                ? "FileSignature"
                                                : tab === "engagements"
                                                    ? "Handshake"
                                                    : tab === "mentors"
                                                        ? "Users"
                                                        : tab === "submission"
                                                            ? "FileText"
                                                            : tab === "settings"
                                                                ? "Settings"
                                                                : tab === "users"
                                                                    ? "User"
                                                                    : tab === "subscribers"
                                                                        ? "Mail"
                                                                        : "BookOpen"
                                    ] || LucideIcons.HelpCircle
                                ) as React.ComponentType<LucideProps>;

                                return (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        onClick={() => setActiveTab(tab as DashboardTab)}
                                        className="
                                    flex items-center justify-start md:justify-center gap-2 
                                    rounded-md bg-card 
                                    text-sm sm:text-base
                                    data-[state=active]:bg-accent data-[state=active]:text-accent-foreground 
                                    hover:bg-accent/20 transition"
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{tab}</span>
                                    </TabsTrigger>

                                );
                            })}
                        </TabsList>
                        <div className="flex-grow overflow-y-auto  pb-6 w-full">
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                    <CardHeader>
                                        <CardTitle>Activity Overview</CardTitle>
                                        <CardDescription>Your activity over the last 6 months.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                            <RechartsBarChart data={chartData}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis
                                                    dataKey="month"
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    axisLine={false}
                                                />
                                                <YAxis />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                                <Bar dataKey="activity" fill="var(--color-activity)" radius={4} />
                                            </RechartsBarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
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
                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
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
                                                <div className="space-y-2">
                                                    {mySubmissions.map((submission) => (
                                                        <div key={submission.id} className="p-2 border rounded">
                                                            <p><strong>IP Title:</strong> {submission.ipTitle}</p>
                                                            <p><strong>Description:</strong> {submission.description}</p>
                                                            <p><strong>Inventor:</strong> {submission.firstName} {submission.lastName}</p>
                                                            <p><strong>Organization:</strong> {submission.organization}</p>
                                                            <p><strong>Status:</strong> {submission.approvalStatus}</p>
                                                            {submission.supportingFile && (
                                                                <a
                                                                    href={`${API_BASE_URL}/${submission.supportingFile.replace(/^app\//, "")}`}
                                                                    target="_blank"
                                                                    className="text-blue-500 underline"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    View Document
                                                                </a>
                                                            )}

                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="engagements" className="mt-0">
                                {(
                                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                        <CardHeader>
                                            <CardTitle>IP Submission Form</CardTitle>
                                            <CardDescription>
                                                Submit details of your Intellectual Property for review and engagement.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleTechTransferSubmit} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">First Name</label>
                                                        <Input
                                                            name="firstName"
                                                            value={techtransferData.firstName}
                                                            onChange={handleInputChange}
                                                            placeholder="First Name"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Last Name</label>
                                                        <Input
                                                            name="lastName"
                                                            value={techtransferData.lastName}
                                                            onChange={handleInputChange}
                                                            placeholder="Last Name"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">IP Title</label>
                                                    <Input
                                                        name="ipTitle"
                                                        value={techtransferData.ipTitle}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter your IP title"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Description</label>
                                                    <Textarea
                                                        name="description"
                                                        value={techtransferData.description}
                                                        onChange={handleInputChange}
                                                        placeholder="Briefly describe your IP"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Inventor Name</label>
                                                        <Input
                                                            name="inventorName"
                                                            value={techtransferData.inventorName}
                                                            onChange={handleInputChange}
                                                            placeholder="Inventor full name"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Organization</label>
                                                        <Input
                                                            name="organization"
                                                            value={techtransferData.organization}
                                                            onChange={handleInputChange}
                                                            placeholder="Organization / Institution"
                                                        />
                                                    </div>
                                                </div>

                                                {/* File Upload */}
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Upload Supporting Document</label>
                                                    <div className="relative w-full">
                                                        <button
                                                            type="button"
                                                            onClick={handleButtonClick}
                                                            className=" px-4 py-2 bg-primary text-white border rounded-lg"
                                                        >
                                                            Upload File
                                                        </button>

                                                        {/* This acts like a :before pseudo-element */}
                                                        <div className="absolute bottom-0 left-0 w-full h-fit bg-gray-700"></div>
                                                    </div>


                                                    <input
                                                        ref={techTransferFile}
                                                        type="file"
                                                        name="supportingFile"
                                                        onChange={handleFileChange}
                                                        accept=".pdf,.doc,.docx"
                                                        style={{ display: "none" }} // hide the default input
                                                    />

                                                    {techtransferData.supportingFile && (
                                                        <p>Selected file: {techtransferData.supportingFile.name}</p>
                                                    )}
                                                </div>

                                                <Button type="submit" className="w-full mt-4">
                                                    Submit IP
                                                </Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {userRole === "admin" && (
                                <>
                                    <TabsContent value="users" className="mt-0">
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader>
                                                <CardTitle>User Management</CardTitle>
                                                <CardDescription>Approve, ban, or delete user accounts.</CardDescription>

                                            </CardHeader>
                                            <CardContent>
                                                {isLoadingUsers ? (
                                                    <div className="flex justify-center items-center h-48">
                                                        <LucideIcons.Loader2 className="h-8 w-8 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>User</TableHead>
                                                                    <TableHead>Role</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                    <TableHead>Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {users.map(u => (
                                                                    <TableRow key={u.uid}>
                                                                        <TableCell>
                                                                            <div className="font-medium">{u.name}</div>
                                                                            <div className="text-sm text-muted-foreground">{u.email}</div>
                                                                        </TableCell>
                                                                        <TableCell className="capitalize">{u.role}</TableCell>
                                                                        <TableCell>
                                                                            <div className="flex flex-col gap-1">
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
                                                                                    className="flex-1 min-w-[90px]"
                                                                                >
                                                                                    <LucideIcons.Ban className="mr-2 h-4 w-4" />
                                                                                    {u.status === 'banned' ? "Unban" : "Ban"}
                                                                                </Button>

                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    onClick={() => setUserToDelete(u)}
                                                                                    className="flex-1 min-w-[90px]"
                                                                                >
                                                                                    <LucideIcons.Trash2 className="mr-2 h-4 w-4" />
                                                                                    Delete
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>

                                                        {/* Pagination Controls */}
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center mt-6">
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

                                                                        {/* Page Numbers */}
                                                                        {Array.from({ length: totalPages }, (_, i) => {
                                                                            const pageNumber = i + 1;
                                                                            return (
                                                                                <PaginationItem key={pageNumber}>
                                                                                    <PaginationLink
                                                                                        href="#"
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            handlePageChange(pageNumber);
                                                                                        }}
                                                                                        isActive={currentPage === pageNumber}
                                                                                        className="cursor-pointer"
                                                                                    >
                                                                                        {pageNumber}
                                                                                    </PaginationLink>
                                                                                </PaginationItem>
                                                                            );
                                                                        })}

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
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="ip/technologies" className="mt-0">
                                        {isLoadingIps ? (
                                            <div className="flex justify-center items-center h-48">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                            </div>
                                        ) : techTransferIps.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">
                                                No IP submissions found.
                                            </p>
                                        ) : (
                                            <Accordion type="single" collapsible className="w-full">
                                                {Object.keys(groupedIps).map((organizationName) => (
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
                                                                {groupedIps[organizationName].map((ip) => (
                                                                    <div key={ip.id} className="border rounded-md p-4 space-y-2">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                                            <p className="font-semibold text-lg text-foreground">{ip.ipTitle}</p>
                                                                            <Badge
                                                                                variant={
                                                                                    ip.approvalStatus === "pending"
                                                                                        ? "secondary"
                                                                                        : ip.approvalStatus === "approved"
                                                                                            ? "default"
                                                                                            : ip.approvalStatus === "needInfo"
                                                                                                ? "secondary"
                                                                                                : "destructive"


                                                                                }
                                                                                className="mt-2 sm:mt-0"
                                                                            >
                                                                                {ip.approvalStatus}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground space-y-1">
                                                                            <p>
                                                                                <strong>Inventor:</strong> {ip.firstName} {ip.lastName}
                                                                            </p>
                                                                            <div className="max-h-24 overflow-y-auto pr-2">
                                                                                <p>
                                                                                    <strong>Description:</strong> {ip.description}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="pt-4 flex justify-between items-center">
                                                                            {ip.supportingFile && (
                                                                                <a
                                                                                    href={`${API_BASE_URL}/${ip.supportingFile.replace(/^app\//, "")}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    <Button variant="outline" size="sm">
                                                                                        <LucideIcons.Download className="mr-2 h-4 w-4" />
                                                                                        View Document
                                                                                    </Button>
                                                                                </a>
                                                                            )}
                                                                            <div className="flex items-center gap-2 ml-auto">
                                                                                {statusUpdates[ip.id] && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        onClick={() => { handleUpdateStatus(ip.id); }}
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
                                                                                        <Button variant="outline" size="sm">
                                                                                            Actions
                                                                                            <LucideIcons.ChevronDown className="ml-2 h-4 w-4" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end">

                                                                                        <>
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => handleActionClick(ip.id, "approved")}
                                                                                            >
                                                                                                <LucideIcons.CheckCircle className="mr-2 h-4 w-4" />
                                                                                                <span>Approve</span>
                                                                                            </DropdownMenuItem>

                                                                                            <DropdownMenuItem
                                                                                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                                                onClick={() => handleActionClick(ip.id, "rejected")}
                                                                                            >
                                                                                                <LucideIcons.XCircle className="mr-2 h-4 w-4" />
                                                                                                <span>Reject</span>
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem
                                                                                                className="focus:bg-muted"
                                                                                                onClick={() => handleActionClick(ip.id, "needInfo")}
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
                                        )}
                                    </TabsContent>
                                    <TabsContent value="subscribers" className="mt-0">
                                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                            <CardHeader>
                                                <CardTitle>Newsletter Subscribers</CardTitle>
                                                <CardDescription>List of all users subscribed to the newsletter.</CardDescription>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <Button variant="outline" onClick={handleExportCSV}><LucideIcons.Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive"><LucideIcons.Trash className="mr-2 h-4 w-4" /> Reset List</Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete all newsletter subscribers.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleResetSubscribers}>Reset</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {isLoadingSubscribers ? <div className="flex justify-center items-center h-48"><LucideIcons.Loader2 className="h-8 w-8 animate-spin" /></div> : (
                                                    <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Subscribed Date</TableHead></TableRow></TableHeader><TableBody>
                                                        {subscribers.map(sub => (
                                                            <TableRow key={sub.id}>
                                                                <TableCell className="font-medium">{sub.email}</TableCell>
                                                                <TableCell>{new Date(sub.subscribed_at).toLocaleDateString()}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody></Table>
                                                )}
                                                {subscribers.length === 0 && !isLoadingSubscribers && (
                                                    <p className="text-center text-muted-foreground py-8">There are no newsletter subscribers yet.</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="blog" className="mt-0 space-y-6">
                                        <Tabs value={adminContentTab} onValueChange={setAdminContentTab} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="blogCreate" onClick={cancelEdit}>{editingPost ? 'Edit Post' : 'Create New'}</TabsTrigger>
                                                <TabsTrigger value="blogView">View All</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="blogCreate" className="mt-4">
                                                <Card><CardHeader><CardTitle>{editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle></CardHeader><CardContent><Form {...blogForm}><form onSubmit={blogForm.handleSubmit(onBlogSubmit)} className="space-y-4"><FormField control={blogForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={blogForm.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={blogForm.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content</FormLabel><FormControl><Textarea rows={8} {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={blogForm.control} name="image" render={({ field }) => (<FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={blogForm.control} name="hint" render={({ field }) => (<FormItem><FormLabel>Image Hint</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="flex gap-2"><Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">{editingPost ? 'Update Post' : 'Publish Post'}</Button>{editingPost && <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>}</div></form></Form></CardContent></Card>
                                            </TabsContent>
                                            <TabsContent value="blogView" className="mt-4">
                                                <Card><CardHeader><CardTitle>Existing Blog Posts</CardTitle></CardHeader><CardContent className="space-y-4">
                                                    {blogPosts.map((post) => (
                                                        <div key={post.id} className="flex items-center justify-between p-2 border rounded-md">
                                                            <div className="flex items-center gap-4">
                                                                <Image src={post.image} alt={post.title} width={60} height={40} className="rounded-md object-cover" data-ai-hint={post.hint} />
                                                                <p className="font-medium">{post.title}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => handleEditPost(post)}><LucideIcons.Edit className="mr-2 h-4 w-4" />Edit</Button>
                                                                <Button variant="ghost" size="icon" onClick={() => setItemToDelete({ type: 'blog', id: post.id })}><LucideIcons.Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {blogPosts.length === 0 && <p className="text-center text-muted-foreground py-4">No blog posts found.</p>}
                                                </CardContent></Card>
                                            </TabsContent>
                                        </Tabs>
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
                    </Tabs>
                </div>
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
            </DialogContent >
        </Dialog >
    );
}

const chartData = [
    { month: "January", activity: 0 }, { month: "February", activity: 0 }, { month: "March", activity: 0 },
    { month: "April", activity: 0 }, { month: "May", activity: 0 }, { month: "June", activity: 0 },
];

const chartConfig = {
    activity: { label: "Activity", color: "hsl(var(--chart-1))" },
};
