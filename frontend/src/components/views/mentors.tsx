
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Linkedin, CalendarPlus, Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import MentorBookingModal from "@/components/views/mentor-booking-modal";
import type { View } from "@/app/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_BASE_URL } from "@/lib/api";

export type Mentor = {
  name: string;
  avatar: string;
  hint: string;
  title: string;
  expertise: string[];
  bio: string;
  rating: number;
  socials: {
    x: string;
    linkedin: string;
  };
  hourlyRate: string;
  availability: Record<string, string[]>;
};

const LoadingSkeleton = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(3)].map((_, index) => (
            <Card key={index} className="flex flex-col">
                <CardHeader className="flex-row gap-4 items-center">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        ))}
    </div>
);


interface MentorsViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  hasUsedFreeSession: boolean;
  onBookingSuccess: (mentorName: string, date: Date, time: string) => void;
  setActiveView: (view: View) => void;
}

export default function MentorsView({ isOpen, onOpenChange, isLoggedIn, hasSubscription, hasUsedFreeSession, onBookingSuccess, setActiveView }: MentorsViewProps) {
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const SHOW_COMING_SOON = true;

  useEffect(() => {
    if (isOpen) {
        const fetchMentors = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiBaseUrl = API_BASE_URL;
                const response = await fetch(`${apiBaseUrl}/api/mentors`);
                if (!response.ok) {
                    throw new Error('Failed to fetch mentors.');
                }
                const data = await response.json();
                setMentors(Array.isArray(data) ? data : data.items || []);
            } catch (err: any) {
                setMentors([]); // No fallback mentors, show Coming Soon
                setError(null); // Hide error, show fallback
            } finally {
                setIsLoading(false);
            }
        };
        fetchMentors();
    }
  }, [isOpen]);
  
  const handleScheduleClick = (mentor: Mentor) => {
    if (isLoggedIn) {
      setBookingMentor(mentor);
    } else {
      setActiveView('login');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6">
            <DialogTitle className="text-3xl font-bold text-center font-headline">Meet Our Expert Mentors</DialogTitle>
            <DialogDescription className="text-center">Learn from industry veterans who have been there and done that. Get guidance to transform your startup journey.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-full mt-4 px-6">
            {isLoading ? (
                <LoadingSkeleton />
            ) : error ? (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {SHOW_COMING_SOON ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-24">
                    <span className="text-4xl font-bold text-primary mb-4">🚧 Coming Soon!</span>
                    <p className="text-lg text-muted-foreground">Soon we’ll onboard experienced industry leaders. Stay tuned for expert mentorship opportunities!</p>
                  </div>
                ) : (
                  mentors.map((mentor, index) => {
                    return (
                    <Card key={index} className="flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
                        <CardHeader className="flex-row gap-4 items-center">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={mentor.avatar} alt={mentor.name} data-ai-hint={mentor.hint}/>
                            <AvatarFallback>{mentor.name.substring(0,2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <CardTitle>{mentor.name}</CardTitle>
                            <CardDescription>{mentor.title}</CardDescription>
                        </div>
                        <div className="flex gap-2 text-muted-foreground self-start">
                            <a href={mentor.socials.x} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.931L18.901 1.153Zm-1.653 19.57h2.608L6.856 2.597H4.062l13.185 18.126Z"/></svg>
                            </a>
                            <a href={mentor.socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Linkedin className="h-5 w-5" /></a>
                        </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${i < mentor.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-muted-foreground text-sm">({mentor.rating}.0)</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {mentor.expertise.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {mentor.bio}
                        </p>
                        </CardContent>
                        <CardFooter>
                        <Button variant="outline" className="w-full" onClick={() => handleScheduleClick(mentor)}>
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Schedule Meeting
                        </Button>
                        </CardFooter>
                    </Card>
                    );
                })
                )}
                </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <MentorBookingModal 
        mentor={bookingMentor}
        onOpenChange={(isOpen) => !isOpen && setBookingMentor(null)}
        isLoggedIn={isLoggedIn}
        hasSubscription={hasSubscription}
        hasUsedFreeSession={hasUsedFreeSession}
        onBookingSuccess={onBookingSuccess}
      />
    </>
  );
}
