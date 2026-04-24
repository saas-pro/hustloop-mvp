
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EducationBookingModal from "./education-booking-modal";
import type { View, EducationProgram, EducationSession } from "@/app/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_BASE_URL } from "@/lib/api";


interface EducationViewProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onApplicationSuccess: (programTitle: string, session: EducationSession) => void;
    isLoggedIn: boolean;
    setActiveView: (view: View) => void;
    appliedPrograms: Record<string, string>;
}

const LoadingSkeleton = () => (
    <div className="space-y-8">
        {[...Array(3)].map((_, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border border-primary/30">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                    <div className="md:flex">
                        <div className="md:w-1/3 mb-6 md:mb-0 md:pr-6">
                            <Skeleton className="h-4 w-1/2 mb-2" />
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                        <div className="md:w-2/3 md:pl-6 border-muted-foreground/20 md:border-l">
                            <div className="space-y-2 mb-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32 ml-auto" />
                </CardFooter>
            </Card>
        ))}
    </div>
);

const getIconForFeature = (iconName: string): React.ReactNode => {
    const Icon = (LucideIcons as any)[iconName] as React.ComponentType<LucideProps> | undefined;
    if (!Icon) {
        return <LucideIcons.Check className="h-5 w-5 text-primary" />;
    }
    return <Icon className="h-5 w-5 text-primary" />;
};


export default function EducationView({ isOpen, onOpenChange, onApplicationSuccess, isLoggedIn, setActiveView, appliedPrograms }: EducationViewProps) {
    const [selectedProgram, setSelectedProgram] = useState<EducationProgram | null>(null);
    const [educationPrograms, setEducationPrograms] = useState<EducationProgram[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchPrograms = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const apiBaseUrl = API_BASE_URL;
                    const response = await fetch(`${apiBaseUrl}/api/education-programs`);
                    if (!response.ok) {
                        throw new Error("Failed to fetch education programs.");
                    }
                    const data = await response.json();
                    setEducationPrograms(Array.isArray(data) ? data : data.items || []);

                } catch (err: any) {
                    setError(err.message || "An unexpected error occurred.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPrograms();
        }
    }, [isOpen]);

    const handleApplyClick = (program: EducationProgram) => {
        if (isLoggedIn) {
            setSelectedProgram(program);
        } else {
            setActiveView('signup');
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-bold text-center font-headline">Transform Your Future Through Education</DialogTitle>
                        <DialogDescription className="text-center">
                            <span className="text-primary">&quot;Knowledge is the Currency of Tomorrow&quot;</span>
                            <span className="block mt-2">
                                Join our comprehensive educational programs designed to empower entrepreneurs and business leaders with cutting-edge skills and insights.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-full mt-4">
                        <div className="space-y-12">
                            <section>
                                <h2 className="text-2xl font-bold font-headline mb-6">Featured Programs</h2>
                                {isLoading ? (
                                    <LoadingSkeleton />
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <span className="text-4xl font-bold text-primary mb-4">🚧 Coming Soon!</span>
                                        <p className="text-lg text-muted-foreground">
                                            Our education programs are launching soon. Stay tuned for updates and opportunities!
                                        </p>
                                    </div>
                                ) : educationPrograms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <span className="text-4xl font-bold text-primary mb-4">🚧 Coming Soon!</span>
                                        <p className="text-lg text-muted-foreground">
                                            Our education programs are launching soon. Stay tuned for updates and opportunities!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {educationPrograms.map((program, index) => {
                                            const isApplied = !!appliedPrograms[program.title];
                                            return (
                                                <Card
                                                    key={index}
                                                    className="bg-card/50 backdrop-blur-sm border border-primary/30 hover:border-primary transition-colors"
                                                >
                                                    <CardHeader>
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle>{program.title}</CardTitle>
                                                            <Badge>Free</Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="md:flex">
                                                            {/* Sessions */}
                                                            <div className="md:w-1/3 mb-6 md:mb-0 md:pr-6">
                                                                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">NEXT SESSIONS</h4>
                                                                <div className="space-y-3">
                                                                    {program.sessions.map((session, sIndex) => (
                                                                        <div
                                                                            key={sIndex}
                                                                            className="text-sm p-3 rounded-md bg-muted/50 border"
                                                                        >
                                                                            <p className="font-bold">{session.language}</p>
                                                                            <p className="text-muted-foreground">
                                                                                {session.date}, {session.time}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Description & Features */}
                                                            <div className="md:w-2/3 md:pl-6 border-muted-foreground/20 md:border-l">
                                                                <p className="text-muted-foreground mb-4">{program.description}</p>
                                                                <ul className="grid grid-cols-2 gap-4 text-sm">
                                                                    {program.features.map((feature, fIndex) => (
                                                                        <li key={fIndex} className="flex items-center gap-2">
                                                                            {getIconForFeature(feature.icon)}
                                                                            <span>{feature.name}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter>
                                                        <Button
                                                            onClick={() => handleApplyClick(program)}
                                                            className="w-full md:w-auto ml-auto bg-accent hover:bg-accent/90 text-accent-foreground disabled:bg-green-500 disabled:opacity-100"
                                                            disabled={isApplied}
                                                        >
                                                            {isApplied ? (
                                                                <>
                                                                    <LucideIcons.CheckCircle className="mr-2 h-4 w-4" /> Applied
                                                                </>
                                                            ) : (
                                                                "Apply Now"
                                                            )}
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}

                            </section>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <EducationBookingModal
                program={selectedProgram}
                onOpenChange={() => setSelectedProgram(null)}
                onApplicationSuccess={onApplicationSuccess}
            />
        </>
    );
}
