
"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray, SubmitHandler, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LayoutDashboard, FileText, User, Settings, CheckCircle, Building2, Clock, Copy, XCircle, Trash2, PlusCircle, Loader2, Lock, Terminal } from "lucide-react";
import type { MsmeDashboardTab, Submission, Comment, View } from "@/app/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SubmissionDetailsModal from "./submission-details-modal";
import { API_BASE_URL } from "@/lib/api";
import PasswordChangeForm from './password-change-form';
import Script from "next/script";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { format, addDays } from "date-fns";
import { useAuth } from "@/providers/AuthContext";



type User = {
    name: string;
    email: string;
}
type AuthProvider = 'local' | 'google';

// Profile form schema
const profileFormSchema = z.object({
    name: z.string().min(1, "Company name is required"),
    sector: z.string().min(1, "Sector is required"),
    short_description: z.string().min(1, "A short description is required")
});

// Add the new challengeType field to your Zod schema
const collaborationSchema = z.object({
    title: z.string().min(3, { message: "Title is required." }).max(35, "Title must not exceed 35 characters."),
    description: z.string().min(10, { message: "Description is required." }).max(5000, { message: "Description must not exceed 5000 characters." }),
    lookingFor: z.string().min(1, { message: "What you are looking for is required." }),
    rewardAmount: z.number().min(0, { message: "Reward amount cannot be negative." }).default(0),
    scope: z.array(z.object({ value: z.string().min(2, { message: "Scope cannot be empty." }) })),
    contact: z.object({
        name: z.string().min(2, { message: "Contact name is required." }),
        role: z.string().min(2, { message: "Contact role is required." }),
    }),
    challengeType: z.enum(["corporate", "msme", "government"], {
        errorMap: () => ({ message: "Please select a challenge type." }),
    }),
    durationInDays: z.preprocess(
        (val) => (val === "" ? null : Number(val)),
        z.number()
            .min(1, { message: "Duration must be at least 1 day." })
            .max(365, { message: "Duration cannot exceed 365 days." })
            .nullable()
    ),
    dueDate: z.date().optional(),
});

type collaborationFormValues = z.infer<typeof collaborationSchema>;

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Settings form schema
const settingsFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;


// Sample Data for Submissions
const initialSubmissionsData: Submission[] = [];

interface getUsersCollaborationSchema {
    id: number;
    title: string;
    description: string;
    looking_for: string;
    reward_amount: number | string;
    challenge_type: "corporate" | "msme" | "government";
    duration_in_days: number;
    stage: string;
    contact_name: string;
    contact_role: string;
    scope: string[];
    created_at: Date;
}

// Status Icons
const statusIcons: { [key: string]: React.ReactNode } = {
    'New': <Clock className="h-4 w-4 text-blue-500" />,
    'Under Review': <Clock className="h-4 w-4 text-yellow-500" />,
    'Valid': <CheckCircle className="h-4 w-4 text-green-500" />,
    'Duplicate': <Copy className="h-4 w-4 text-orange-500" />,
    'Rejected': <XCircle className="h-4 w-4 text-red-500" />,
};

const emptyProfile: ProfileFormValues = {
    name: "",
    sector: "",
    short_description: "",
};

interface MsmeDashboardViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: User;
    isLoggedIn: boolean;
    hasSubscription: boolean;
    authProvider: AuthProvider;
    setActiveView: (view: View) => void;
}


