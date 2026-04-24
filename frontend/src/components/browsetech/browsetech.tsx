"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { View } from "@/app/types";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import TechTransfer from "../techtransfer_view";
import { Input } from "../ui/input";
import { PinContainer } from "../ui/3d-pin";
import removeMarkdown from "remove-markdown";

interface TechTransferViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    setActiveView: (view: View) => void;
}

interface TechTransferProfile {
    id: string;
    ipTitle: string;
    firstName: string;
    lastName: string;
    describetheTech: string;
    summary: string;
    inventorName: string;
    organization: string;
    contactEmail: string;
    supportingFileUrl?: string;
    approvalStatus: string;
    user_id?: number;
}

export default function TechTransferView({ isOpen, onOpenChange }: TechTransferViewProps) {
    const [profiles, setProfiles] = useState<TechTransferProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [techId, setTechId] = useState<string | null>(null);

    useEffect(() => {
        const fetchApprovedProfiles = async () => {
            try {
                setIsLoading(true);

                const response = await fetch(`${API_BASE_URL}/api/getTechTransfer`);
                if (!response.ok) {
                    toast({ title: "Error", description: "Cannot fetch Intelectual Property", variant: "destructive" })
                }
                const data = await response.json();
                setProfiles(data.message.ips || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchApprovedProfiles();
        }
    }, [isOpen]);

    const [searchTerm, setSearchTerm] = useState("");

    const filteredProfiles = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return profiles.filter(
            (p) =>
                p.ipTitle.toLowerCase().includes(lower) ||
                p.organization.toLowerCase().includes(lower) ||
                p.inventorName.toLowerCase().includes(lower) ||
                p.summary.toLowerCase().includes(lower)
        );
    }, [profiles, searchTerm]);

    return (
        <Dialog open={isOpen}>
            <DialogContent hideClose={true} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] w-full max-w-full md:w-[70vw] md:max-w-[970vw] flex flex-col p-0 overflow-hidden rounded-lg">
                <DialogHeader className="p-6">
                    <DialogTitle className="text-3xl font-bold text-center font-headline">Technology Transfer</DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 disabled:pointer-events-none hover:!bg-transparent"
                        onClick={(e) => {
                            e.stopPropagation();  // Add this line
                            onOpenChange(false);
                        }}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                    <DialogDescription className="text-center">
                        <span className="text-accent">
                            {"Hustloop is where innovation meets execution."}
                        </span>
                        <br />
                        Browse technology profiles from various organizations seeking collaboration.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 px-6 overflow-y-auto flex-1">
                    {isLoading && (
                        <div className="space-y-6">
                            {/* Skeleton Search Bar */}
                            <div className="relative max-w-md mx-auto">
                                <Skeleton className="h-10 w-full rounded-md" />
                            </div>

                            {/* Skeleton Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-6 overflow-x-hidden gap-8 w-full">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="h-[22rem] w-full flex items-center justify-center">
                                        <Card className="w-full h-[18rem] flex flex-col border-border/50">
                                            <CardHeader className="pb-3">
                                                <Skeleton className="h-6 w-3/4 mb-2" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </CardHeader>
                                            <CardContent className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-4 w-5/6" />
                                            </CardContent>
                                            <CardFooter>
                                                <Skeleton className="h-10 w-full rounded-md" />
                                            </CardFooter>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {!isLoading && profiles.length === 0 && (
                        <div className="py-10 text-center text-gray-500 flex items-center justify-center h-[50vh]">
                            <p>No Technologies are currently available.</p>
                        </div>
                    )}
                    {!isLoading && profiles.length > 0 && (
                        <div>
                            {/* Search Bar */}
                            <div className="relative max-w-md mx-auto">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by title, organization, or inventor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus-visible:ring-2 focus-visible:ring-primary"
                                />
                            </div>

                            {/* Profiles Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-6 overflow-x-hidden">
                                {filteredProfiles.length > 0 ? (
                                    filteredProfiles.map((profile) => (
                                        <div key={profile.id} className="h-[22rem] w-full flex items-center justify-center">
                                            <PinContainer
                                                title={profile.firstName + " " + profile.lastName}
                                                containerClassName="w-[20rem]"
                                            >
                                                <Card className="w-[90vw] md:w-[20rem] h-[18rem] flex flex-col border-border/50 hover:border-accent/50 transition-colors bg-card shadow-xl" onClick={() => {
                                                    setTechId(profile.id);
                                                    onOpenChange(true);
                                                }}>
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-xl font-bold line-clamp-2">
                                                            {profile.ipTitle}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="flex-1 overflow-hidden">
                                                        <p className="text-sm text-muted-foreground line-clamp-4">
                                                            {profile.summary}
                                                        </p>
                                                    </CardContent>
                                                    <CardFooter>
                                                        <Button
                                                            onClick={() => setTechId(profile.id)}
                                                            className="w-full group"
                                                            variant="default"
                                                        >
                                                            View Details
                                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            </PinContainer>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-gray-500 col-span-full">
                                        No Technologies match your search.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {
                    techId !== null && (
                        <TechTransfer
                            techId={techId}
                            onClose={() => setTechId(null)}
                        />
                    )
                }
            </DialogContent>
        </Dialog>
    );

}