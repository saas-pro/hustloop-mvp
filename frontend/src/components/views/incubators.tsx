
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Lock, Terminal, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import IncubatorDetails from "./incubator-details";
import type { View } from "@/app/types";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { API_BASE_URL } from "@/lib/api";
import { set } from "date-fns";


export type Incubator = {
  id: string;
  name: string;
  image: string;
  hint: string;
  location: string;
  type: string[];
  contactEmail?: string;
  contactPhone?: string;
  rating: number;
  reviews: number;
  description: string;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  metrics: {
    startupsSupported: string;
    fundedStartupsPercent: string;
    startupsOutsideLocationPercent: string;
    totalFundingRaised: string;
  };
  partners?: string[];
  // Kept for backward compatibility but made optional
  details?: {
    overview?: string;
    services?: { title: string; description: string }[];
    benefits?: string[];
    eligibility?: {
      focusAreas?: string;
      requirements?: string[];
    };
    timeline?: {
      event?: string;
      period?: string;
    }[];
  };
  focus: string[];
  user_id?: string;
  is_owner?: boolean;
};

interface IncubatorsViewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  setActiveView: (view: View) => void;
}

const LoginPrompt = ({ setActiveView, contentType }: { setActiveView: (view: View) => void, contentType: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <Lock className="h-16 w-16 text-accent mb-6" />
    <h3 className="text-2xl font-bold mb-2">Access required</h3>
    <p className="max-w-md mx-auto text-muted-foreground mb-6">
      Please log in or sign up to view available {contentType}.
    </p>
    <div className="flex gap-4">
      <Button onClick={() => setActiveView('login')}>Login</Button>
      <Button onClick={() => setActiveView('signup')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        Sign Up
      </Button>
    </div>
  </div>
);


const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[...Array(6)].map((_, index) => (
      <Card key={index} className="flex flex-col bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardHeader className="p-0">
          <Skeleton className="w-full h-48" />
        </CardHeader>
        <CardContent className="flex-grow p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Separator className="my-4 bg-border/50" />
          <div className="grid grid-cols-3 text-center">
            <div>
              <Skeleton className="h-5 w-1/2 mx-auto" />
              <Skeleton className="h-3 w-3/4 mx-auto mt-1" />
            </div>
            <div>
              <Skeleton className="h-5 w-1/2 mx-auto" />
              <Skeleton className="h-3 w-3/4 mx-auto mt-1" />
            </div>
            <div>
              <Skeleton className="h-5 w-1/2 mx-auto" />
              <Skeleton className="h-3 w-3/4 mx-auto mt-1" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    ))}
  </div>
);