const LoginPrompt = ({ setActiveView, contentType }: { setActiveView: (view: View) => void, contentType: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Lock className="h-16 w-16 text-accent mb-6" />
        <h3 className="text-2xl font-bold mb-2">Access required</h3>
        <p className="max-w-md mx-auto text-muted-foreground mb-6">
            Log in or sign up to post your business challenges and connect with solution providers.
        </p>
        <div className="flex gap-4">
            <Button onClick={() => setActiveView('login')}>Login</Button>
            <Button onClick={() => setActiveView('signup')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Sign Up
            </Button>
        </div>
    </div>
);



export default function JoinAsAnMsme({ isOpen, onOpenChange, user, authProvider, isLoggedIn, setActiveView }: MsmeDashboardViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<MsmeDashboardTab>("profile");
    const [submissions, setSubmissions] = useState(initialSubmissionsData);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isMsmerole, setisMsmeRole] = useState(false)
    const { userRole } = useAuth();
    const isMsmeRole = userRole;

    useEffect(() => {
        if (isMsmeRole === "organisation") {
            setisMsmeRole(true)
        }
    }, [isMsmeRole])

    // Profile Form setup
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: emptyProfile,
    });

    const collaborationForm = useForm<collaborationFormValues>({
        resolver: zodResolver(collaborationSchema),
        defaultValues: {
            title: "",
            description: "",
            lookingFor: "",
            rewardAmount: 0,
            scope: [{ value: "" }],
            contact: { name: "", role: "" },
            challengeType: "corporate",
            durationInDays: 0,
            dueDate: new Date(),
        },
    });

    const durationInDays = useWatch({
        control: collaborationForm.control,
        name: "durationInDays",
    });

    const [dueDate, setDueDate] = useState<Date | null>(null);

    useEffect(() => {
        if (durationInDays && durationInDays > 0) {
            const calculatedDate = addDays(new Date(), durationInDays);
            setDueDate(calculatedDate);
        } else {
            setDueDate(null);
        }
    }, [durationInDays]);

    const settingsForm = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            name: user?.name,
            email: user?.email,
        },
    });

    const { fields: scopeFields, append: appendScope, remove: removeScope } = useFieldArray({
        control: collaborationForm.control, name: "scope"
    });
    const [getUsersCollaborationData, setGetUserCollaborationData] = useState<getUsersCollaborationSchema[]>([]);

    const [isEditingCollaboration, setIsEditingCollaboration] = useState(false);
    const [currentEditingCollaborationId, setCurrentEditingCollaborationId] = useState<number | null>(null);
    const [selectedCollaborationToEdit, setSelectedCollaborationToEdit] = useState<getUsersCollaborationSchema | null>(null);

    async function onProfileSubmit(data: ProfileFormValues) {
        const token = localStorage.getItem('token');
        const profileData = {
            ...data
        };
        try {
            const response = await fetch(`${API_BASE_URL}/api/msme-profiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                toast({
                    title: "Profile Created",
                    description: "Your public MSME profile has been saved and is now visible.",
                });
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
        }
    }



    async function onSettingsSubmit(data: SettingsFormValues) {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                toast({ title: "Settings Saved", description: result.message });
                localStorage.setItem('user', JSON.stringify(result.user));
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error || 'An unknown error occurred.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not save settings. Please try again later.' });
        }
    }

    // Submission handling
    // const handleStatusChange = (id: number, status: string) => {
    //     setSubmissions(subs => subs.map(s => s.id === id ? { ...s, status: status as Submission['status'] } : s));
    // };

    // const handleAddComment = (submissionId: number, commentText: string) => {
    //     const newComment: Comment = { id:0,author: 'MSME', text: commentText, timestamp: 'Just now' };
    //     const updatedSubmissions = submissions.map(sub =>
    //         sub.id === submissionId ? { ...sub, comments: [...sub.comments, newComment] } : sub
    //     );
    //     setSubmissions(updatedSubmissions);
    //     setSelectedSubmission(updatedSubmissions.find(s => s.id === submissionId) || null);
    // };


    const overviewStats = {
        new: submissions.filter(s => s.status === 'new').length,
        review: submissions.filter(s => s.status === 'under_review').length,
        valid: submissions.filter(s => s.status === 'solution_accepted_points').length,
    };

    const [isProfileSubmitted, setIsProfileSubmitted] = useState(false);


    async function onCollaborationSubmit(data: collaborationFormValues) {
        const token = localStorage.getItem('token');
        if (!token) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
            return;
        }

        const collaborationData = {
            title: data.title,
            description: data.description,
            looking_for: data.lookingFor,
            reward_amount: data.rewardAmount || 0,
            challenge_type: data.challengeType,
            scopes: data.scope.map((item: { value: string }) => item.value),
            contact_name: data.contact.name,
            contact_role: data.contact.role,
            durationInDays: data.durationInDays,
            dueDate: data.dueDate,
        };


        let url = `${API_BASE_URL}/api/collaborations`;
        let method = "POST";

        if (isEditingCollaboration && currentEditingCollaborationId) {
            url = `${API_BASE_URL}/api/collaborations/${currentEditingCollaborationId}`;
            method = "PUT";
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(collaborationData),
            });

            if (response.ok) {
                toast({
                    title: isEditingCollaboration ? "Collaboration Updated" : "Collaboration Info Saved",
                    description: isEditingCollaboration ? "Your collaboration details have been updated successfully." : "Your collaboration details have been saved successfully.",
                });
                // After successful submission, reset form and editing state
                getUsersCollaboration()
                collaborationForm.reset({
                    title: "",
                    description: "",
                    lookingFor: "",
                    rewardAmount: 0,
                    scope: [{ value: "" }],
                    challengeType: "corporate",
                    durationInDays: 0,
                    contact: {
                        name: "",
                        role: ""
                    },
                });
                setIsEditingCollaboration(false);
                setCurrentEditingCollaborationId(null);
                setSelectedCollaborationToEdit(null);
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: `Failed to ${isEditingCollaboration ? "update" : "save"} collaboration`,
                    description: errorData.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: `Could not ${isEditingCollaboration ? "update" : "save"} collaboration info. Please try again later.`,
            });
        }
    }

    useEffect(() => {
        if (selectedCollaborationToEdit) {

            // Prepare the scope array for react-hook-form
            const formattedScope = selectedCollaborationToEdit.scope.map(s => ({ value: s }));

            // Ensure durationInDays is a number or null/undefined for the input
            const duration = selectedCollaborationToEdit.duration_in_days > 0 ? selectedCollaborationToEdit.duration_in_days : undefined;

            // Calculate dueDate if duration is available
            const calculatedDueDate = duration ? addDays(new Date(selectedCollaborationToEdit.created_at), duration) : undefined;


            collaborationForm.reset({
                title: selectedCollaborationToEdit.title,
                description: selectedCollaborationToEdit.description,
                lookingFor: selectedCollaborationToEdit.looking_for,
                rewardAmount: Number(selectedCollaborationToEdit.reward_amount),
                scope: formattedScope.length > 0 ? formattedScope : [{ value: '' }], // Ensure at least one empty scope field if none exist
                contact: {
                    name: selectedCollaborationToEdit.contact_name,
                    role: selectedCollaborationToEdit.contact_role,
                },
                challengeType: selectedCollaborationToEdit.challenge_type,
                durationInDays: duration,
                dueDate: calculatedDueDate,
            });
            setDueDate(calculatedDueDate || null);// Also update the local dueDate state
        } else {
            // If no collaboration is selected for edit, reset to default new collaboration values
            collaborationForm.reset({
                title: "",
                description: "",
                lookingFor: "",
                rewardAmount: 0,
                scope: [{ value: "" }],
                challengeType: "corporate",
                durationInDays: 0,
                contact: {
                    name: "",
                    role: ""
                },
                dueDate: undefined,
            });
            setDueDate(null);
        }
    }, [selectedCollaborationToEdit, collaborationForm]);

    const getUsersCollaboration = useCallback(async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-users-collaboration`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            setGetUserCollaborationData(result.collaborations);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Network Error', description: 'Could not save settings. Please try again later.' });
        }
    }, [setGetUserCollaborationData, toast]);

    useEffect(() => {
        const checkProfile = async () => {
            const token = localStorage.getItem("token");
            try {
                const response = await fetch(`${API_BASE_URL}/api/isProfileSubmitted`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setIsProfileSubmitted(data.status === "submitted");
            } catch (err) {
                console.error("Network error:", err);
            }

            await getUsersCollaboration();
        };

        checkProfile();
    }, [getUsersCollaboration]);

    const [open, setOpen] = useState(false);

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
                    title: "Collaboration Deleted",
                    description: "The collaboration has been successfully removed.",
                });
                // Update the UI by removing the deleted item from the state
                setGetUserCollaborationData(prev => prev.filter(collab => collab.id !== collaborationToDeleteId));
                setIsDeleteDialogOpen(false);
                setCollaborationToDeleteId(null);
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: "Failed to delete collaboration",
                    description: errorData.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Network Error",
                description: "Could not delete collaboration. Please try again later.",
            });
        } finally {
            setIsDeleting(false);
        }
    }


    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0">
                    {!isLoggedIn ? (
                        <>
                            <DialogHeader className="p-6">
                                <DialogTitle className="text-3xl font-bold text-center  font-headline">Join as an Organisation</DialogTitle>
                                <DialogDescription className="text-center">
                                    <span className="text-accent">{"Collaborate, solve, and scale with a network of trusted innovators."}</span><br />
                                    <span className="block text-center mx-auto">
                                        Empower your business by tapping a network of vetted innovators. Post your challenges, collaborate on tailored solutions, and unlock measurable growth with expert support and transparent rewards.
                                    </span>

                                </DialogDescription>
                            </DialogHeader>
                            <div className="h-[90vh] flex flex-col justify-center items-center">
                                <LoginPrompt setActiveView={setActiveView} contentType="Join as an MSME" />
                            </div>
                        </>

                    ) : !isMsmerole ? (
                        <>
                            <DialogHeader className="p-6 m-auto flex items-center">
                                <DialogTitle className="text-3xl font-bold font-headline">Join as an Organisation</DialogTitle>
                                <DialogDescription className="text-center">
                                    <span className="text-accent">{"Your business, your potential."}</span><br />
                                    Browse technology profiles from various organizations seeking collaboration.

                                </DialogDescription>
                            </DialogHeader>
                            <div className="h-screen flex flex-col justify-center items-center gap-4">
                                {/* <Lock className="w-16 h-16 text-muted-foreground" /> */}
                                <p className="text-lg text-muted-foreground">You do not have Organisation access.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader className="p-6">
                                <DialogTitle className="text-3xl font-bold font-headline">Organisation Dashboard</DialogTitle>
                                <DialogDescription>Welcome, {user.name}. Manage your challenges, submissions, and profile.</DialogDescription>
                            </DialogHeader>
                            <div className="flex-grow flex flex-col min-h-0 p-6 pt-0">
                                <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as MsmeDashboardTab)} className="flex flex-col flex-grow min-h-0">
                                    <TabsList className="grid w-full grid-cols-5">
                                        <TabsTrigger value="overview" onClick={() => setActiveTab("overview")}><LayoutDashboard className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
                                        <TabsTrigger value="submissions" onClick={() => setActiveTab("submissions")}><FileText className="mr-2 h-4 w-4" /> Submissions</TabsTrigger>
                                        <TabsTrigger value="engagement"><FileText className="mr-2 h-4 w-4" /> Engagement</TabsTrigger>
                                        <TabsTrigger value="profile" onClick={() => setActiveTab("profile")}><User className="mr-2 h-4 w-4" /> Edit Profile</TabsTrigger>
                                        <TabsTrigger value="settings" onClick={() => setActiveTab("settings")}><Settings className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
                                    </TabsList>
                                    <ScrollArea className="flex-grow mt-4">
                                        <TabsContent value="overview" className="mt-0 space-y-6">
                                            <div className="grid gap-6 md:grid-cols-3">
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">New Submissions</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                    <CardContent><div className="text-2xl font-bold">{overviewStats.new}</div><p className="text-xs text-muted-foreground">Awaiting review</p></CardContent>
                                                </Card>
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Under Review</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                    <CardContent><div className="text-2xl font-bold">{overviewStats.review}</div><p className="text-xs text-muted-foreground">Currently being evaluated</p></CardContent>
                                                </Card>
                                                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Accepted Solutions</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                    <CardContent><div className="text-2xl font-bold">{overviewStats.valid}</div><p className="text-xs text-muted-foreground">Marked as valid for collaboration</p></CardContent>
                                                </Card>
                                            </div>
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                <CardHeader>
                                                    <CardTitle>Solutions Overview</CardTitle>
                                                    <CardDescription>Accepted solutions over the last 6 months.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <ChartContainer config={msmeChartConfig} className="h-[250px] w-full">
                                                        <RechartsBarChart data={msmeChartData}>
                                                            <CartesianGrid vertical={false} />
                                                            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                                            <YAxis />
                                                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                                            <Bar dataKey="solutions" fill="var(--color-solutions)" radius={4} />
                                                        </RechartsBarChart>
                                                    </ChartContainer>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                        <TabsContent value="submissions" className="mt-0 space-y-4">
                                            {submissions.length > 0 ? submissions.map((sub) => (
                                                <Card key={sub.challengeId} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setSelectedSubmission(sub)}>
                                                    <CardHeader>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <CardTitle className="text-lg">{sub.challenge?.title}</CardTitle>
                                                                <CardDescription>Submitted by {sub.contactName}</CardDescription>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                {statusIcons[sub.status as keyof typeof statusIcons]}
                                                                <span>{sub.status}</span>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardFooter>
                                                        <p className="text-sm text-muted-foreground">Submitted on {sub.createdAt}</p>
                                                    </CardFooter>
                                                </Card>
                                            )) : (
                                                <Card className="text-center text-muted-foreground py-16">
                                                    <CardContent>You have not received any submissions yet.</CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="engagement" className="mt-0 space-y-4">
                                            {getUsersCollaborationData?.length > 0 ? getUsersCollaborationData.map((sub) => (
                                                <Card key={sub.id} className="bg-card/50 backdrop-blur-sm border-border/50"> {/* Removed onClick from Card */}
                                                    <CardHeader>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <CardTitle className="text-lg">{sub.title}</CardTitle>
                                                                <CardDescription>Submitted by {sub.contact_name}</CardDescription>
                                                            </div>
                                                            <div>
                                                                {/* The new "Edit" button */}
                                                                <Button
                                                                    variant="ghost" // Make it look like a link or a subtle button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedCollaborationToEdit(sub); // Store the collaboration data
                                                                        setIsEditingCollaboration(true); // Set edit mode to true
                                                                        setCurrentEditingCollaborationId(sub.id); // Store the ID for the update API call
                                                                        setActiveTab("profile"); // Switch to profile tab
                                                                    }}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="destructive" // Use destructive variant for delete
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent card's onClick from firing if it exists
                                                                        setCollaborationToDeleteId(sub.id);
                                                                        setIsDeleteDialogOpen(true); // Open the delete confirmation dialog
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="ml-2">Delete</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardFooter>
                                                        <p className="text-sm text-muted-foreground">Submitted on {new Date(sub.created_at).toLocaleString()}</p>
                                                    </CardFooter>
                                                </Card>
                                            )) : (
                                                <Card className="text-center text-muted-foreground py-16">
                                                    <CardContent>You have not submit any Collaboration.</CardContent>
                                                </Card>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="profile" className="mt-0">
                                            <Card className={`${isProfileSubmitted ? "hidden" : "block"} bg-card/50 backdrop-blur-sm border-border/50`}>
                                                <CardHeader>
                                                    <CardTitle>Create Organisation Profile</CardTitle>
                                                    <CardDescription>
                                                        This information will be publicly visible to potential collaborators.
                                                    </CardDescription>
                                                </CardHeader>

                                                <CardContent>
                                                    <Form {...profileForm}>
                                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="name"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Company Name</FormLabel>
                                                                        <FormControl>
                                                                            <Input {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="sector"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Sector</FormLabel>
                                                                        <FormControl>
                                                                            <Input {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={profileForm.control}
                                                                name="short_description"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Short Description</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea placeholder="A brief one-sentence pitch for your company." {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />


                                                            <Dialog open={open} onOpenChange={setOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button>Save Profile</Button>
                                                                </DialogTrigger>

                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Confirm Submission</DialogTitle>
                                                                        <DialogDescription>
                                                                            Are you sure you want to submit your profile? You can only submit once.
                                                                        </DialogDescription>
                                                                    </DialogHeader>

                                                                    <DialogFooter className="flex justify-end gap-2">
                                                                        <Button variant="outline" onClick={() => setOpen(false)}>
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            onClick={() => {
                                                                                profileForm.handleSubmit(onProfileSubmit)();
                                                                                setIsProfileSubmitted(true)
                                                                                setOpen(false); // close dialog after submission
                                                                            }}
                                                                            disabled={profileForm.formState.isSubmitting}
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

                                            {/* Second Card: Collaboration and Contact Details with its own form and submit button */}
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50 mt-4">
                                                <CardHeader>
                                                    <CardTitle>Collaboration</CardTitle>
                                                    <CardDescription>
                                                        {"Tell us about the collaboration you're seeking and the contact person."}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <Form {...collaborationForm}>
                                                        <form onSubmit={collaborationForm.handleSubmit(onCollaborationSubmit)} className="space-y-4">

                                                            {/* Title */}
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="title"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Title</FormLabel>
                                                                        <FormControl>
                                                                            <Input placeholder="Give your collaboration a title" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            {/* Description */}
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="description"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Description</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea rows={4} placeholder="Describe the collaboration or challenge" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            {/* Looking For */}
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="lookingFor"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>{"What you're looking for"}</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea rows={3} placeholder="Describe the ideal partner or solution" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            {/* Reward Amount */}
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="rewardAmount"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Reward Amount</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Enter reward amount"
                                                                                {...field}
                                                                                min={0}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    if (value === "") {
                                                                                        field.onChange("");
                                                                                    } else {
                                                                                        field.onChange(Math.max(0, Number(value)));
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <h4 className="text-md font-medium mb-2">Scope of Requirement</h4>
                                                            {scopeFields.map((field, index) => (
                                                                <div key={field.id} className="flex items-center gap-2 mb-2">
                                                                    <FormField
                                                                        control={collaborationForm.control}
                                                                        name={`scope.${index}.value`}
                                                                        render={({ field }) => (
                                                                            <FormItem className="flex-grow">
                                                                                <FormControl>
                                                                                    <Input placeholder="e.g., E-commerce Strategy" {...field} />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeScope(index)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button type="button" variant="outline" size="sm" onClick={() => appendScope({ value: '' })}>
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                Add Scope Item
                                                            </Button>

                                                            {/* Challenge Type */}
                                                            <FormField
                                                                control={collaborationForm.control}
                                                                name="challengeType"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-3">
                                                                        <FormLabel>Challenge Type</FormLabel>
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
                                                                control={collaborationForm.control}
                                                                name="durationInDays"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Duration (in days)</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="e.g., 30"
                                                                                {...field}
                                                                                min={1}
                                                                                value={field.value ?? undefined}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    field.onChange(value === "" ? "" : Math.max(1, Number(value)));
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            {/* 💡 Display the calculated due date */}
                                                            {dueDate && (
                                                                <div>
                                                                    <FormLabel>Due Date</FormLabel>
                                                                    <p className="text-muted-foreground text-sm">{format(dueDate, "PPP")}</p>
                                                                </div>
                                                            )}


                                                            <Separator className="my-4" />

                                                            {/* Contact Person */}
                                                            <h3 className="text-lg font-medium">Contact Person</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <FormField
                                                                    control={collaborationForm.control}
                                                                    name="contact.name"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Name</FormLabel>
                                                                            <FormControl>
                                                                                <Input {...field} />
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
                                                                            <FormLabel>Role</FormLabel>
                                                                            <FormControl>
                                                                                <Input {...field} />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>

                                                            <Button type="submit" disabled={collaborationForm.formState.isSubmitting}>
                                                                {collaborationForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                {isEditingCollaboration ? "Update Collaboration" : "Save Collaboration Info"}
                                                            </Button>
                                                        </form>
                                                    </Form>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                        <TabsContent value="settings" className="mt-0">
                                            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                                                <CardHeader><CardTitle>Account Settings</CardTitle><CardDescription>Manage your account settings.</CardDescription></CardHeader>
                                                <CardContent className="space-y-8">
                                                    <Form {...settingsForm}>
                                                        <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                                                            <div>
                                                                <h3 className="text-lg font-medium mb-4">Profile</h3>
                                                                <div className="space-y-4">
                                                                    <FormField control={settingsForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                                    <FormField
                                                                        control={settingsForm.control}
                                                                        name="email"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <div className="flex justify-between items-center">
                                                                                    <FormLabel>Email</FormLabel>
                                                                                    {!isEditingEmail && (
                                                                                        <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => setIsEditingEmail(true)}>
                                                                                            Edit
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                                <FormControl><Input type="email" placeholder="your@email.com" {...field} readOnly={!isEditingEmail} /></FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <Button type="submit">Save Changes</Button>
                                                        </form>
                                                    </Form>
                                                    {authProvider === 'local' && (
                                                        <>
                                                            <Separator />
                                                            <PasswordChangeForm />
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                            </div>
                        </>
                    )
                    }

                </DialogContent >
            </Dialog >
            <SubmissionDetailsModal
                submission={selectedSubmission}
                onOpenChange={(isOpen) => !isOpen && setSelectedSubmission(null)}
            />
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
