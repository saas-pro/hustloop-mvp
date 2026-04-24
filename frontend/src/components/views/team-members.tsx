"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "../ui/loading-button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "../ui/card";
import { Trash2, UserPlus, Users, Repeat } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type TeamProps = {
    solutionId: string;
    isOwner: boolean;
    currentUserId: string;
    onMemberRemoved: (userId: string) => void;
    challengeStatus?: string;
};

export default function TeamMembers({ solutionId, isOwner, currentUserId, onMemberRemoved, challengeStatus }: TeamProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
    const [submission, setSubmission] = useState<any>([]);
    const [confirmText, setConfirmText] = useState("");
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberName, setNewMemberName] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [resendLoadingFor, setResendLoadingFor] = useState<string | null>(null);

    const ownerId = submission.user_id;

    useEffect(() => {
        setMembers(submission.team_members || []);
    }, [submission]);

    const getInitials = (name: string) => {
        if (!name) return "";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const fetchMembers = useCallback(async () => {
        try {
            setRefreshing(true);
            const token = localStorage.getItem("token");

            const res = await fetch(`${API_BASE_URL}/api/solutions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;

            const data = await res.json();

            const found = data.solutions.find((s: any) => s.solutionId === solutionId);

            if (!found) return;

            setSubmission(found);
            setMembers(found.team_members || []);

        } finally {
            setRefreshing(false);
        }
    }, [solutionId]);


    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);
    const handleRemoveClick = (userId: string) => {
        setMemberToRemove(userId);
        setConfirmText("");
        setIsDialogOpen(true);
    };

    const handleAddMember = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newMemberEmail)) {
            toast({ variant: "destructive", title: "Invalid Email" });
            return;
        }

        const duplicate = members.some((m) => (m.email || "").toLowerCase() === newMemberEmail.toLowerCase());
        if (duplicate) {
            toast({ variant: "destructive", title: "This email is already invited or a member" });
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/solution/${solutionId}/team-members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email: newMemberEmail, name: newMemberName }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast({ variant: "destructive", title: data.error || "Failed to send invite" });
                return;
            }

            setMembers((prev) => [
                ...prev,
                {
                    userId: "pending-" + newMemberEmail,
                    name: newMemberName,
                    email: newMemberEmail,
                    status: "pending",
                },
            ]);

            toast({ title: "Verification mail sent" });
            setIsAddDialogOpen(false);
            setNewMemberEmail("");
            setNewMemberName("");
            await fetchMembers();
        } catch {
            toast({ variant: "destructive", title: "Request failed" });
        } finally {
            setLoading(false);
        }
    };

    const confirmRemove = async () => {
        if (!memberToRemove) return;

        if (confirmText.toLowerCase() !== "delete") {
            toast({ variant: "destructive", title: "Please type 'delete' to proceed" });
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API_BASE_URL}/api/solution/${solutionId}/team-members/${memberToRemove}`,
                {
                    method: "DELETE",
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                toast({ variant: "destructive", title: data.error || "Failed to remove member" });
                return;
            }

            setMembers((prev) => prev.filter((m) => m.userId !== memberToRemove));
            onMemberRemoved(memberToRemove);
            toast({ title: "Team member removed" });
            setIsDialogOpen(false);
            await fetchMembers();
        } catch {
            toast({ variant: "destructive", title: "Request failed" });
        } finally {
            setLoading(false);
            setMemberToRemove(null);
        }
    };

    const handleResend = async (email: string) => {
        try {
            setResendLoadingFor(email);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/resend-invite-team-member`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({ email, solution_id: solutionId }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast({ variant: "destructive", title: data.error || "Failed to resend invite" });
                return;
            }

            toast({ title: "Invite resent" });
            await fetchMembers();
        } catch {
            toast({ variant: "destructive", title: "Request failed" });
        } finally {
            setResendLoadingFor(null);
        }
    };
    const challengeTitle = submission.challenge?.title || "Untitled Solution";
    return (
        <>
            <Accordion type="single" collapsible className="w-full">
                {refreshing ? (
                    [1, 2, 3].map((i) => (
                        <AccordionItem value={`skeleton-${i}`} key={i}>
                            <AccordionTrigger className="text-lg font-semibold hover:no-underline px-1">
                                <Skeleton className="h-7 w-64" />
                            </AccordionTrigger>
                            <AccordionContent className="px-1 pb-4">
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2 w-full">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[150px]" />
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                ) : (
                    <AccordionItem value={solutionId}>
                        <AccordionTrigger className="text-lg font-semibold hover:no-underline px-1 text-left">
                            {challengeTitle}
                        </AccordionTrigger>
                        <AccordionContent className="px-1 pb-4">
                            {members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-muted/30 rounded-lg border border-dashed">
                                    <div className="bg-muted p-3 rounded-full">
                                        <Users className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">No team members yet</p>
                                        <p className="text-sm text-muted-foreground">Invite colleagues to collaborate on this solution.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3 mt-2">
                                    {members.map((member: any, index: number) => {
                                        const isOwnerMember =
                                            member.userId === ownerId || member.userId === submission.userId;
                                        const status =
                                            member.status || (isOwnerMember ? "accepted" : "accepted");

                                        return (
                                            <div className="relative flex items-center gap-3" key={member.userId}>
                                                {members.length > 1 && index !== members.length - 1 && (
                                                    <div className="absolute left-5 top-10 bottom-0 w-px h-full bg-muted-foreground/30" />
                                                )}

                                                <Avatar className="h-10 w-10 border z-10 bg-white relative">
                                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {getInitials(member.name || member.email || "")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {members.length > 1 && <div className="w-6 absolute left-6 top-1/2 -translate-y-1/2 border-t border-muted-foreground"></div>}
                                                <div className="flex items-center w-full justify-between p-3 mr-2 transition-colors">

                                                    <div>

                                                        <p className="font-medium leading-none">{member.name}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{member.email}</p>

                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center gap-2 text-xs font-medium px-2 py-0.5 rounded-full ${status === "accepted"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : "bg-yellow-100 text-yellow-800"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`w-2 h-2 rounded-full ${status === "accepted" ? "bg-green-600" : "bg-yellow-600"
                                                                        }`}
                                                                />
                                                                {status}
                                                            </span>

                                                            {isOwnerMember && (
                                                                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                                                    Owner
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {status === "pending" && (
                                                            <LoadingButton
                                                                onClick={() => handleResend(member.email)}
                                                                isLoading={resendLoadingFor === member.email}
                                                                variant="ghost"
                                                                className="mr-2"
                                                                aria-label="Resend invite"
                                                            >
                                                                <Repeat className="h-4 w-4" />
                                                            </LoadingButton>
                                                        )}

                                                        {isOwner && !isOwnerMember && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => handleRemoveClick(member.userId)}
                                                                title="Remove member"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {isOwner && (
                                <div className="mt-4">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-block w-full sm:w-auto">
                                                    <Button
                                                        onClick={() => setIsAddDialogOpen(true)}
                                                        className="w-full sm:w-auto"
                                                        variant="outline"
                                                        disabled={challengeStatus === "expired" || challengeStatus === "stopped"}
                                                    >
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Add Team Member
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            {(challengeStatus === "expired" || challengeStatus === "stopped") && (
                                                <TooltipContent>
                                                    <p>Cannot add team members. Challenge is {challengeStatus}.</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                )}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>Enter the email address of the team member you want to invite.</DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Name
                                </label>
                                <Input
                                    id="name"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="John Doe"
                                    type="text"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    type="email"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <LoadingButton onClick={handleAddMember} isLoading={loading}>
                                Send Invitation
                            </LoadingButton>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Remove Team Member</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to remove this team member? This action cannot be undone. Type <strong>delete</strong> to confirm.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type 'delete'" />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                                Cancel
                            </Button>

                            <LoadingButton variant="destructive" onClick={confirmRemove} isLoading={loading} disabled={confirmText.toLowerCase() !== "delete"}>
                                Remove Member
                            </LoadingButton>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Accordion>
        </>
    );
}