export default function IncubatorsView({ isOpen, onOpenChange, isLoggedIn, hasSubscription, setActiveView }: IncubatorsViewProps) {
  const [selectedIncubator, setSelectedIncubator] = useState<Incubator | null>(null);
  const { toast } = useToast();
  const [incubators, setIncubators] = useState<Incubator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowAccess, setAllowAccess] = useState(false);

  useEffect(() => {
    const fromMarketplace = localStorage.getItem("fromMarketplace");
    if (fromMarketplace === "true") {
      setAllowAccess(true);
      localStorage.removeItem("fromMarketplace");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const fetchIncubators = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE_URL}/api/incubators`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
          });
          if (!response.ok) {
            throw new Error('Failed to fetch incubators.');
          }
          const data = await response.json();

          setIncubators(data.items);
        } catch (err: any) {
          // Fallback static data
          setIncubators([
            {
              id: "fallback-1",
              name: "Fallback Incubator",
              image: "https://placehold.co/600x400",
              hint: "fallback",
              location: "Fallback City",
              rating: 5,
              reviews: 10,
              description: "This is a fallback incubator shown when the API is unavailable.",
              metrics: {
                startupsSupported: "20+",
                fundedStartupsPercent: "40%",
                startupsOutsideLocationPercent: "30%",
                totalFundingRaised: "$5M"
              },
              focus: ["Tech", "Innovation"],
              details: {
                overview: "Fallback overview.",
                services: [{ title: "Mentorship", description: "Expert guidance." }],
                benefits: ["Networking"],
                eligibility: { focusAreas: "All", requirements: ["None"] },
                timeline: [{ event: "Application", period: "Year-round" }],
              },
              type: ["Incubator"]
            },
          ]);
          setError(null); // Hide error, show fallback
        } finally {
          setIsLoading(false);
        }
      };
      fetchIncubators();
    }
  }, [isOpen]);

  const handleViewDetails = (incubator: Incubator) => {
    setSelectedIncubator(incubator);
  };

  return (
    <>
      <Dialog open={isOpen}>
        <DialogContent hideClose={true} className="sm:max-w-5xl h-[90vh] rounded-lg lg:w-full flex flex-col p-0">
          <DialogHeader className="p-6">
            <DialogTitle className="text-3xl font-bold text-center font-headline">Startup Incubation Hub</DialogTitle>
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
              <span className="text-accent">&quot;You Dream It. We Help Build It.&quot;</span>
              <br />
              Connect with leading incubators that provide the resources, mentorship, and ecosystem you need to transform your innovative ideas into successful ventures.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6">
            {!allowAccess && !isLoggedIn ? (
              <LoginPrompt setActiveView={setActiveView} contentType="incubators" />
            ) : isLoading ? (
              <LoadingSkeleton />
            ) : error ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Fetching Incubators</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {incubators.map((incubator, index) => {
                  return (
                    <Card key={index} className="cursor-pointer flex flex-col relative overflow-hidden bg-gradient-to-br from-card to-card/60 backdrop-blur-xl border-border/40 hover:border-primary/50 transition-all duration-500 group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(var(--primary-rgb),0.1)] h-full">
                      {/* Suble background dynamic glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0 pointer-events-none" />

                      <CardHeader className="p-0 relative h-28 bg-gradient-to-b from-primary/10 via-card to-card flex items-center justify-center border-b border-white/5 z-10 overflow-hidden">
                        {/* Decorative background circle */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-[40px] group-hover:bg-primary/30 transition-all duration-700" />
                        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-accent/20 rounded-full blur-[30px] group-hover:bg-accent/30 transition-all duration-700" />

                        <div className="absolute top-3 right-3 z-10">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-md border border-primary/20 text-primary shadow-sm uppercase tracking-widest text-[8px] font-bold py-0.5 px-2 group-hover:border-primary/40 transition-colors">
                            {incubator.type[0] || 'Incubator'}
                          </Badge>
                        </div>
                        <div className="relative w-16 h-16 transition-all duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-1 drop-shadow-xl z-10">
                          {incubator.image ? (
                            <Image
                              src={'/icons/corporate-incu.png'}
                              alt={incubator.name}
                              fill
                              className="object-contain filter saturate-150 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20 shadow-inner group-hover:border-primary/40 transition-all">
                              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent drop-shadow-sm">{incubator.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="flex-grow p-4 space-y-3.5 z-10">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-black font-headline transition-colors uppercase tracking-tight group-hover:text-primary drop-shadow-sm line-clamp-1">{incubator.name}</CardTitle>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
                            <MapPin className="h-3 w-3 text-primary/80" />
                            <span className="line-clamp-1">{incubator.location}</span>
                          </div>
                        </div>

                        <CardDescription className="text-xs line-clamp-2 text-muted-foreground/90 font-medium leading-relaxed">
                          {incubator.description}
                        </CardDescription>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {incubator.focus.map(area => (
                            <Badge key={area} variant="outline" className="text-[9px] py-0.5 px-2 rounded-md border-primary/20 bg-primary/5 text-primary/90 font-bold uppercase tracking-wider group-hover:bg-primary/10 hover:border-primary/40 transition-colors">
                              {area}
                            </Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 mt-2 pt-3 border-t border-border/40">
                          <div className="text-left bg-muted/40 rounded-lg p-2.5 border border-border/40 group-hover:border-primary/20 transition-colors duration-300">
                            <p className="text-[8px] text-muted-foreground/80 font-black uppercase tracking-widest mb-1">Supported</p>
                            <p className="text-base font-black font-headline text-foreground tracking-tight">{incubator.metrics.startupsSupported}</p>
                          </div>
                          <div className="text-left bg-muted/40 rounded-lg p-2.5 border border-border/40 group-hover:border-primary/20 transition-colors duration-300">
                            <p className="text-[8px] text-muted-foreground/80 font-black uppercase tracking-widest mb-1">Funded (%)</p>
                            <p className="text-base font-black font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight">{incubator.metrics.fundedStartupsPercent}</p>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0 z-10">
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-widest uppercase transition-all duration-500 shadow-[0_4px_12px_-4px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_12px_20px_-4px_rgba(var(--primary-rgb),0.6)] group-hover:-translate-y-0.5 h-10 rounded-lg border-none relative overflow-hidden"
                          onClick={() => handleViewDetails(incubator)}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-1.5">
                            Explore <span className="opacity-50 font-normal">|</span> {incubator.rating || 0} ★ <span className="opacity-50 font-normal">|</span> {incubator.reviews || 0}
                          </span>
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <IncubatorDetails
        incubator={selectedIncubator}
        onOpenChange={(isOpen) => !isOpen && setSelectedIncubator(null)}
        isLoggedIn={isLoggedIn}
        hasSubscription={hasSubscription}
      />
    </>
  );
}
