import React, { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api";
import Image from "next/image";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { LoadingButton } from "../ui/loading-button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface Collaboration {
    id: string;
    title: string;
    description: string;
    reward_amount: number;
    reward_min: number;
    reward_max: number;
    challenge_type: string;
    start_date: string;
    end_date: string;
    sector: string;
    technology_area: string;
    contact_name: string;
    contact_role: string;
    created_at: string;
    status: string;
    company_name: string;
    company_sector: string;
    company_description: string;
    website_url: string;
    linkedin_url: string;
    x_url: string;
    logo_url: string;
    extended_end_date?: string | null;
    allow_status_updates: boolean;
}

interface MSMEProfile {
    id: string;
    company_name: string;
    sector: string;
    description: string;
    website_url?: string | null;
    linkedin_url?: string | null;
    x_url?: string | null;
    logo_url?: string | null;
    user_id: string;
    is_submitted: boolean;
}

interface BrowseMSMEProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function BrowseMSME({ isOpen, onOpenChange }: BrowseMSMEProps) {
    const [profiles, setProfiles] = useState<MSMEProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<MSMEProfile | null>(null);
    const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
    const [collabLoading, setCollabLoading] = useState(false);
    const [collabError, setCollabError] = useState<string | null>(null);
    const { toast } = useToast()
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())
    const [isExtendDateLoading, setIsExtendDateLoading] = React.useState(false);
    const [isStopCollaborationLoading, setIsStopCollaborationLoading] = React.useState(false);
    const [extendCollabId, setExtendCollabId] = React.useState<string | null>(null);
    const [stopCollabId, setStopCollabId] = React.useState<string | null>(null);
    const [statusUpdateLoadingId, setStatusUpdateLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE_URL}/api/msme_profiles`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    }
                });

                if (!res.ok) {
                    let msg = `${res.status} ${res.statusText}`;
                    try {
                        const body = await res.json();
                        if (body?.message) msg = body.message;
                    } catch { }
                    throw new Error(msg);
                }

                const data = await res.json();
                if (Array.isArray(data)) setProfiles(data);
                else if (data && data.message) setError(data.message);
                else setProfiles([]);
            } catch (err: any) {
                if (err.name !== "AbortError")
                    setError(err.message ?? "Failed to fetch profiles");
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, []);

    useEffect(() => {
        const fetchCollaborations = async () => {
            if (!selectedProfile) return;
            try {
                setCollabLoading(true);
                setCollabError(null);

                const token = localStorage.getItem("token");
                const res = await fetch(
                    `${API_BASE_URL}/api/collaborations/user/${selectedProfile.user_id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        }
                    }
                );

                if (!res.ok) {
                    let msg = `${res.status} ${res.statusText}`;
                    try {
                        const body = await res.json();
                        if (body?.message) msg = body.message;
                    } catch { }
                    throw new Error(msg);
                }

                const data = await res.json();
                if (Array.isArray(data.message)) setCollaborations(data.message);

                else if (data && data.message) setCollabError(data.message);
                else setCollaborations([]);
            } catch (err: any) {
                if (err.name !== "AbortError")
                    setCollabError(err.message ?? "Failed to fetch collaborations");
            } finally {
                setCollabLoading(false);
            }
        };

        fetchCollaborations();
    }, [selectedProfile]);

    const handleExtendCollaboration = async (collaborationId: string) => {
        setExtendCollabId(collaborationId);
        setIsExtendDateLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/collaborations/${collaborationId}/extend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ extended_end_date: selectedDate })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extend collaboration end date');
            }

            const responseData = await response.json();
            setCollaborations(collaborations.map(collab =>
                collab.id === collaborationId ? { ...collab, extended_end_date: responseData.message.extended_end_date, status: responseData.message.status } : collab
            ));

            toast({
                title: "Collaboration Extended",
                description: "The collaboration end date has been successfully extended.",
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
        } finally {
            setIsExtendDateLoading(false);
            setExtendCollabId(null);
            setSelectedDate(undefined);
        }
    };

    const handleStopCollaboration = async (collaborationId: string) => {
        setStopCollabId(collaborationId);
        setIsStopCollaborationLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_BASE_URL}/api/collaborations/${collaborationId}/stop-resume`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to toggle collaboration status");
            }
            if (!data.message.status) {
                throw new Error("Invalid API response: status missing");
            }
            setCollaborations(
                collaborations.map((collab) =>
                    collab.id === collaborationId
                        ? { ...collab, status: data.message.status.toLowerCase() }
                        : collab
                )
            );

            toast({
                title: "Status Updated",
                description: "Status changed successfully",
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsStopCollaborationLoading(false);
            setStopCollabId(null);
        }
    };



    const [editRewardCollab, setEditRewardCollab] = useState<Collaboration | null>(null);
    const [isRewardUpdating, setIsRewardUpdating] = useState(false);

    const handleUpdateReward = async (collabId: string, data: { reward_amount?: number, reward_min?: number, reward_max?: number }) => {
        setIsRewardUpdating(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/collaborations/${collabId}/rewards`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update rewards');
            }

            setCollaborations(collaborations.map(c =>
                c.id === collabId ? { ...c, ...data } : c
            ));

            toast({
                title: "Success",
                description: "Rewards updated successfully",
            });
            setEditRewardCollab(null);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsRewardUpdating(false);
        }
    };

    const handleToggleStatusUpdates = async (collaborationId: string, currentStatus: boolean) => {
        setStatusUpdateLoadingId(collaborationId);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/collaborations/${collaborationId}/toggle-status-updates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to toggle status updates');
            }

            const responseData = await response.json();
            setCollaborations(collaborations.map(collab =>
                collab.id === collaborationId ? { ...collab, allow_status_updates: responseData.message.allow_status_updates } : collab
            ));

            toast({
                title: "Success",
                description: `Status updates ${responseData.message.allow_status_updates ? 'enabled' : 'disabled'}`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setStatusUpdateLoadingId(null);
        }
    };


    const isAdmin = () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return false;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role === 'admin';
        } catch {
            return false;
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6">
                        <DialogTitle className="text-3xl font-bold text-center  font-headline">Organisation Profiles</DialogTitle>
                        <DialogDescription className="text-center">
                            <span className="text-accent">{"Your business, your potential."}</span><br />
                            Browse Organisation profiles from various organizations seeking collaboration.

                        </DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="p-4 animate-pulse">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full" />
                                            <div className="w-full">
                                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-20 bg-gray-200 rounded" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center text-muted-foreground">
                            No Organisation profiles found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-5">
                            {profiles.map((p) => (
                                <Card
                                    key={p.id}
                                    onClick={() => setSelectedProfile(p)}
                                    className="overflow-hidden hover:shadow-lg transition cursor-pointer"
                                >
                                    <CardHeader className="flex items-start gap-4">
                                        <Avatar className="w-12 h-12">
                                            {p.logo_url ? (
                                                <AvatarImage src={p.logo_url} />
                                            ) : (
                                                <AvatarFallback>
                                                    {p.company_name?.charAt(0) ?? "?"}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="flex-1">
                                            <CardTitle className="flex items-center justify-between">
                                                <span>{p.company_name}</span>

                                            </CardTitle>
                                            <p className="text-sm mt-1 text-muted-foreground">
                                                {p.sector}
                                            </p>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {p.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog >

            <Dialog open={!!selectedProfile} onOpenChange={() => { setSelectedProfile(null); setCollaborations([]) }}>
                {selectedProfile && (
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] flex flex-col p-0">
                        <DialogHeader className="space-y-4 pb-4 border-b pr-10 px-6 pt-6">
                            <div className="flex flex-col items-start gap-3">
                                {selectedProfile.logo_url && (
                                    <Image
                                        width={64}
                                        height={64}
                                        src={selectedProfile.logo_url}
                                        alt={selectedProfile.company_name}
                                        className="w-16 h-16 rounded-full object-cover"
                                    />
                                )}
                                <div className="text-left space-y-1">
                                    <DialogTitle className="text-2xl">{selectedProfile.company_name}</DialogTitle>
                                    <DialogDescription className="text-base">{selectedProfile.sector}</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="overflow-scroll px-6 pb-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {selectedProfile.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {selectedProfile.website_url && (
                                    <Button asChild size="sm">
                                        <a
                                            href={selectedProfile.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Visit Website
                                        </a>
                                    </Button>
                                )}
                                {selectedProfile.linkedin_url && (
                                    <Button variant="outline" asChild size="sm">
                                        <a
                                            href={selectedProfile.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            LinkedIn
                                        </a>
                                    </Button>
                                )}
                                {selectedProfile.x_url && (
                                    <Button variant="outline" asChild size="sm">
                                        <a
                                            href={selectedProfile.x_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            X
                                        </a>
                                    </Button>
                                )}
                            </div>

                            <h3 className="text-lg font-semibold">Challenges</h3>
                            {collabLoading ? (
                                <div className="overflow-x-auto -mx-6 px-6">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[200px] sm:w-[350px]">Title</TableHead>
                                                <TableHead className="min-w-[120px] sm:w-[150px]">End Date</TableHead>
                                                <TableHead className="min-w-[120px] sm:w-[150px]">Extended End Date</TableHead>
                                                <TableHead className="min-w-[100px] sm:w-[120px]">Status</TableHead>
                                                <TableHead className="min-w-[100px] sm:w-[120px]">Allow Updates</TableHead>
                                                <TableHead className="text-right min-w-[180px] sm:w-[220px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Skeleton className="h-8 w-20" />
                                                            <Skeleton className="h-8 w-16" />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : collaborations.length === 0 ? (
                                <p>No challenges found for this Organisation.</p>
                            ) : (
                                <div className="overflow-x-auto -mx-6 px-6">
                                    <Table>
                                        <TableCaption>
                                            List of challenges by {selectedProfile.company_name}.
                                        </TableCaption>

                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[200px] sm:w-[350px]">Title</TableHead>
                                                <TableHead className="min-w-[120px] sm:w-[150px]">End Date</TableHead>
                                                <TableHead className="min-w-[120px] sm:w-[150px]">Extended End Date</TableHead>
                                                <TableHead className="min-w-[100px] sm:w-[120px]">Status</TableHead>
                                                <TableHead className="min-w-[100px] sm:w-[120px]">Allow Updates</TableHead>
                                                <TableHead className="text-right min-w-[180px] sm:w-[220px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {collaborations.map((collaboration) => (
                                                <TableRow key={collaboration.id}>

                                                    {/* TITLE */}
                                                    <TableCell className="font-medium">
                                                        {collaboration.title}
                                                    </TableCell>


                                                    <TableCell>
                                                        {collaboration.end_date
                                                            ? new Date(collaboration.end_date).toLocaleDateString()
                                                            : "N/A"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {collaboration.extended_end_date
                                                            ? new Date(collaboration.extended_end_date).toLocaleDateString()
                                                            : "N/A"}
                                                    </TableCell>

                                                    {/* STATUS */}
                                                    <TableCell className="capitalize">
                                                        {collaboration.status}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            {statusUpdateLoadingId === collaboration.id ? <Loader2 className="animate-spin flex items-center" /> : <Switch
                                                                checked={collaboration.allow_status_updates}
                                                                onCheckedChange={(checked) => handleToggleStatusUpdates(collaboration.id, checked)}
                                                                disabled={!isAdmin() || statusUpdateLoadingId === collaboration.id}
                                                            />}
                                                        </div>
                                                    </TableCell>

                                                    {/* ACTIONS */}
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            {collaboration.status === "expired" ? (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            className="min-w-[80px] bg-green-600 hover:bg-green-700 text-white"
                                                                            disabled={isExtendDateLoading && extendCollabId === collaboration.id}
                                                                        >
                                                                            Activate
                                                                        </Button>
                                                                    </PopoverTrigger>

                                                                    <PopoverContent onFocusOutside={(e) => e.preventDefault()} className="w-fit">
                                                                        <input
                                                                            type="date"
                                                                            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                                                                            onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                                                                            min={new Date(collaboration.end_date).toISOString().split('T')[0]}
                                                                            className="w-full p-2 border rounded-md"
                                                                        />

                                                                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 p-2">
                                                                            <LoadingButton
                                                                                onClick={() => handleExtendCollaboration(collaboration.id)}
                                                                                className="w-full sm:w-fit"
                                                                                size="sm"
                                                                                disabled={!selectedDate}
                                                                                isLoading={isExtendDateLoading && extendCollabId === collaboration.id}
                                                                            >
                                                                                Confirm Activation
                                                                            </LoadingButton>
                                                                            {isAdmin() && (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="w-full sm:w-fit"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setEditRewardCollab(collaboration);
                                                                                    }}
                                                                                >
                                                                                    Edit Reward
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            ) : (
                                                                <>
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="min-w-[70px]"
                                                                                disabled={isExtendDateLoading && extendCollabId === collaboration.id}
                                                                            >
                                                                                Extend
                                                                            </Button>
                                                                        </PopoverTrigger>

                                                                        <PopoverContent className="w-auto p-0" align="center" side="top" alignOffset={-10} onFocusOutside={(e) => e.preventDefault()}>
                                                                            <input
                                                                                type="date"
                                                                                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                                                                                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                                                                                min={new Date(collaboration.end_date).toISOString().split('T')[0]}
                                                                                className="w-full p-2 border rounded-md"
                                                                            />

                                                                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 p-2">
                                                                                <LoadingButton
                                                                                    onClick={() => handleExtendCollaboration(collaboration.id)}
                                                                                    className="w-full sm:w-fit"
                                                                                    size="sm"
                                                                                    disabled={!selectedDate}
                                                                                    isLoading={isExtendDateLoading && extendCollabId === collaboration.id}
                                                                                >
                                                                                    Confirm Extend
                                                                                </LoadingButton>
                                                                                {isAdmin() && (
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="w-full sm:w-fit"
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            setEditRewardCollab(collaboration);
                                                                                        }}
                                                                                    >
                                                                                        Edit Reward
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>

                                                                    {/* STOP / RESUME */}
                                                                    <LoadingButton
                                                                        variant={collaboration.status === "stopped" ? "default" : "destructive"}
                                                                        size="sm"
                                                                        onClick={() => handleStopCollaboration(collaboration.id)}
                                                                        disabled={isStopCollaborationLoading && stopCollabId === collaboration.id}
                                                                        isLoading={isStopCollaborationLoading && stopCollabId === collaboration.id}
                                                                        className="min-w-[70px]"
                                                                    >
                                                                        {collaboration.status === "stopped" ? "Resume" : "Stop"}
                                                                    </LoadingButton>
                                                                </>
                                                            )}

                                                        </div>
                                                    </TableCell>


                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {editRewardCollab && (
                <EditRewardDialog
                    open={!!editRewardCollab}
                    onOpenChange={(open) => !open && setEditRewardCollab(null)}
                    collaboration={editRewardCollab}
                    onUpdate={handleUpdateReward}
                    isLoading={isRewardUpdating}
                />
            )}
        </>
    );
}

function EditRewardDialog({ open, onOpenChange, collaboration, onUpdate, isLoading }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collaboration: Collaboration;
    onUpdate: (id: string, data: any) => void;
    isLoading: boolean;
}) {
    const [rewardType, setRewardType] = useState<'fixed' | 'range'>(
        collaboration.reward_amount ? 'fixed' : 'range'
    );
    const [amount, setAmount] = useState(collaboration.reward_amount?.toString() || '');
    const [min, setMin] = useState(collaboration.reward_min?.toString() || '');
    const [max, setMax] = useState(collaboration.reward_max?.toString() || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rewardType === 'fixed') {
            onUpdate(collaboration.id, {
                reward_amount: Number(amount),
                reward_min: 0,
                reward_max: 0
            });
        } else {
            onUpdate(collaboration.id, {
                reward_amount: 0,
                reward_min: Number(min),
                reward_max: Number(max)
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Reward</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-2">
                        <Label>Reward Type</Label>
                        <RadioGroup
                            value={rewardType}
                            onValueChange={(value) => setRewardType(value as "fixed" | "range")}
                            className="flex gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="fixed" id="fixed" />
                                <Label htmlFor="fixed">Fixed Amount</Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="range" id="range" />
                                <Label htmlFor="range">Range</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* FIXED AMOUNT */}
                    {rewardType === "fixed" && (
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* RANGE */}
                    {rewardType === "range" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="min">Min</Label>
                                <Input
                                    id="min"
                                    type="number"
                                    value={min}
                                    onChange={(e) => setMin(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max">Max</Label>
                                <Input
                                    id="max"
                                    type="number"
                                    value={max}
                                    onChange={(e) => setMax(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? "Updating..." : "Update Reward"}
                    </Button>
                </form>
            </DialogContent >
        </Dialog >

    );
}



